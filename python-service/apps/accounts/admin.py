"""
Accounts admin configuration.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import CreatorProfile, KYCDocument, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "role", "is_verified", "date_joined"]
    list_filter = ["role", "is_verified", "is_active"]
    search_fields = ["username", "email"]
    fieldsets = BaseUserAdmin.fieldsets + (  # type: ignore
        ("Javahade", {"fields": ("avatar", "bio", "role", "is_verified", "date_of_birth")}),
    )


@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ["display_name", "user", "category", "subscriber_count", "is_approved"]
    list_filter = ["category", "is_approved"]
    search_fields = ["display_name", "user__username"]
    readonly_fields = ["subscriber_count", "earnings_balance", "total_earnings"]


@admin.register(KYCDocument)
class KYCDocumentAdmin(admin.ModelAdmin):
    list_display = ["user", "document_type", "status", "submitted_at"]
    list_filter = ["status", "document_type"]
    search_fields = ["user__username", "user__email"]

from .models import HostBadge, HostAchievement

@admin.register(HostBadge)
class HostBadgeAdmin(admin.ModelAdmin):
    list_display = ["name", "icon", "bonus_idr", "created_at"]
    search_fields = ["name"]

@admin.register(HostAchievement)
class HostAchievementAdmin(admin.ModelAdmin):
    list_display = ["host", "badge", "awarded_at", "bonus_paid"]
    list_filter = ["bonus_paid", "badge"]
    search_fields = ["host__username", "badge__name"]
    readonly_fields = ["bonus_paid"]

    def save_model(self, request, obj, form, change):
        from django.db import transaction
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            if not obj.bonus_paid and obj.badge.bonus_idr > 0:
                host = obj.host
                host.balance_idr += obj.badge.bonus_idr
                host.save(update_fields=['balance_idr'])
                
                # pyrefly: ignore [missing-import]
                from apps.payments.models import WalletTransaction
                WalletTransaction.objects.create(
                    user=host,
                    transaction_type=WalletTransaction.TransactionType.EARNING,
                    amount=obj.badge.bonus_idr,
                    currency="IDR",
                    status=WalletTransaction.Status.COMPLETED,
                    notes=f"Bonus Pencapaian: {obj.badge.name}"
                )
                
                obj.bonus_paid = True
                obj.save(update_fields=['bonus_paid'])
