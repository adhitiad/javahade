from django.core.management.base import BaseCommand
# pyrefly: ignore [missing-import]
from apps.payments.models import VirtualGift
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds virtual gifts into the database'

    def handle(self, *args, **kwargs):
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

        self.stdout.write(self.style.SUCCESS("Virtual gifts seeded successfully!"))
