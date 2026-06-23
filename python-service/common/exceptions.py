import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add the HTTP status code to the response.
    if response is not None:
        if isinstance(response.data, dict):
            response.data['status_code'] = response.status_code
        logger.warning(f"DRF Error {response.status_code}: {response.data}")
    else:
        # Unexpected errors (500)
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        return Response({
            "detail": "Terjadi kesalahan internal pada server.",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
