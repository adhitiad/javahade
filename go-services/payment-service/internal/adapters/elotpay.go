package adapters

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

type ELotPay struct {
	APIKey string
}

func NewELotPay(apiKey string) *ELotPay {
	return &ELotPay{
		APIKey: apiKey,
	}
}

func (e *ELotPay) CreateIntent(amount int64, currency string, metadata map[string]string) (string, string, error) {
	providerRef := uuid.New().String()
	
	// Example crypto gateway intent
	checkoutURL := fmt.Sprintf("https://checkout.elotpay.com/pay?api_key=%s&amount=%d&currency=%s&ref=%s",
		e.APIKey, amount, currency, providerRef)
	
	return checkoutURL, providerRef, nil
}

func (e *ELotPay) VerifyWebhook(r *http.Request) (Event, bool) {
	if err := r.ParseForm(); err != nil {
		return Event{}, false
	}
	
	event := Event{
		Type:        "crypto_payment", 
		ProviderRef: r.PostFormValue("ref"),
		Currency:    "USDT",
		Status:      "success",
		Amount:      1000, 
	}
	
	return event, true
}

func (e *ELotPay) CreatePayout(destination string, amount int64) error {
	// Crypto payout could theoretically be supported here
	return fmt.Errorf("crypto payouts not implemented yet")
}
