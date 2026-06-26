import logging
from django.http import JsonResponse
from django.db import connections
from django.db.utils import OperationalError
import redis
from django.conf import settings

logger = logging.getLogger(__name__)

def health_check(request):
    health_status = {
        "status": "ok",
        "database": "ok",
        "redis": "ok"
    }

    # Check Database
    db_conn = connections['default']
    try:
        db_conn.cursor()
    except OperationalError as e:
        logger.error(f"Database health check failed: {str(e)}")
        health_status["database"] = "error"
        health_status["status"] = "error"
    
    # Check Redis (PubSub/Celery backend)
    try:
        redis_client = redis.from_url(settings.REDIS_PUBSUB_URL)
        redis_client.ping()
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        health_status["redis"] = "error"
        health_status["status"] = "error"

    status_code = 200 if health_status["status"] == "ok" else 503
    return JsonResponse(health_status, status=status_code)
