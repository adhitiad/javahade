"""Payment serializers."""

from decimal import Decimal

from rest_framework import serializers
from .models import PaymentIntent, Payout


class PaymentIntentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentIntent
        fields = [
            "id", "user", "recipient", "amount", "currency",
            "payment_type", "status", "provider", "provider_ref",
            "metadata", "created_at",
        ]
        read_only_fields = [
            "id", "user", "status", "provider", "provider_ref", "created_at",
        ]


class CreatePaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    currency = serializers.CharField(max_length=3, default="USD")
    payment_type = serializers.ChoiceField(choices=PaymentIntent.PaymentType.choices)
    provider = serializers.CharField(max_length=50, required=False, )
    recipient_id = serializers.UUIDField(required=False)
    metadata = serializers.JSONField(required=False, default=dict)


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = [
            "id", "creator", "amount", "currency", "method",
            "status", "processed_at", "created_at",
        ]
        read_only_fields = ["id", "creator", "status", "processed_at", "created_at"]


class CreatePayoutSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("1.00"))
    method = serializers.ChoiceField(choices=Payout.Method.choices)
    bank_details = serializers.JSONField(required=False, default=dict)
