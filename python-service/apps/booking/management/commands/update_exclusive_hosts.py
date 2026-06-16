import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Avg, Count
from apps.accounts.models import CreatorProfile
from apps.booking.models import BookingRating

class Command(BaseCommand):
    help = 'Updates the top 5 Exclusive Hosts based on their average ratings from the previous month. Should be run every 3rd of the month.'

    def handle(self, *args, **options):
        now = timezone.now()
        
        if now.month == 1:
            prev_month = 12
            prev_year = now.year - 1
        else:
            prev_month = now.month - 1
            prev_year = now.year
            
        self.stdout.write(f"Calculating Top 5 Hosts based on bookings from {prev_month}/{prev_year}...")

        top_hosts = (
            BookingRating.objects.filter(
                booking__start_datetime__year=prev_year,
                booking__start_datetime__month=prev_month,
                user_rating_of_host__isnull=False
            )
            .values('booking__host')
            .annotate(
                avg_rating=Avg('user_rating_of_host'),
                booking_count=Count('id')
            )
            .order_by('-avg_rating', '-booking_count')[:5]
        )
        
        top_host_ids = [item['booking__host'] for item in top_hosts]
        
        updated_count = CreatorProfile.objects.filter(is_exclusive_host=True).update(is_exclusive_host=False)
        self.stdout.write(f"Reset {updated_count} previous exclusive hosts.")
        
        if top_host_ids:
            CreatorProfile.objects.filter(user_id__in=top_host_ids).update(is_exclusive_host=True)
            self.stdout.write(self.style.SUCCESS(f"Successfully updated {len(top_host_ids)} new exclusive hosts! IDs: {top_host_ids}"))
        else:
            self.stdout.write(self.style.WARNING("No ratings found for the previous month. No exclusive hosts set."))
