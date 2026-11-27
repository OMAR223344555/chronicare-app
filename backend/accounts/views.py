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
                {"detail": "Your doctor account is awaiting administrator approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.status == User.Status.DEACTIVATED:
            return Response(
                {"detail": "This account has been deactivated. Contact the administrator."},
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
    """Start a password reset. Always answers 200 so nobody can probe
    which emails have accounts. When no real email backend is configured
    (the class demo), the reset link is returned in the response so the
    frontend can show it on screen, clearly labelled as a demo fallback.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        data = {"detail": "If an account exists for this email, a reset link has been sent."}
        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            # One active token at a time: invalidate earlier ones.
            user.password_reset_tokens.filter(used_at__isnull=True).update(used_at=timezone.now())
            reset = PasswordResetToken.objects.create(user=user)
            link = f"{settings.PASSWORD_RESET_FRONTEND_URL}?token={reset.token}"
            log_action(user, "password_reset_request")
            if settings.EMAIL_IS_CONFIGURED:
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
            else:
                # Demo fallback: no email server, so hand the link back to the UI.
                data["demo_reset_link"] = link
                data["detail"] = (
                    "Demo mode: no email server is connected, so here is your reset link."
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
        user.set_password(password)
        user.save(update_fields=["password"])
        reset.used_at = timezone.now()
        reset.save(update_fields=["used_at"])
        # Force re-login with the new password on all devices.
        Token.objects.filter(user=user).delete()
        log_action(user, "password_reset_confirm")
        return Response({"detail": "Password updated. You can sign in with the new password."})
