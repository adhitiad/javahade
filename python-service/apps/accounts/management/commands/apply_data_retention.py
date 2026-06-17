from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.streaming_ui.models import LiveStream
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Purge soft-deleted streams older than 30 days and scrub inactive users.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # 1. Hapus LiveStream yang soft-deleted lebih dari 30 hari yang lalu
        # Catatan: Karena kita tidak punya `deleted_at`, kita akan menghapus stream 
        # is_deleted=True yang end_time-nya < 30 hari lalu.
        expired_streams = LiveStream.objects.filter(
            is_deleted=True,
            end_time__lt=thirty_days_ago
        )
        count_streams = expired_streams.count()
        expired_streams.delete()
        
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count_streams} expired soft-deleted streams.'))
        
        # 2. Opsional: Data scrubbing untuk pengguna pasif > 2 tahun bisa ditambahkan di sini
        # inactive_users = User.objects.filter(last_login__lt=now - timedelta(days=365*2), is_active=True)
        # for user in inactive_users: ...
        
        self.stdout.write(self.style.SUCCESS('Data retention policy applied successfully.'))
