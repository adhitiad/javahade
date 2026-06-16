"""
Konfigurasi aplikasi Booking.
"""

from django.apps import AppConfig


class BookingConfig(AppConfig):
    """Konfigurasi untuk app booking ruangan."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.booking"
    verbose_name = "Booking Ruangan"
