"""
Accounts signals.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """Log user creation events."""
    if created:
        logger.info("New user registered: %s (%s)", instance.username, instance.email)
