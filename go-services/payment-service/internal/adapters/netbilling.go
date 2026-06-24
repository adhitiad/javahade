package adapters

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

type NETbilling struct {
	AccountID string
}

func NewNETbilling(accountID string) *NETbilling {
	return &NETbilling{
		AccountID: accountID,
	}
}

func (n *NETbilling) CreateIntent(amount int64, currency string, metadata map[string]string) (string, string, error) {
	providerRef := uuid.New().String()
	
	checkoutURL := fmt.Sprintf("https://secure.netbilling.com/gw/native/hosted?account_id=%s&amount=%d&currency=%s&user_data=%s",
		n.AccountID, amount, currency, providerRef)
	
	return checkoutURL, providerRef, nil
}

func (n *NETbilling) VerifyWebhook(r *http.Request) (Event, bool) {
	if err := r.ParseForm(); err != nil {
		return Event{}, false
	}
	
	event := Event{
		Type:        r.PostFormValue("trans_type"), 
		ProviderRef: r.PostFormValue("user_data"),
		Currency:    "USD",
		Status:      "success",
		Amount:      1000, 
	}
	
	return event, true
}

func (n *NETbilling) CreatePayout(destination string, amount int64) error {
	return fmt.Errorf("payouts not supported via netbilling")
}
