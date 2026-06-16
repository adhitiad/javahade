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


class MockProvider(PaymentProvider):
    """
    Mock payment provider for development.
    Always succeeds, generates fake references.
    """

    def create_payment(self, amount: float, currency: str, metadata: dict) -> PaymentResult:
        ref = f"mock_{uuid.uuid4().hex[:12]}"
        logger.info("MockProvider: Created payment %s for %.2f %s", ref, amount, currency)
        return PaymentResult(success=True, provider_ref=ref)

    def verify_payment(self, provider_ref: str) -> PaymentResult:
        logger.info("MockProvider: Verified payment %s", provider_ref)
        return PaymentResult(success=True, provider_ref=provider_ref)

    def refund_payment(self, provider_ref: str, amount: float) -> PaymentResult:
        logger.info("MockProvider: Refunded %.2f for %s", amount, provider_ref)
        return PaymentResult(success=True, provider_ref=provider_ref)


# ─── Future provider stubs ───

# class StripeProvider(PaymentProvider):
#     def __init__(self):
#         import stripe
#         stripe.api_key = settings.STRIPE_SECRET_KEY
#
#     def create_payment(self, amount, currency, metadata):
#         intent = stripe.PaymentIntent.create(
#             amount=int(amount * 100),
#             currency=currency,
#             metadata=metadata,
#         )
#         return PaymentResult(success=True, provider_ref=intent.id)

# class MidtransProvider(PaymentProvider): ...
# class XenditProvider(PaymentProvider): ...


def get_payment_provider(name: str = "mock") -> PaymentProvider:
    """Factory to get payment provider by name."""
    providers = {
        "mock": MockProvider,
        # "stripe": StripeProvider,
        # "midtrans": MidtransProvider,
        # "xendit": XenditProvider,
    }
    provider_cls = providers.get(name)
    if not provider_cls:
        raise ValueError(f"Unknown payment provider: {name}")
    return provider_cls()
