package service

import (
	"context"
	"encoding/json"
	"log"

	"payment-service/internal/ledger"

	sharedDB "github.com/adhitiad/javahade/shared/database"
	"github.com/redis/go-redis/v9"
)

type SagaWorker struct {
	redis  *redis.Client
	ledger *ledger.Ledger
}

func NewSagaWorker(r *redis.Client, l *ledger.Ledger) *SagaWorker {
	return &SagaWorker{
		redis:  r,
		ledger: l,
	}
}

func (w *SagaWorker) Run(ctx context.Context) {
	streamName := "saga:booking_events"
	groupName := "go_payment_service"
	consumerName := "worker_1"

	// Buat grup jika belum ada
	err := sharedDB.CreateConsumerGroup(ctx, w.redis, streamName, groupName)
	if err != nil {
		log.Printf("Peringatan Consumer Group: %v", err)
	}

	log.Println("Payment Saga Worker started...")

	// Mulai mendengarkan secara blocking (Consumer Group)
	go sharedDB.ConsumeEvents(ctx, w.redis, streamName, groupName, consumerName, w.handleEvent)
	
	<-ctx.Done()
	log.Println("Saga worker shutting down...")
}

func (w *SagaWorker) handleEvent(event sharedDB.StreamEvent) error {
	eventType, ok := event.Payload["event"].(string)
	if !ok || eventType != "booking.created" {
		return nil // Only process booking.created
	}

	payloadStr, ok := event.Payload["payload"].(string)
	if !ok {
		return
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
		log.Printf("Failed to unmarshal payload: %v", err)
		return
	}

	bookingID, ok := payload["booking_id"].(string)
	userID, ok2 := payload["user_id"].(string)
	amountFloat, ok3 := payload["amount"].(float64)
	currency, ok4 := payload["currency"].(string)

	if !ok || !ok2 || !ok3 || !ok4 {
		return nil // Not a booking.created event we can process
	}

	amount := int64(amountFloat * 100) // Convert to cents (or whatever ledger scale is)

	ctx := context.Background()
	err := w.ledger.SpendTransaction(ctx, userID, amount, currency, bookingID)
	
	// Prepare response event
	replyPayload := map[string]interface{}{
		"booking_id": bookingID,
		"user_id":    userID,
	}

	replyEvent := "payment.success"
	if err != nil {
		log.Printf("Spend failed for booking %s: %v", bookingID, err)
		replyEvent = "payment.failed"
		replyPayload["error"] = err.Error()
	}

	// Publish response back to saga:booking_events so booking-service can see it
	replyJSON, _ := json.Marshal(replyPayload)
	w.redis.XAdd(ctx, &redis.XAddArgs{
		Stream: "saga:booking_events",
		Values: map[string]interface{}{
			"event":   replyEvent,
			"payload": string(replyJSON),
		},
	})

	return nil
}
