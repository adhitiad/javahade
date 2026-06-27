from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import pyotp

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_2fa(request):
    """
    Generate a new TOTP secret for the user and return the otpauth URI.
    """
    user = request.user
    if getattr(user, 'is_2fa_enabled', False):
        return Response({"detail": "2FA is already enabled."}, status=status.HTTP_400_BAD_REQUEST)

    # Generate a new secret if the user doesn't have one
    if not user.totp_secret:
        user.totp_secret = pyotp.random_base32()
        user.save(update_fields=['totp_secret'])

    totp = pyotp.TOTP(user.totp_secret)
    # The issuer name should be something recognizable, like the app name "Javahade"
    provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="Javahade")

    return Response({
        "secret": user.totp_secret,
        "otpauth_url": provisioning_uri
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_2fa(request):
    """
    Verify the code from the user to enable 2FA.
    """
    user = request.user
    if getattr(user, 'is_2fa_enabled', False):
        return Response({"detail": "2FA is already enabled."}, status=status.HTTP_400_BAD_REQUEST)

    code = request.data.get("code") if isinstance(request.data, dict) else None
    if not code:
        return Response({"detail": "Code is required."}, status=status.HTTP_400_BAD_REQUEST)

    if not user.totp_secret:
        return Response({"detail": "2FA setup not initiated."}, status=status.HTTP_400_BAD_REQUEST)

    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(code):
        user.is_2fa_enabled = True
        user.save(update_fields=['is_2fa_enabled'])
        return Response({"detail": "2FA successfully enabled."})
    else:
        return Response({"detail": "Invalid 2FA code."}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """
    Verify password and code to disable 2FA.
    """
    user = request.user
    if not getattr(user, 'is_2fa_enabled', False):
        return Response({"detail": "2FA is not enabled."}, status=status.HTTP_400_BAD_REQUEST)

    if not isinstance(request.data, dict):
        return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)

    password = request.data.get("password")
    code = request.data.get("code")

    if not password or not code:
        return Response({"detail": "Password and code are required."}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(password):
        return Response({"detail": "Invalid password."}, status=status.HTTP_400_BAD_REQUEST)

    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(code):
        user.is_2fa_enabled = False
        user.totp_secret = None
        user.save(update_fields=['is_2fa_enabled', 'totp_secret'])
        return Response({"detail": "2FA successfully disabled."})
    else:
        return Response({"detail": "Invalid 2FA code."}, status=status.HTTP_400_BAD_REQUEST)
