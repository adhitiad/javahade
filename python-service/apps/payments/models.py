"""
Payment models — PaymentIntent, Payout.
"""

import uuid

from django.conf import settings
from django.db import models


class PaymentIntent(models.Model):
    """Represents a payment attempt."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class PaymentType(models.TextChoices):
        SUBSCRIPTION = "subscription", "Subscription"
        TIP = "tip", "Tip"
        CONTENT_PURCHASE = "content_purchase", "Content Purchase"
        GIFT = "gift", "Gift"
        BOOKING = "booking", "Booking"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="received_payments", null=True, blank=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    payment_type = models.CharField(
        max_length=20, choices=PaymentType.choices
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    provider = models.CharField(
        max_length=50, default="mock",
        help_text="Payment provider: mock, stripe, midtrans, xendit"
    )
    provider_ref = models.CharField(
        max_length=255, blank=True, default="",
        help_text="External payment reference ID"
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payment_intents"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.payment_type} ${self.amount} [{self.status}]"


class Payout(models.Model):
    """Creator payout / withdrawal."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class Method(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        PAYPAL = "paypal", "PayPal"
        CRYPTO = "crypto", "Cryptocurrency"
        BNB = "bnb", "BNB (Binance Coin)"
        USDT = "usdt", "USDT (Tether)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="payouts", limit_choices_to={"role": "host"},
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING
    )
    bank_details = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payouts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payout ${self.amount} to {self.creator.username} [{self.status}]"

class WalletTransaction(models.Model):
    """Buku besar (Ledger) untuk mencatat arus kas (masuk/keluar) di Dompet Host."""
    class TransactionType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdraw", "Withdrawal"
        EARNING = "earning", "Earning"
        REFUND = "refund", "Refund"
        SUBSCRIPTION = "subscription", "Subscription Payment"
        TICKET_PURCHASE = "ticket", "Ticket Purchase"
        FEE_DEDUCTION = "fee_deduction", "Potongan Biaya Layanan"

    class Status(models.TextChoices):
        PENDING = "pending", "Menunggu"
        COMPLETED = "completed", "Berhasil"
        FAILED = "failed", "Gagal"
        
    class Currency(models.TextChoices):
        USD = "USD", "Dolar AS (USD)"
        SGD = "SGD", "Dolar Singapura (SGD)"
        IDR = "IDR", "Rupiah (IDR)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="wallet_transactions", null=True, blank=True
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    
    # Referensi ke model lain (opsional)
    reference_id = models.CharField(max_length=255, blank=True, null=True, help_text="ID Booking atau Payment Intent terkait")
    notes = models.TextField(blank=True, default="", help_text="Catatan admin atau detail transaksi")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wallet_transactions"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        from django.core.exceptions import ValidationError
        if self.pk:
            raise ValidationError("WalletTransaction adalah immutable ledger dan tidak boleh diedit.")
        super().save(*args, **kwargs)

    def __str__(self):
        sign = "+" if self.transaction_type in ["deposit", "earning", "subscription"] else "-"
        return f"{self.get_transaction_type_display()} {sign}{self.currency} {self.amount} - {self.user.username}"  # type: ignore


class VirtualGift(models.Model):
    """Katalog Hadiah Virtual (Saweran)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=255, help_text="Emoji, FontAwesome class, atau URL Gambar Stiker")
    price_idr = models.DecimalField(max_digits=12, decimal_places=2, help_text="Harga dalam Rupiah")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "virtual_gifts"
        ordering = ["price_idr"]

    def __str__(self):
        return f"{self.icon} {self.name} (IDR {self.price_idr})"


class GiftTransaction(models.Model):
    """Pencatatan pengiriman hadiah dari User ke Host."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_gifts")
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_gifts")
    gift = models.ForeignKey(VirtualGift, on_delete=models.SET_NULL, null=True)
    
    # Financial details at the time of transaction
    amount_idr = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total dibayar sender")
    platform_fee_idr = models.DecimalField(max_digits=12, decimal_places=2, help_text="Potongan platform (30%)")
    net_host_amount_idr = models.DecimalField(max_digits=12, decimal_places=2, help_text="Diterima host (70%)")
    
    context = models.CharField(max_length=50, default="profile", help_text="Dimana gift ini dikirim (livestream, profile, private_call)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gift_transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender.username} sent {self.gift.name if self.gift else 'Gift'} to {self.receiver.username}"

class StreamBounty(models.Model):
    """Tantangan Berbayar dari penonton untuk Host."""
    class Status(models.TextChoices):
        PENDING = "pending", "Menunggu Respon Host"
        ACCEPTED = "accepted", "Diterima & Dikerjakan"
        COMPLETED = "completed", "Selesai (Dana Cair)"
        REJECTED = "rejected", "Ditolak (Dana Kembali)"
        FAILED = "failed", "Gagal Diselesaikan (Dana Kembali)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bounties_received", limit_choices_to={"role": "host"})
    challenger = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bounties_created")
    task_description = models.TextField(help_text="Deskripsi tantangan (misal: 'Nyanyi lagu A')")
    amount_idr = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total saldo ditahan")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stream_bounties"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Bounty {self.amount_idr} IDR for {self.host.username} - {self.status}"
