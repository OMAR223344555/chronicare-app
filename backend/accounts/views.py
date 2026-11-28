import json
import urllib.parse
import urllib.request

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from auditlog.services import log_action

from .models import PasswordResetToken, User
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(user, "register", details=f"New {user.role} account")
        data = UserSerializer(user).data
        if user.status == User.Status.PENDING:
            data["detail"] = (
                "Doctor account created. It is pending administrator approval; "
                "you will be able to log in once approved."
            )
            return Response(data, status=status.HTTP_201_CREATED)
        token, _ = Token.objects.get_or_create(user=user)
        data["token"] = token.key
        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if user.status == User.Status.PENDING:
            return Response(
                {"detail": "Your doctor account is awaiting administrator approval.",
                 "code": "account_pending"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.status == User.Status.DEACTIVATED:
            return Response(
                {"detail": "This account has been deactivated. Contact the administrator.",
                 "code": "account_deactivated"},
                status=status.HTTP_403_FORBIDDEN,
            )
        token, _ = Token.objects.get_or_create(user=user)
        log_action(user, "login")
        return Response({"token": token.key, "user": UserSerializer(user).data})


class GoogleLoginView(APIView):
    """Sign in (or create a patient account) with a Google ID token.

    The frontend's "Continue with Google" button sends the credential JWT
    Google issued; we verify it with Google and match it to a user by email.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        credential = (request.data.get("credential") or "").strip()
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        if not client_id:
            return Response(
                {"detail": "Google sign-in is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not credential:
            return Response({"detail": "Missing Google credential."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + urllib.parse.quote(credential)
            with urllib.request.urlopen(url, timeout=8) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except Exception:
            return Response(
                {"detail": "Google rejected the sign-in token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if payload.get("aud") != client_id:
            return Response(
                {"detail": "Google token was not issued for this app."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        email = (payload.get("email") or "").strip().lower()
        if not email or payload.get("email_verified") not in (True, "true", "True"):
            return Response(
                {"detail": "The Google account has no verified email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        full_name = (payload.get("name") or email.split("@")[0]).strip()
        requested_role = (request.data.get("role") or "patient").strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            if requested_role == User.Role.DOCTOR:
                # Doctors always need admin approval, however they register:
                # create the account pending and hand out no token.
                user = User(
                    username=email,
                    email=email,
                    full_name=full_name,
                    role=User.Role.DOCTOR,
                    status=User.Status.PENDING,
                )
                user.set_unusable_password()
                user.save()
                log_action(user, "register", details="New doctor account via Google")
                return Response(
                    {"detail": "Doctor account created. It is pending administrator approval; "
                               "you can sign in once approved.",
                     "code": "account_pending"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if requested_role == User.Role.ADMIN:
                return Response(
                    {"detail": "No account is registered for this Google email.",
                     "code": "no_account"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            user = User(
                username=email,
                email=email,
                full_name=full_name,
                role=User.Role.PATIENT,
                status=User.Status.ACTIVE,
            )
            user.set_unusable_password()
            user.save()
        elif requested_role in (User.Role.PATIENT, User.Role.DOCTOR, User.Role.ADMIN) and user.role != requested_role:
            return Response(
                {"detail": "This Google email is registered as a " + user.role +
                           ". Pick the matching role and try again.",
                 "code": "role_mismatch"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.status == User.Status.PENDING:
            return Response(
                {"detail": "Your doctor account is awaiting administrator approval.",
                 "code": "account_pending"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.status == User.Status.DEACTIVATED:
            return Response(
                {"detail": "This account has been deactivated. Contact the administrator.",
                 "code": "account_deactivated"},
                status=status.HTTP_403_FORBIDDEN,
            )
        token, _ = Token.objects.get_or_create(user=user)
        log_action(user, "login")
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class PasswordResetRequestView(APIView):
    """Start a password reset. Always answers 200 with the same neutral
    message so nobody can probe which emails have accounts. The reset link
    only ever travels by email: it is never returned in the API response,
    so someone who knows an email address cannot take over the account.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.EMAIL_IS_CONFIGURED:
            # No mail backend wired yet: be honest instead of claiming a link
            # was emailed. The same answer goes out for every address, known
            # or not, so it still reveals nothing about which emails exist.
            return Response({
                "detail": "Password reset by email is not available yet. Please ask the clinic administrator to reset your password.",
                "email_configured": False,
            })
        data = {"detail": "If an account exists for this email, a reset link has been sent."}
        user = User.objects.filter(email__iexact=email).first()
        # Admins and the shared demo logins never get a reset: same neutral
        # answer as an unknown email, no token, no link, nothing to probe.
        if user is not None and user.is_reset_protected:
            log_action(user, "password_reset_blocked")
            user = None
        # Without a real email backend the link would have nowhere safe to
        # go, so no token is created at all; an admin resets the password
        # through the Django admin instead.
        if user is not None and settings.EMAIL_IS_CONFIGURED:
            # One active token at a time: invalidate earlier ones.
            user.password_reset_tokens.filter(used_at__isnull=True).update(used_at=timezone.now())
            reset = PasswordResetToken.objects.create(user=user)
            link = f"{settings.PASSWORD_RESET_FRONTEND_URL}?token={reset.token}"
            log_action(user, "password_reset_request")
            send_mail(
                subject="Chronicare password reset",
                message=(
                    f"Hi {user.full_name or user.email},\n\n"
                    f"Use this link to choose a new password (valid for "
                    f"{PasswordResetToken.EXPIRY_MINUTES} minutes):\n\n{link}\n\n"
                    "If you did not ask for this, ignore this email."
                ),
                from_email=None,
                recipient_list=[user.email],
                fail_silently=True,
            )
        return Response(data)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_value = str(request.data.get("token", "")).strip()
        password = str(request.data.get("password", ""))
        if not token_value or not password:
            return Response({"detail": "Token and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
        reset = PasswordResetToken.objects.filter(token=token_value).select_related("user").first()
        if reset is None or not reset.is_usable:
            return Response({"detail": "This reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)
        user = reset.user
        if user.is_reset_protected:
            reset.used_at = timezone.now()
            reset.save(update_fields=["used_at"])
            return Response({"detail": "This reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        reset.used_at = timezone.now()
        reset.save(update_fields=["used_at"])
        # Force re-login with the new password on all devices.
        Token.objects.filter(user=user).delete()
        log_action(user, "password_reset_confirm")
        return Response({"detail": "Password updated. You can sign in with the new password."})
