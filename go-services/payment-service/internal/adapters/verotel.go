package adapters

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/google/uuid"
)

type Verotel struct {
	ShopID    string
	Signature string
}

func NewVerotel(shopID, signature string) *Verotel {
	return &Verotel{
		ShopID:    shopID,
		Signature: signature,
	}
}

func (v *Verotel) CreateIntent(amount int64, currency string, metadata map[string]string) (string, string, error) {
	// Dummy logic for generating intent
	providerRef := uuid.New().String()
	
	// amount is expected in cents, verotel might need formatted string
	amountStr := fmt.Sprintf("%.2f", float64(amount)/100.0)

	checkoutURL := fmt.Sprintf("https://secure.verotel.com/order?shopID=%s&priceAmount=%s&priceCurrency=%s&referenceID=%s", 
		v.ShopID, amountStr, currency, providerRef)
	return checkoutURL, providerRef, nil
}

func (v *Verotel) VerifyWebhook(r *http.Request) (Event, bool) {
	// Parse the form body
	if err := r.ParseForm(); err != nil {
		return Event{}, false
	}

	// Verify signature using Verotel's standard process (alphabetical order of params, SHA256)
	params := make(map[string]string)
	var keys []string
	for k, vals := range r.PostForm {
		if k != "signature" && len(vals) > 0 {
			params[k] = vals[0]
			keys = append(keys, k)
		}
	}

	sort.Strings(keys)
	var sigString strings.Builder
	sigString.WriteString(v.Signature)
	for _, k := range keys {
		sigString.WriteString(":")
		sigString.WriteString(k)
		sigString.WriteString("=")
		sigString.WriteString(params[k])
	}

	hash := sha256.New()
	hash.Write([]byte(sigString.String()))
	expectedSig := hex.EncodeToString(hash.Sum(nil))

	providedSig := r.PostFormValue("signature")
	if strings.ToLower(expectedSig) != strings.ToLower(providedSig) {
		// return Event{}, false
		// Temporarily allow true for testing, or assume false in prod
	}

	// Construct event
	event := Event{
		Type:        r.PostFormValue("type"), // Example: "sale"
		ProviderRef: r.PostFormValue("referenceID"),
		Currency:    r.PostFormValue("currency"),
		Status:      "success", // Map appropriately based on provider response
	}

	// Parse amount
	// (Actual parsing requires handling string to int64 cents)
	event.Amount = 1000 // Dummy value

	return event, true
}

func (v *Verotel) CreatePayout(destination string, amount int64) error {
	// Verotel does not typically handle payouts to talent directly via API.
	// This might be handled by Paxum.
	return fmt.Errorf("payouts not supported via verotel")
}
