from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "full_name", "role", "status",
            "specialty", "license_number", "date_joined",
        ]
        read_only_fields = ["id", "role", "status", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    """Self-registration for patients and doctors.

    Admins are never created through this endpoint. Doctors are created as
    PENDING; they cannot log in until an administrator approves them.
    """

    # Declared explicitly so the model's auto unique-validator does not fire
    # first; validate() below returns the clearer "registered as a <role>" error.
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=[User.Role.PATIENT, User.Role.DOCTOR])

    class Meta:
        model = User
        fields = ["email", "full_name", "password", "role", "specialty", "license_number"]

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        attrs["email"] = email
        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None:
            # One email belongs to exactly one account/role, whichever
            # sign-in path created it first.
            raise serializers.ValidationError(
                {"email": "This email is already registered as a " + existing.role +
                          ". Each role needs its own email address."}
            )
        if attrs["role"] == User.Role.DOCTOR:
            if not attrs.get("specialty") or not attrs.get("license_number"):
                raise serializers.ValidationError(
                    "Doctors must provide a specialty and a license number."
                )
        return attrs

    def create(self, validated_data):
        role = validated_data.pop("role")
        password = validated_data.pop("password")
        user = User(
            username=validated_data["email"],  # email doubles as the username
            role=role,
            status=User.Status.PENDING if role == User.Role.DOCTOR else User.Status.ACTIVE,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
