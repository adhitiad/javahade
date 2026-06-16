import logging
import freecurrencyapi
from django.core.cache import cache
from decimal import Decimal

logger = logging.getLogger(__name__)

# Hardcoded API key based on user request
API_KEY = "fca_live_jdiN8WlOwMsO3wcxLClk1FZj3DQubCvTIoZkWEs2"

class ExchangeRateService:
    @classmethod
    def get_rates(cls):
        """Returns live exchange rates with base USD. Cached for 1 hour."""
        rates = cache.get("fca_exchange_rates")
        if not rates:
            try:
                client = freecurrencyapi.Client(API_KEY)
                result = client.latest()
                rates = result.get('data', {})
                if rates:
                    # Cache for 1 hour (3600 seconds)
                    cache.set("fca_exchange_rates", rates, 3600)
            except Exception as e:
                logger.error(f"Failed to fetch freecurrencyapi: {e}")
                
        # Default fallback if API fails completely and cache is empty
        if not rates:
            rates = {
                'USD': 1.0,
                'IDR': 17800.0,
                'SGD': 1.34,
                'MYR': 4.70,
                'CNY': 7.15,
                'EUR': 0.92,
                'GBP': 0.79,
                'JPY': 150.0,
            }
        return rates

    @classmethod
    def get_rate(cls, from_currency: str, to_currency: str, apply_spread=False) -> Decimal:
        """Get exchange rate between two currencies with an optional 0.49% spread."""
        if from_currency == to_currency:
            return Decimal("1.0")
            
        rates = cls.get_rates()
        try:
            from_rate = Decimal(str(rates.get(from_currency, 1.0)))
            to_rate = Decimal(str(rates.get(to_currency, 1.0)))
            
            raw_rate = to_rate / from_rate
            
            if apply_spread:
                # Spread 0.49% -> multiply by 1.0049 or 0.9951 depending on buy/sell.
                # Assuming this function returns the converted output, we deduct 0.49% as exchange fee
                raw_rate = raw_rate * Decimal("0.9951")
                
            return raw_rate
        except Exception:
            return Decimal("1.0")
