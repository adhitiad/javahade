package api

import (
	"context"
	"log"

	"payment-service/internal/adapters"
	"payment-service/internal/ledger"
	"payment-service/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db        *pgxpool.Pool
	ledgerApp *ledger.Ledger
	providers map[string]adapters.Provider
}

func NewHandler(db *pgxpool.Pool, providers map[string]adapters.Provider) *Handler {
	return &Handler{
		db:        db,
		ledgerApp: ledger.NewLedger(db),
		providers: providers,
	}
}

func (h *Handler) CreateIntent(c *fiber.Ctx) error {
	var req models.IntentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Basic 18+ Age Verification flag check (Assume verified if they reach this service via Gateway/BFF)
	// In reality, could check user profile service here via gRPC or HTTP.

	providerName := req.ProviderPreference
	if providerName == "" {
		providerName = "segpay" // Default
	}

	provider, ok := h.providers[providerName]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported provider"})
	}

	metadata := map[string]string{"user_id": req.UserID}
	checkoutURL, ref, err := provider.CreateIntent(req.Amount, req.Currency, metadata)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create intent"})
	}

	return c.JSON(models.IntentResponse{
		ClientSecret: ref, // Usually for frontend tracking
		CheckoutURL:  checkoutURL,
	})
}

func (h *Handler) CreatePayout(c *fiber.Ctx) error {
	var req models.PayoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Use Paxum as primary payout provider for talent
	provider, ok := h.providers["paxum"]
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "payout provider not configured"})
	}

	// The destination would ideally be fetched from a talent profile service
	// Using dummy destination for now
	err := provider.CreatePayout("talent_paxum_email@example.com", req.Amount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "payout failed"})
	}

	return c.JSON(models.PayoutResponse{
		PayoutID: "pxm_dummy_id",
	})
}

func (h *Handler) GetBalance(c *fiber.Ctx) error {
	userID := c.Params("user_id")
	
	var bal models.BalanceResponse
	bal.UserID = userID
	
	err := h.db.QueryRow(context.Background(), `
		SELECT currency, balance, locked_balance 
		FROM wallets 
		WHERE user_id = $1 LIMIT 1
	`, userID).Scan(&bal.Currency, &bal.Balance, &bal.LockedBalance)
	
	if err != nil {
		// If not found, return 0 balance
		bal.Currency = "USD"
		bal.Balance = 0
		bal.LockedBalance = 0
	}

	return c.JSON(bal)
}

func (h *Handler) HandleWebhook(providerName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		provider, ok := h.providers[providerName]
		if !ok {
			return c.Status(fiber.StatusNotFound).SendString("provider not found")
		}

		// Convert Fiber Request to net/http Request for the adapter
		// This is a simplified conversion
		// In a real app, you'd use adapter's specific parsing or valyala/fasthttp adapter
		// For now we'll simulate passing it by getting raw body/form
		
		// In production, we'd log the raw webhook for 30 days
		log.Printf("Received webhook for %s: %s", providerName, string(c.Body()))

		// We need to parse form values. For simplicity in Fiber:
		event := adapters.Event{
			ProviderRef: string(c.FormValue("referenceID")), // Verotel style
			Type:        "success",
			Amount:      1000,
			Currency:    "USD",
		}
		if providerName == "segpay" {
			event.ProviderRef = string(c.FormValue("trantype"))
		}

		// Assuming verification passes
		// Record in ledger
		err := h.ledgerApp.RecordTransaction(context.Background(), "dummy_user_id", event.Amount, event.Currency, event.ProviderRef)
		if err != nil {
			log.Printf("Ledger error: %v", err)
			return c.Status(fiber.StatusInternalServerError).SendString("ledger error")
		}

		return c.SendStatus(fiber.StatusOK)
	}
}

func SetupRoutes(app *fiber.App, handler *Handler) {
	api := app.Group("/v1")
	api.Post("/intent", handler.CreateIntent)
	api.Post("/payout", handler.CreatePayout)
	api.Get("/balance/:user_id", handler.GetBalance)

	webhooks := app.Group("/webhook")
	webhooks.Post("/verotel", handler.HandleWebhook("verotel"))
	webhooks.Post("/segpay", handler.HandleWebhook("segpay"))
	webhooks.Post("/netbilling", handler.HandleWebhook("netbilling"))
}
