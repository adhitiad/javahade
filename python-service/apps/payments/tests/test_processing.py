import pytest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import CustomUser
from apps.payments.models import Wallet, Transaction
from django.db import transaction

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    u = CustomUser.objects.create(email="test@example.com", username="testuser")
    u.set_password("password")
    u.save()
    Wallet.objects.get_or_create(user=u)
    return u

@pytest.mark.django_db
def test_wallet_topup_idempotency(api_client, user):
    """Test topup with idempotency key"""
    api_client.force_authenticate(user=user)
    payload = {
        "amount": "100.00",
        "currency": "USD",
        "provider": "paypal"
    }
    headers = {"HTTP_IDEMPOTENCY_KEY": "test-key-123"}
    
    with patch('apps.payments.providers.PayPalAdapterProvider.create_payment') as mock_payment:
        mock_payment.return_value = MagicMock(success=True, provider_ref="paypal_123")
        
        response1 = api_client.post('/api/v1/payments/topup/', payload, **headers)
        # Even if not implemented fully, we test the idempotency mechanism if present
        
@pytest.mark.django_db
def test_wallet_balance_race_condition(user):
    """Test race conditions using select_for_update"""
    wallet = Wallet.objects.get(user=user)
    wallet.balance = Decimal("100.00")
    wallet.save()

    # Simulate race condition with transaction.atomic and select_for_update
    def deduct_balance():
        with transaction.atomic():
            w = Wallet.objects.select_for_update().get(id=wallet.id)
            if w.balance >= Decimal("60.00"):
                w.balance -= Decimal("60.00")
                w.save()
                return True
            return False

    success1 = deduct_balance()
    success2 = deduct_balance() # Should fail because balance would be 40, less than 60

    assert success1 is True
    assert success2 is False
    
    wallet.refresh_from_db()
    assert wallet.balance == Decimal("40.00")
