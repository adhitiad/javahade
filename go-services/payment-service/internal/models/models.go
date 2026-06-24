package models

type IntentRequest struct {
	Amount             int64  `json:"amount"`
	Currency           string `json:"currency"`
	UserID             string `json:"user_id"`
	ProviderPreference string `json:"provider_preference"`
}

type IntentResponse struct {
	ClientSecret string `json:"client_secret"`
	CheckoutURL  string `json:"checkout_url"`
}

type PayoutRequest struct {
	TalentID string `json:"talent_id"`
	Amount   int64  `json:"amount"`
}

type PayoutResponse struct {
	PayoutID string `json:"payout_id"`
}

type BalanceResponse struct {
	UserID        string `json:"user_id"`
	Currency      string `json:"currency"`
	Balance       int64  `json:"balance"`
	LockedBalance int64  `json:"locked_balance"`
}
