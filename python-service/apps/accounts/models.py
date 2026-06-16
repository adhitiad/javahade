"""
Accounts models — User, CreatorProfile, KYCDocument.
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model.
    Uses email as the primary login identifier alongside username.
    """

    class Role(models.TextChoices):
        USER = "user", "User"
        HOST = "host", "Host"
        ADMIN = "admin", "Admin"
        SUPERADMIN = "superadmin", "Super Admin"

    class Gender(models.TextChoices):
        MALE = "M", "Laki-laki"
        FEMALE = "F", "Perempuan"   
        UNSPECIFIED = "U", "Tidak Dispesifikasikan"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True, default="")
    gender = models.CharField(max_length=1, choices=Gender.choices, default=Gender.UNSPECIFIED)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    is_verified = models.BooleanField(default=False)
    date_of_birth = models.DateField(blank=True, null=True)
    
    # Multi-currency Wallet Balances untuk semua User
    balance_usd = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="Saldo USD")
    balance_sgd = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="Saldo SGD")
    balance_idr = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="Saldo IDR")
    balance_myr = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="Saldo MYR")
    balance_cny = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="Saldo CNY")
    
    # Monetisasi
    is_elite_fan = models.BooleanField(default=False, verbose_name="Langganan Klien Elite")
    
    # Sanksi Host Booking
    fake_location_strikes = models.IntegerField(default=0, verbose_name="Strikes Lokasi Palsu")
    booking_banned_until = models.DateTimeField(null=True, blank=True, verbose_name="Di-banned dari Booking Sampai")
    
    # Keamanan / Recovery
    recovery_codes = models.JSONField(default=list, blank=True, help_text="12 Angka pemulihan akun (1-99)")
    
    updated_at = models.DateTimeField(auto_now=True)

    # Override to make email required
    REQUIRED_FIELDS = ["email"]

    class Meta:  # type: ignore
        db_table = "users"
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_creator(self):
        return self.role == self.Role.HOST

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN
        
    def get_avg_rating_as_host(self):
        # pyrefly: ignore [missing-import]
        from apps.booking.models import BookingRating
        ratings = BookingRating.objects.filter(booking__host=self, user_rating_of_host__isnull=False)
        if ratings.exists():
            from django.db.models import Avg
            return round(ratings.aggregate(Avg('user_rating_of_host'))['user_rating_of_host__avg'], 1)
        return 0.0

    def get_avg_rating_as_user(self):
        # pyrefly: ignore [missing-import]
        from apps.booking.models import BookingRating
        ratings = BookingRating.objects.filter(booking__user=self, host_rating_of_user__isnull=False)
        if ratings.exists():
            from django.db.models import Avg
            return round(ratings.aggregate(Avg('host_rating_of_user'))['host_rating_of_user__avg'], 1)
        return 0.0


class CreatorProfile(models.Model):
    """
    Extended profile for creators.
    Created when a user applies and is approved as a creator.
    """

    class Category(models.TextChoices):
        ENTERTAINMENT = "entertainment", "Entertainment"
        EDUCATION = "education", "Education"
        MUSIC = "music", "Music"
        ART = "art", "Art"
        FITNESS = "fitness", "Fitness"
        COOKING = "cooking", "Cooking"
        GAMING = "gaming", "Gaming"
        LIFESTYLE = "lifestyle", "Lifestyle"
        TECHNOLOGY = "technology", "Technology"
        LESBIAN = "lesbian", "Lesbian"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="creator_profile"
    )
    display_name = models.CharField(max_length=100)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    cover_image = models.ImageField(
        upload_to="covers/%Y/%m/", blank=True, null=True
    )
    subscription_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        help_text="Default monthly subscription price in USD"
    )
    # Legacy balance fields
    earnings_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00
    )
    total_earnings = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00
    )
    
    # Monetisasi: Algorithmic Commission Boost
    platform_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=20.00,
        help_text="Komisi potongan platform untuk Host ini (Minimum 20%)."
    )
    
    # Eksklusivitas Host Booking
    is_exclusive_host = models.BooleanField(
        default=False,
        help_text="Host eksklusif yang dibatasi 8 booking/bulan dengan harga premium ($704-$1000)"
    )

    
    subscriber_count = models.PositiveIntegerField(default=0)
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(blank=True, null=True)
    website = models.URLField(blank=True, default="")
    social_links = models.JSONField(default=dict, blank=True)
    subscription_rules = models.TextField(blank=True, default="", help_text="Syarat dan ketentuan berlangganan kustom oleh Host.")
    seo_tags = models.CharField(max_length=255, blank=True, default="", help_text="Kata kunci SEO (pisahkan dengan koma, misal: gamer, cosplay, jakarta)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "creator_profiles"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.display_name} (@{self.user.username})"


class CreatorPhoto(models.Model):
    """
    Kumpulan foto bebas (portfolio) milik kreator untuk ditampilkan di profil publik
    sebagai bukti keabsahan visual.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        CreatorProfile, on_delete=models.CASCADE, related_name="portfolio_photos"
    )
    image = models.ImageField(upload_to="portfolios/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "creator_photos"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Photo of {self.profile.display_name} - {self.id}"


class KYCDocument(models.Model):
    """Identity verification documents for creators."""

    class DocumentType(models.TextChoices):
        ID_CARD = "id_card", "ID Card"
        PASSPORT = "passport", "Passport"
        DRIVERS_LICENSE = "drivers_license", "Driver's License"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="kyc_documents"
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    
    # Detail Identitas
    full_name = models.CharField(max_length=255, blank=True, default="", help_text="Nama Lengkap Sesuai ID")
    birth_date = models.DateField(null=True, blank=True, help_text="Tanggal Lahir")
    document_number = models.CharField(max_length=100, blank=True, default="", help_text="Nomor NIK KTP / Passport")
    
    # Berkas Pendukung
    document_file = models.FileField(upload_to="kyc/%Y/%m/", help_text="Foto KTP/Passport")
    selfie_file = models.FileField(upload_to="kyc_selfies/%Y/%m/", null=True, blank=True, help_text="Foto Wajah Terbaru (Maks 4 Bulan)")
    
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    reviewer_notes = models.TextField(blank=True, default="")
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "kyc_documents"
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"KYC {self.document_type} - {self.user.username} ({self.status})"

class HostBadge(models.Model):
    """Lencana Penghargaan untuk Host (Diatur Admin)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, help_text="Contoh: Host Pendatang Baru Terbaik, 1M Views")
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=255, default="🏆", help_text="Emoji atau URL Ikon Lencana")
    bonus_idr = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, help_text="Bonus uang (IDR) saat lencana diberikan")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "host_badges"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.icon} {self.name} (Bonus: Rp {self.bonus_idr})"

class HostAchievement(models.Model):
    """Pencatatan saat Host menerima Lencana tertentu."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name="achievements", limit_choices_to={"role": "host"})
    badge = models.ForeignKey(HostBadge, on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(auto_now_add=True)
    bonus_paid = models.BooleanField(default=False, help_text="Apakah bonus IDR sudah dicairkan ke Wallet Host?")

    class Meta:
        db_table = "host_achievements"
        unique_together = ("host", "badge")
        ordering = ["-awarded_at"]

    def __str__(self):
        return f"{self.host.username} achieved {self.badge.name}"
