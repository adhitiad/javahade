from django.contrib import admin
from .models import SubscriptionTier, Subscription

@admin.register(SubscriptionTier)
class SubscriptionTierAdmin(admin.ModelAdmin):
    list_display = ["name", "creator", "price", "duration_days", "is_active"]
    list_filter = ["is_active"]

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["subscriber", "tier", "status", "starts_at", "expires_at"]
    list_filter = ["status"]
