import uuid
from django.db import models
from django.conf import settings
from apps.family.models import FamilyGroup

class LiveStream(models.Model):
    """Model untuk Live Streaming."""
    
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        LIVE = "live", "Live"
        ENDED = "ended", "Ended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="hosted_streams"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    cover_image = models.ImageField(upload_to="streams/covers/", blank=True, null=True)
    
    # Scheduling & Pricing
    scheduled_time = models.DateTimeField()
    ticket_price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Family exclusivity
    is_family_only = models.BooleanField(default=False)
    family_group = models.ForeignKey(
        FamilyGroup, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="exclusive_streams"
    )
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    stream_key = models.CharField(max_length=100, unique=True, blank=True)
    
    # Analytics
    viewers_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "live_streams"
        ordering = ["-scheduled_time"]

    def save(self, *args, **kwargs):
        if not self.stream_key:
            import secrets
            self.stream_key = f"live_{secrets.token_hex(16)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} by {self.host.username}"

class StreamTicket(models.Model):
    """Tiket untuk menonton stream (jika berbayar)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stream = models.ForeignKey(LiveStream, on_delete=models.CASCADE, related_name="tickets")
    purchased_at = models.DateTimeField(auto_now_add=True)
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "stream_tickets"
        unique_together = ["user", "stream"]

    def __str__(self):
        return f"Ticket: {self.user.username} for {self.stream.title}"
