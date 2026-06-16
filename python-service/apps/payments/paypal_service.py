import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class PayPalService:
    @property
    def base_url(self):
        if settings.PAYPAL_MODE == 'live':
            return "https://api-m.paypal.com"
        return "https://api-m.sandbox.paypal.com"

    def get_access_token(self):
        client_id = settings.PAYPAL_CLIENT_ID
        secret = settings.PAYPAL_SECRET

        if client_id == "mock-client-id":
            return "mock-access-token"

        url = f"{self.base_url}/v1/oauth2/token"
        headers = {
            "Accept": "application/json",
            "Accept-Language": "en_US"
        }
        data = {
            "grant_type": "client_credentials"
        }

        try:
            response = requests.post(url, headers=headers, data=data, auth=HTTPBasicAuth(client_id, secret))
            response.raise_for_status()
            return response.json().get('access_token')
        except requests.exceptions.RequestException as e:
            logger.error(f"PayPal get_access_token failed: {e}")
            return None

    def create_order(self, amount, currency="USD"):
        token = self.get_access_token()
        if token == "mock-access-token":
            return {"id": "MOCK-ORDER-ID", "status": "CREATED"}

        if not token:
            return None

        url = f"{self.base_url}/v2/checkout/orders"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": currency,
                        "value": str(amount)
                    }
                }
            ]
        }

        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"PayPal create_order failed: {e}")
            return None

    def capture_order(self, order_id):
        token = self.get_access_token()
        if token == "mock-access-token":
            return {"status": "COMPLETED"}

        if not token:
            return None

        url = f"{self.base_url}/v2/checkout/orders/{order_id}/capture"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }

        try:
            response = requests.post(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"PayPal capture_order failed: {e}")
            return None
