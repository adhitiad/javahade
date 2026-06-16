import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.payments.models import VirtualGift
from decimal import Decimal

gifts = [
    {"name": "Mawar", "icon": "🌹", "price_idr": Decimal("10000.00")},
    {"name": "Kopi", "icon": "☕", "price_idr": Decimal("25000.00")},
    {"name": "Mahkota", "icon": "👑", "price_idr": Decimal("50000.00")},
    {"name": "Mobil Sport", "icon": "🏎️", "price_idr": Decimal("250000.00")},
    {"name": "Jet Pribadi", "icon": "✈️", "price_idr": Decimal("1000000.00")},
]

for g in gifts:
    VirtualGift.objects.get_or_create(
        name=g["name"],
        defaults={"icon": g["icon"], "price_idr": g["price_idr"], "is_active": True}
    )

print("Virtual gifts seeded successfully!")
