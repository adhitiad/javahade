"""
Admin Booking — Konfigurasi Django Admin untuk Room dan Booking.
Ditingkatkan dengan filter, search, inline actions, dan list display.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import Booking, Room


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    """Admin untuk manajemen ruangan."""

    list_display = [
        "name",
        "capacity",
        "location",
        "hourly_rate_display",
        "is_active",
        "booking_count",
        "created_at",
    ]
    list_filter = ["is_active", "capacity"]
    search_fields = ["name", "description", "location"]
    list_editable = ["is_active"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = (
        (
            "Informasi Ruangan",
            {
                "fields": ("name", "description", "location", "image_url"),
            },
        ),
        (
            "Kapasitas & Harga",
            {
                "fields": ("capacity", "hourly_rate"),
            },
        ),
        (
            "Status",
            {
                "fields": ("is_active",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("id", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="Tarif/Jam")
    def hourly_rate_display(self, obj):
        """Tampilkan tarif dengan format Rupiah."""
        return f"Rp {obj.hourly_rate:,.0f}"

    @admin.display(description="Total Booking")
    def booking_count(self, obj):
        """Jumlah total booking untuk ruangan ini."""
        count = obj.bookings.count()
        return count


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """Admin untuk manajemen booking — dengan filter dan aksi batch."""

    list_display = [
        "id_short",
        "user",
        "room",
        "date",
        "time_range",
        "duration_hours",
        "status_badge",
        "total_cost_display",
        "created_at",
    ]
    list_filter = ["status", "date", "room", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "room__name",
        "notes",
    ]
    list_select_related = ["user", "room"]
    readonly_fields = ["id", "total_cost", "created_at", "updated_at"]
    date_hierarchy = "date"
    actions = ["confirm_bookings", "cancel_bookings", "complete_bookings"]

    fieldsets = (
        (
            "Detail Booking",
            {
                "fields": ("user", "room", "date", "start_time", "duration_hours"),
            },
        ),
        (
            "Status & Biaya",
            {
                "fields": ("status", "total_cost", "notes"),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("id", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="ID")
    def id_short(self, obj):
        """Tampilkan ID singkat (8 karakter pertama)."""
        return str(obj.id)[:8] + "..."

    @admin.display(description="Waktu")
    def time_range(self, obj):
        """Tampilkan rentang waktu booking."""
        return f"{obj.start_time.strftime('%H:%M')} - {obj.end_time.strftime('%H:%M')}"

    @admin.display(description="Status")
    def status_badge(self, obj):
        """Tampilkan badge status berwarna."""
        colors = {
            "pending": "#f59e0b",
            "confirmed": "#10b981",
            "cancelled": "#ef4444",
            "completed": "#6366f1",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color:{}; color:white; padding:3px 10px; '
            'border-radius:12px; font-size:11px; font-weight:600;">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description="Biaya")
    def total_cost_display(self, obj):
        """Tampilkan biaya dengan format Rupiah."""
        return f"Rp {obj.total_cost:,.0f}"

    # --- Aksi Batch ---

    @admin.action(description="✓ Konfirmasi booking terpilih")
    def confirm_bookings(self, request, queryset):
        updated = queryset.filter(status=Booking.Status.PENDING).update(
            status=Booking.Status.CONFIRMED
        )
        self.message_user(request, f"{updated} booking berhasil dikonfirmasi.")

    @admin.action(description="✗ Batalkan booking terpilih")
    def cancel_bookings(self, request, queryset):
        updated = queryset.exclude(status=Booking.Status.COMPLETED).update(
            status=Booking.Status.CANCELLED
        )
        self.message_user(request, f"{updated} booking berhasil dibatalkan.")

    @admin.action(description="✓ Tandai booking selesai")
    def complete_bookings(self, request, queryset):
        updated = queryset.filter(status=Booking.Status.CONFIRMED).update(
            status=Booking.Status.COMPLETED
        )
        self.message_user(request, f"{updated} booking ditandai selesai.")
