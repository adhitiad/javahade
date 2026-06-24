package adapters

import (
	"fmt"
	"net/http"
)

type Paxum struct {
	AccountEmail string
	APISecret    string
}

func NewPaxum(accountEmail, apiSecret string) *Paxum {
	return &Paxum{
		AccountEmail: accountEmail,
		APISecret:    apiSecret,
	}
}

func (p *Paxum) CreateIntent(amount int64, currency string, metadata map[string]string) (string, string, error) {
	// Paxum can also be used for receiving payments, but mostly used for payouts in adult streaming
	return "", "", fmt.Errorf("use paxum primarily for payouts")
}

func (p *Paxum) VerifyWebhook(r *http.Request) (Event, bool) {
	return Event{}, false
}

func (p *Paxum) CreatePayout(destination string, amount int64) error {
	// Dummy Paxum payout API integration
	// Usually involves sending XML or specific form parameters to Paxum API
	fmt.Printf("Initiating Paxum payout to %s for amount %d\n", destination, amount)
	return nil
}
