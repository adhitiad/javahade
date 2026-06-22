"""
Model Booking — Room (ruangan) dan Booking (pemesanan).
Mencakup validasi anti double-booking dan constraint database.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Room(models.Model):
    """
    Model ruangan yang bisa di-booking.
    Contoh: Ruang Meeting A, Studio Rekaman B, dll.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nama Ruangan",
        help_text="Nama unik untuk ruangan ini",
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="Deskripsi",
        help_text="Deskripsi fasilitas dan detail ruangan",
    )
    capacity = models.PositiveIntegerField(
        default=1,
        verbose_name="Kapasitas",
        help_text="Jumlah maksimum orang yang bisa menggunakan ruangan",
    )
    location = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="Lokasi",
        help_text="Lokasi fisik ruangan (misal: Lantai 3, Gedung A)",
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Tarif per Jam (Rp)",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Aktif",
        help_text="Ruangan tersedia untuk di-booking",
    )
    image_url = models.URLField(
        blank=True,
        default="",
        verbose_name="URL Gambar",
        help_text="URL gambar ruangan (opsional)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "booking_rooms"
        ordering = ["name"]
        verbose_name = "Ruangan"
        verbose_name_plural = "Ruangan"

    def __str__(self):
        status = "✓" if self.is_active else "✗"
        return f"[{status}] {self.name} (Kapasitas: {self.capacity})"


class Booking(models.Model):
    """
    Model pemesanan ruangan.
    Setiap booking terkait dengan satu user dan satu ruangan.
    Validasi overlap dilakukan di level model untuk mencegah double booking.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Menunggu Konfirmasi"
        CONFIRMED = "confirmed", "Dikonfirmasi"
        CANCELLED = "cancelled", "Dibatalkan"
        COMPLETED = "completed", "Selesai"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name="Pengguna",
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name="Ruangan",
    )
    date = models.DateField(
        verbose_name="Tanggal",
        help_text="Tanggal booking",
    )
    start_time = models.TimeField(
        verbose_name="Jam Mulai",
        help_text="Waktu mulai penggunaan ruangan",
    )
    duration_hours = models.PositiveIntegerField(
        default=1,
        verbose_name="Durasi (Jam)",
        help_text="Lama penggunaan dalam jam (1-8)",
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.CONFIRMED,
        verbose_name="Status",
    )
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Catatan",
        help_text="Catatan tambahan untuk booking ini",
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Total Biaya (Rp)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "booking_room_reservations"
        ordering = ["-date", "-start_time"]
        verbose_name = "Booking"
        verbose_name_plural = "Booking"
        indexes = [
            models.Index(
                fields=["room", "date", "start_time"],
                name="idx_booking_room_date_time",
            ),
            models.Index(
                fields=["user", "-date"],
                name="idx_booking_user_date",
            ),
            models.Index(
                fields=["status"],
                name="idx_booking_status",
            ),
        ]

    def __str__(self):
        return (
            f"Booking {self.room.name} oleh {self.user.username} "
            f"pada {self.date} {self.start_time}"
        )

    @property
    def end_time(self):
        """Menghitung jam selesai berdasarkan start_time + durasi."""
        from datetime import datetime

        start_dt = datetime.combine(self.date, self.start_time)
        end_dt = start_dt + timedelta(hours=self.duration_hours)
        return end_dt.time()

    @property
    def is_past(self):
        """Cek apakah booking sudah lewat."""
        from datetime import datetime

        now = timezone.now()
        booking_end = datetime.combine(self.date, self.start_time) + timedelta(
            hours=self.duration_hours
        )
        booking_end = timezone.make_aware(booking_end)
        return now > booking_end


    def clean(self):
        """
        Validasi server-side:
        1. Tanggal tidak boleh di masa lalu
        2. Durasi antara 1-8 jam
        3. Jam mulai antara 07:00-22:00
        4. Tidak boleh overlap dengan booking lain di ruangan yang sama
        """
        errors = {}

        # Validasi tanggal tidak di masa lalu
        if self.date and self.date < timezone.now().date():
            errors["date"] = "Tanggal booking tidak boleh di masa lalu."

        # Validasi durasi
        if self.duration_hours and (self.duration_hours < 1 or self.duration_hours > 8):
            errors["duration_hours"] = "Durasi harus antara 1 sampai 8 jam."

        # Validasi jam operasional (07:00 - 22:00)
        if self.start_time:
            from datetime import time

            if self.start_time < time(7, 0) or self.start_time > time(22, 0):
                errors["start_time"] = "Jam mulai harus antara 07:00 dan 22:00."

        # Validasi overlap (anti double booking)
        if self.room_id and self.date and self.start_time and self.duration_hours:  # type: ignore
            self._validate_no_overlap(errors)

        if errors:
            raise ValidationError(errors)

    def _validate_no_overlap(self, errors):
        """Cek apakah ada booking lain yang overlap di ruangan dan waktu yang sama."""
        from datetime import datetime

        new_start = datetime.combine(self.date, self.start_time)
        new_end = new_start + timedelta(hours=self.duration_hours)

        # Ambil booking aktif di ruangan & tanggal yang sama
        overlapping = (
            Booking.objects.filter(
                room=self.room,
                date=self.date,
                status__in=[self.Status.PENDING, self.Status.CONFIRMED],
            )
            .exclude(pk=self.pk)  # Exclude diri sendiri saat update
        )

        for existing in overlapping:
            existing_start = datetime.combine(existing.date, existing.start_time)
            existing_end = existing_start + timedelta(hours=existing.duration_hours)

            # Cek overlap: new_start < existing_end AND new_end > existing_start
            if new_start < existing_end and new_end > existing_start:
                errors["start_time"] = (
                    f"Ruangan sudah di-booking pada waktu tersebut "
                    f"({existing.start_time.strftime('%H:%M')} - "
                    f"{existing.end_time.strftime('%H:%M')})."
                )
                return

    def save(self, *args, **kwargs):
        """Override save untuk menghitung biaya."""
        # Hitung total biaya
        if self.room and self.duration_hours:
            self.total_cost = self.room.hourly_rate * self.duration_hours

        super().save(*args, **kwargs)


class HostBookingRate(models.Model):
    """
    Daftar harga yang dipatok oleh Host/Creator untuk masing-masing durasi.
    """
    class DurationType(models.TextChoices):
        MIN_30 = "30m", "1/2 Jam"
        HOUR_1 = "1h", "1 Jam"
        HOUR_3 = "3h", "3 Jam"
        HOUR_6 = "6h", "6 Jam"
        HOUR_12 = "12h", "12 Jam"
        DAY_1 = "24h", "24 Jam"
        DAY_3 = "3d", "3 Hari"
        DAY_7 = "7d", "7 Hari"
        DAY_14 = "14d", "14 Hari"
        DAY_24 = "24d", "24 Hari"
        DAY_30 = "30d", "30 Hari"
        MONTH_3 = "3m", "3 Bulan"

    class CurrencyChoices(models.TextChoices):
        IDR = "IDR", "Indonesian Rupiah (IDR)"
        SGD = "SGD", "Singapore Dollar (SGD)"
        USD = "USD", "US Dollar (USD)"
        MYR = "MYR", "Malaysian Ringgit (MYR)"
        CNY = "CNY", "Chinese Yuan (CNY)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name="booking_rates",
        limit_choices_to={'role': 'host'},
        verbose_name="Host"
    )
    duration_type = models.CharField(
        max_length=10, 
        choices=DurationType.choices,
        verbose_name="Tipe Durasi"
    )
    price = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        verbose_name="Tarif"
    )
    currency = models.CharField(
        max_length=3,
        choices=CurrencyChoices.choices,
        default=CurrencyChoices.IDR,
        verbose_name="Mata Uang"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Aktif (Tersedia)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "booking_host_rates"
        ordering = ["price"]
        unique_together = ["host", "duration_type"]
        verbose_name = "Host Rate"
        verbose_name_plural = "Host Rates"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.host.username} - {self.get_duration_type_display()} ({self.currency} {self.price:,.2f})"  # type: ignore


class HostBooking(models.Model):
    """
    Transaksi booking (sewa) untuk seorang Host.
    """
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Menunggu Verifikasi Kripto"
        PENDING = "pending", "Menunggu Konfirmasi"
        CONFIRMED = "confirmed", "Dikonfirmasi Host"
        CANCELLED = "cancelled", "Dibatalkan"
        COMPLETED = "completed", "Selesai"
        DISPUTED = "disputed", "Sengketa"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="host_bookings_made",
        verbose_name="Klien/User",
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="host_bookings_received",
        limit_choices_to={'role': 'host'},
        verbose_name="Host yang Dibooking",
    )
    rate = models.ForeignKey(
        HostBookingRate,
        on_delete=models.PROTECT,
        verbose_name="Paket Tarif yang Dipilih"
    )
    start_datetime = models.DateTimeField(
        verbose_name="Waktu Mulai"
    )
    end_datetime = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Waktu Selesai"
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Status",
    )
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Catatan/Instruksi Klien",
    )
    meeting_location = models.TextField(
        blank=True,
        default="",
        verbose_name="Lokasi Pertemuan (Offline)",
    )
    location_shared_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Waktu Lokasi Dibagikan"
    )
    meeting_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Latitude"
    )
    meeting_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Longitude"
    )
    is_no_show_cancelled = models.BooleanField(
        default=False, verbose_name="Dibatalkan karena No-Show"
    )
    reschedule_count = models.PositiveIntegerField(
        default=0, verbose_name="Jumlah Reschedule"
    )
    
    # Financials
    currency = models.CharField(
        max_length=3,
        default="IDR",
        verbose_name="Mata Uang"
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Total Tagihan Klien",
    )
    app_tax_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Pajak Aplikasi (12%)"
    )
    service_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Biaya Layanan (2%)"
    )
    admin_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Biaya Admin (1%)"
    )
    validation_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Biaya Keabsahan (5%)"
    )
    other_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Biaya Lain-lain (2.7%)"
    )
    net_payout = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Net Payout Host (77.3%)"
    )
    
    idempotency_key = models.CharField(
        max_length=255, blank=True, null=True, unique=True,
        verbose_name="Idempotency Key", help_text="Mencegah double booking"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "booking_host_reservations"
        ordering = ["-start_datetime"]
        verbose_name = "Host Booking"
        verbose_name_plural = "Host Bookings"
        indexes = [
            models.Index(
                fields=["host", "start_datetime", "end_datetime"],
                name="idx_host_booking_overlap",
            ),
        ]

    def __str__(self):
        return f"Host Booking: {self.user.username} menyewa {self.host.username} ({self.rate.get_duration_type_display()})"  # type: ignore

    @property
    def is_elite_client(self):
        """Cek apakah klien (user) adalah Elite Fan (Subscribe aktif) dari Host ini."""
        # pyrefly: ignore [missing-import]
        from apps.subscriptions.models import Subscription
        if hasattr(self, 'host'):
            return Subscription.objects.filter(
                subscriber=self.user,
                tier__creator=self.host,
                status='active'
            ).exists()
        return False

    def clean(self):
        from django.core.exceptions import ValidationError
        from datetime import timedelta
        
        errors = {}
        
        if self.rate and self.start_datetime:
            duration_map = {
                "30m": timedelta(minutes=30), "1h": timedelta(hours=1), "3h": timedelta(hours=3),
                "6h": timedelta(hours=6), "12h": timedelta(hours=12), "24h": timedelta(hours=24),
                "3d": timedelta(days=3), "7d": timedelta(days=7), "14d": timedelta(days=14),
                "24d": timedelta(days=24), "30d": timedelta(days=30), "3m": timedelta(days=90),
            }
            dur = duration_map.get(self.rate.duration_type, timedelta(hours=1))
            self.end_datetime = self.start_datetime + dur
            
        if hasattr(self, 'host_id') and self.host_id and self.start_datetime and self.end_datetime:
            overlapping = HostBooking.objects.filter(
                host_id=self.host_id,
                status__in=[self.Status.PENDING, self.Status.CONFIRMED]
            ).exclude(pk=self.pk)
            
            for existing in overlapping:
                if existing.end_datetime and existing.start_datetime:
                    if self.start_datetime < existing.end_datetime and self.end_datetime > existing.start_datetime:
                        errors["start_datetime"] = "Jadwal ini tumpang tindih dengan pesanan lain."
                        break
                        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        from decimal import Decimal
        from datetime import timedelta
        
        if self.rate:
            self.currency = self.rate.currency
            if not self.pk or self.total_cost is None:
                self.total_cost = self.rate.price

            # Hitung end_datetime
            if self.start_datetime:
                duration_map = {
                    "30m": timedelta(minutes=30),
                    "1h": timedelta(hours=1),
                    "3h": timedelta(hours=3),
                    "6h": timedelta(hours=6),
                    "12h": timedelta(hours=12),
                    "24h": timedelta(hours=24),
                    "3d": timedelta(days=3),
                    "7d": timedelta(days=7),
                    "14d": timedelta(days=14),
                    "24d": timedelta(days=24),
                    "30d": timedelta(days=30),
                    "3m": timedelta(days=90),
                }
                dur = duration_map.get(self.rate.duration_type, timedelta(hours=1))
                self.end_datetime = self.start_datetime + dur
                
        if self.total_cost:
            from decimal import ROUND_HALF_UP
            base_val = Decimal(str(self.total_cost)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            if self.is_no_show_cancelled:
                # 25% User, 65% Host, 10% Admin
                self.app_tax_fee = Decimal("0.00")
                self.service_fee = Decimal("0.00")
                self.validation_fee = Decimal("0.00")
                self.other_fee = Decimal("0.00")
                
                # Admin get 10%
                self.admin_fee = base_val * Decimal("0.10")
                # Host gets 65%
                self.net_payout = base_val * Decimal("0.65")
            else:
                self.app_tax_fee = base_val * Decimal("0.12")
                self.service_fee = base_val * Decimal("0.02")
                self.admin_fee = base_val * Decimal("0.01")
                self.other_fee = base_val * Decimal("0.027")
                
                if self.status in [self.Status.CONFIRMED, self.Status.COMPLETED]:
                    try:
                        commission_rate = self.host.creator_profile.platform_commission_rate / Decimal("100.0")
                    except:
                        commission_rate = Decimal("0.227") # Default 22.7%
                        
                    # Validation fee absorbs the difference so total fees = commission_rate
                    fixed_fees = self.app_tax_fee + self.service_fee + self.admin_fee + self.other_fee
                    self.validation_fee = (base_val * commission_rate) - fixed_fees
                    if self.validation_fee < 0: self.validation_fee = Decimal("0.00")
                else:
                    self.validation_fee = Decimal("0.00")
                    
                total_fees = (
                    self.app_tax_fee + self.service_fee + 
                    self.admin_fee + self.validation_fee + self.other_fee
                )
                self.net_payout = (base_val - total_fees).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Pastikan semua field decimal juga dibulatkan
            self.app_tax_fee = self.app_tax_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            self.service_fee = self.service_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            self.admin_fee = self.admin_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            self.validation_fee = self.validation_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            self.other_fee = self.other_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
        super().save(*args, **kwargs)

class BookingRating(models.Model):
    """
    Sistem Mutual Rating Anonim antara Host dan Klien.
    Tidak ada teks review untuk menjaga privasi absolut.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        HostBooking,
        on_delete=models.CASCADE,
        related_name="rating",
        verbose_name="Booking"
    )
    user_rating_of_host = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="Rating Klien untuk Host (1-5)"
    )
    host_rating_of_user = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="Rating Host untuk Klien (1-5)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "booking_ratings"
        verbose_name = "Booking Rating"
        verbose_name_plural = "Booking Ratings"

    def __str__(self):
        return f"Rating untuk {self.booking.id}"

class HostBookingDispute(models.Model):
    """
    Sengketa untuk pesanan (Dispute). Terjadi jika Klien mengeluh tentang layanan
    Host atau Host mengeluh tentang perilaku Klien.
    Selama sengketa, status HostBooking menjadi DISPUTED dan Escrow dibekukan.
    """
    class Status(models.TextChoices):
        OPEN = "open", "Menunggu Keputusan Admin"
        RESOLVED_HOST = "resolved_host", "Dimenangkan Host (Dana diteruskan)"
        RESOLVED_CLIENT = "resolved_client", "Dimenangkan Klien (Dana di-Refund)"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        HostBooking,
        on_delete=models.CASCADE,
        related_name="dispute"
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Pelapor"
    )
    reason = models.TextField(verbose_name="Alasan Sengketa")
    evidence_url = models.URLField(blank=True, default="", verbose_name="Bukti (Opsional)")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        verbose_name="Status"
    )
    admin_notes = models.TextField(blank=True, default="", verbose_name="Catatan Admin")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "booking_host_disputes"
        ordering = ["-created_at"]
        verbose_name = "Dispute"
        verbose_name_plural = "Disputes"

    def __str__(self):
        return f"Dispute on Booking {self.booking.id} by {self.raised_by.username}"
