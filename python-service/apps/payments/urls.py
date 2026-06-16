from django.urls import path
from .views import (
    CreatePaymentView, PaymentHistoryView,
    EarningsView, RequestPayoutView, WebhookView,
    PayPalCreateOrderView, PayPalCaptureOrderView,
    VerifyCryptoTransactionView, VirtualGiftListAPIView, SendGiftAPIView,
    ExchangeRatesAPIView
)

urlpatterns = [
    path("intent/", CreatePaymentView.as_view(), name="payment-create"),
    path("history/", PaymentHistoryView.as_view(), name="payment-history"),
    path("earnings/", EarningsView.as_view(), name="earnings"),
    path("payout/", RequestPayoutView.as_view(), name="payout-request"),
    path("webhook/", WebhookView.as_view(), name="payment-webhook"),
    path("api/paypal/create-order/", PayPalCreateOrderView.as_view(), name="paypal-create"),
    path("api/paypal/capture-order/", PayPalCaptureOrderView.as_view(), name="paypal-capture"),
    path("verify-crypto/", VerifyCryptoTransactionView.as_view(), name="verify-crypto"),
    path("gifts/", VirtualGiftListAPIView.as_view(), name="gifts-list"),
    path("gifts/send/", SendGiftAPIView.as_view(), name="gifts-send"),
    path("exchange-rates/", ExchangeRatesAPIView.as_view(), name="exchange-rates"),
]
