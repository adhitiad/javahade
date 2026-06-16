"""Notification Celery tasks."""

import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task
def send_notification_email(user_email, subject, message):
    """Send email notification asynchronously."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            fail_silently=False,
        )
        logger.info("Email sent to %s: %s", user_email, subject)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", user_email, e)


@shared_task
def create_notification(user_id, notification_type, title, body="", data=None):
    """Create a notification record and push to Redis for real-time delivery."""
    from .models import Notification
    from common.redis_pubsub import publish_event

    notification = Notification.objects.create(
        user_id=user_id,
        type=notification_type,
        title=title,
        body=body,
        data=data or {},
    )

    # Push to Go chat service via Redis for real-time delivery
    publish_event(
        channel=f"notification:{user_id}",
        event_type="notification",
        data={
            "id": str(notification.id),
            "type": notification_type,
            "title": title,
            "body": body,
        },
    )

    return str(notification.id)
