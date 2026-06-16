from django.contrib import admin
from .models import PaymentIntent, Payout

@admin.register(PaymentIntent)
class PaymentIntentAdmin(admin.ModelAdmin):
    list_display = ["user", "amount", "payment_type", "status", "provider", "created_at"]
    list_filter = ["status", "payment_type", "provider"]

@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ["creator", "amount", "method", "status", "created_at"]
    list_filter = ["status", "method"]
