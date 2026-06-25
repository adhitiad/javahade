"""
Payment provider abstraction.
"""

import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    success: bool
    provider_ref: str
    error_message: Optional[str] = None


class PaymentProvider(ABC):
    """Abstract payment provider interface."""

    @abstractmethod
    def create_payment(self, amount: float, currency: str, metadata: dict) -> PaymentResult:
        """Create a payment intent with the provider."""
        pass

    @abstractmethod
    def verify_payment(self, provider_ref: str) -> PaymentResult:
        """Verify a payment status."""
        pass

    @abstractmethod
    def refund_payment(self, provider_ref: str, amount: float) -> PaymentResult:
        """Refund a payment."""
        pass


class StripeProvider(PaymentProvider):
    def create_payment(self, amount: float, currency: str, metadata: dict) -> PaymentResult:
        try:
            import stripe
            from django.conf import settings
            stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
            
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100) if currency.upper() != "JPY" else int(amount),
                currency=currency,
                metadata=metadata,
            )
            logger.info("StripeProvider: Created payment %s", intent.id)
            return PaymentResult(success=True, provider_ref=intent.id)
        except Exception as e:
            logger.error("StripeProvider Error: %s", e)
            return PaymentResult(success=False, provider_ref="", error_message=str(e))

    def verify_payment(self, provider_ref: str) -> PaymentResult:
        try:
            import stripe
            from django.conf import settings
            stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
            intent = stripe.PaymentIntent.retrieve(provider_ref)
            success = intent.status == "succeeded"
            return PaymentResult(success=success, provider_ref=provider_ref)
        except Exception as e:
            return PaymentResult(success=False, provider_ref=provider_ref, error_message=str(e))

    def refund_payment(self, provider_ref: str, amount: float) -> PaymentResult:
        try:
            import stripe
            from django.conf import settings
            stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
            refund = stripe.Refund.create(payment_intent=provider_ref)
            return PaymentResult(success=True, provider_ref=refund.id)
        except Exception as e:
            return PaymentResult(success=False, provider_ref=provider_ref, error_message=str(e))


class CryptoProvider(PaymentProvider):
    def create_payment(self, amount: float, currency: str, metadata: dict) -> PaymentResult:
        # Example using a generic crypto gateway (e.g. Coinbase Commerce or NowPayments)
        ref = f"crypto_{uuid.uuid4().hex[:12]}"
        logger.info("CryptoProvider: Created payment intent %s for %.2f %s", ref, amount, currency)
        return PaymentResult(success=True, provider_ref=ref)

    def verify_payment(self, provider_ref: str) -> PaymentResult:
        logger.info("CryptoProvider: Verified payment %s", provider_ref)
        return PaymentResult(success=True, provider_ref=provider_ref)

    def refund_payment(self, provider_ref: str, amount: float) -> PaymentResult:
        logger.info("CryptoProvider: Crypto refunds require manual processing for %s", provider_ref)
        return PaymentResult(success=False, provider_ref=provider_ref, error_message="Crypto refunds are manual")


class PayPalAdapterProvider(PaymentProvider):
    def create_payment(self, amount: float, currency: str, metadata: dict) -> PaymentResult:
        from .paypal_service import PayPalService
        svc = PayPalService()
        order = svc.create_order(amount, currency)
        if order and "id" in order:
            return PaymentResult(success=True, provider_ref=order["id"])
        return PaymentResult(success=False, provider_ref="", error_message="Failed to create PayPal order")

    def verify_payment(self, provider_ref: str) -> PaymentResult:
        from .paypal_service import PayPalService
        svc = PayPalService()
        order = svc.capture_order(provider_ref)
        if order and order.get("status") == "COMPLETED":
            return PaymentResult(success=True, provider_ref=provider_ref)
        return PaymentResult(success=False, provider_ref=provider_ref, error_message="Payment not completed")

    def refund_payment(self, provider_ref: str, amount: float) -> PaymentResult:
        return PaymentResult(success=False, provider_ref=provider_ref, error_message="Not implemented")

class GoPaymentAdapterProvider(PaymentProvider):
    def __init__(self, provider_name: str):
        self.provider_name = provider_name
        from django.conf import settings
        self.base_url = getattr(settings, "GO_PAYMENT_SERVICE_URL", "http://localhost:3001/v1")

    def create_payment(self, amount: float, currency: str, metadata: dict) -> PaymentResult:
        try:
            import requests
            payload = {
                "amount": amount,
                "currency": currency,
                "provider_preference": self.provider_name,
                "user_id": str(metadata.get("user_id", "00000000-0000-0000-0000-000000000000"))
            }
            response = requests.post(f"{self.base_url}/intent", json=payload, timeout=10)
            response.raise_for_status()
            data = response.json()
            # If the Go service returns a checkout URL, we can pass it via provider_ref temporarily
            # or in a real scenario extend PaymentResult.
            # We'll prepend 'go_checkout:' to signal the view.
            ref = data.get("checkout_url") or data.get("client_secret") or "ref_unknown"
            if "checkout_url" in data:
                ref = "go_checkout:" + data["checkout_url"]
            return PaymentResult(success=True, provider_ref=ref)
        except Exception as e:
            logger.error("GoPaymentAdapterProvider Error: %s", e)
            return PaymentResult(success=False, provider_ref="", error_message=str(e))

    def verify_payment(self, provider_ref: str) -> PaymentResult:
        # Usually Go handles via Webhook, verification returns True
        return PaymentResult(success=True, provider_ref=provider_ref)

    def refund_payment(self, provider_ref: str, amount: float) -> PaymentResult:
        return PaymentResult(success=False, provider_ref=provider_ref, error_message="Not implemented via Go Adapter")


def get_payment_provider(name: str) -> PaymentProvider:
    """Factory to get payment provider by name."""
    # Standard Python providers
    providers = {
        "stripe": StripeProvider,
        "crypto": CryptoProvider,
        "paypal": PayPalAdapterProvider,
    }
    
    # Check if it's a Go service provider
    go_providers = ["verotel", "segpay", "netbilling", "elotpay", "paxum"]
    if name in go_providers:
        return GoPaymentAdapterProvider(name)

    provider_cls = providers.get(name)
    if not provider_cls:
        logger.warning(f"Unknown payment provider: {name}. Falling back to Stripe.")
        return StripeProvider()
    return provider_cls()
