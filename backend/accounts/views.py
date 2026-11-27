from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from auditlog.services import log_action

from .models import User
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
