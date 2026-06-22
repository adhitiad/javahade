from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.utils.translation import gettext_lazy as _

class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.COOKIES.get("access_token")
        else:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        
        # Check device fingerprint
        token_fp = validated_token.get('device_fingerprint')
        if token_fp:
            import hashlib
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            ip = request.META.get('REMOTE_ADDR', '')
            raw_fp = f"{user.id}-{user_agent}-{ip}"
            current_fp = hashlib.sha256(raw_fp.encode()).hexdigest()
            
            if token_fp != current_fp:
                raise AuthenticationFailed(_('Session hijacked or invalid device.'), code='device_fingerprint_mismatch')

        return user, validated_token

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        
        # Check jwt_secret_version to enforce logout from all devices
        token_version = validated_token.get('jwt_secret_version')
        if token_version is None or token_version != user.jwt_secret_version:
            raise AuthenticationFailed(_('Token is invalid or expired. Please login again.'), code='user_logged_out')
            
        return user
