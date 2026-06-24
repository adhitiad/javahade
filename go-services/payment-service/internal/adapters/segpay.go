package adapters

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

type Segpay struct {
	PackageID string
}

func NewSegpay(packageID string) *Segpay {
	return &Segpay{
		PackageID: packageID,
	}
}

func (s *Segpay) CreateIntent(amount int64, currency string, metadata map[string]string) (string, string, error) {
	providerRef := uuid.New().String()
	
	// Example dummy URL for Segpay Portal API
	checkoutURL := fmt.Sprintf("https://secure2.segpay.com/billing/poset.cgi?x-etpackageid=%s&amount=%d&currency=%s&reference=%s",
		s.PackageID, amount, currency, providerRef)
	
	return checkoutURL, providerRef, nil
}

func (s *Segpay) VerifyWebhook(r *http.Request) (Event, bool) {
	// Segpay postback verification logic
	if err := r.ParseForm(); err != nil {
		return Event{}, false
	}
	
	// Assuming IP whitelist or simple token verification is done at middleware or router level
	// Construct event
	event := Event{
		Type:        r.PostFormValue("action"), // e.g. "Auth", "Capture", "Void"
		ProviderRef: r.PostFormValue("trantype"),
		Currency:    r.PostFormValue("currencycode"),
		Status:      "success",
		Amount:      1000, // Dummy
	}
	
	return event, true
}

func (s *Segpay) CreatePayout(destination string, amount int64) error {
	return fmt.Errorf("payouts not supported via segpay")
}
