"""
Redis publish helper for notifying Go services.
"""

import json
import logging

import redis
from django.conf import settings

logger = logging.getLogger(__name__)

_redis_client = None


def get_redis_client():
    """Get or create a singleton Redis client for PubSub."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_PUBSUB_URL, decode_responses=True
        )
    return _redis_client


def publish_event(channel: str, event_type: str, data: dict):
    """
    Publish an event to Redis PubSub for Go services to consume.

    Args:
        channel: Redis channel name (e.g., "notification:user_123")
        event_type: Event type string (e.g., "new_subscription", "new_message")
        data: Event payload dictionary
    """
    try:
        client = get_redis_client()
        payload = json.dumps(
            {
                "type": event_type,
                "data": data,
            }
        )
        client.publish(channel, payload)
        logger.debug("Published event '%s' to channel '%s'", event_type, channel)
    except Exception as e:
        logger.error("Failed to publish event to Redis: %s", e)
