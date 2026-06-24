package adapters

import (
	"net/http"
)

// Event represents a normalized webhook event from any payment provider
type Event struct {
	Type          string // e.g., "payment_success", "payment_failed"
	ProviderRef   string // Transaction ID at the provider
	Amount        int64
	Currency      string
	Status        string // "success", "failed", "pending"
	IdempotencyKey string
}

// Provider defines the interface that all payment gateways must implement
type Provider interface {
	// CreateIntent generates a checkout session or payment intent
	CreateIntent(amount int64, currency string, metadata map[string]string) (checkoutURL string, providerRef string, err error)
	
	// VerifyWebhook verifies the signature of an incoming webhook request and parses it into a normalized Event
	VerifyWebhook(r *http.Request) (event Event, ok bool)
	
	// CreatePayout initiates a payout to a destination (e.g., talent's Paxum or Wise account)
	CreatePayout(destination string, amount int64) error
}
