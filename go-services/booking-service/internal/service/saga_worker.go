package service

import (
	"context"
	"encoding/json"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	sharedDB "github.com/kreativa/shared/database"
)

// SagaWorker bertanggung jawab untuk mendengarkan balasan dari Python Payment Service
type SagaWorker struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func NewSagaWorker(db *pgxpool.Pool, redis *redis.Client) *SagaWorker {
	return &SagaWorker{
		db:    db,
		redis: redis,
	}
}

func (w *SagaWorker) Run(ctx context.Context) {
	streamName := "saga:booking_events"
	groupName := "go_booking_service"
	consumerName := "worker_1"

	// Buat grup jika belum ada
	err := sharedDB.CreateConsumerGroup(ctx, w.redis, streamName, groupName)
	if err != nil {
		log.Printf("Peringatan: %v", err)
	}

	log.Println("Saga Worker (Go) mulai mendengarkan event payment...")

	// Mulai mendengarkan secara blocking
	sharedDB.ConsumeEvents(ctx, w.redis, streamName, groupName, consumerName, w.handleEvent)
}

func (w *SagaWorker) handleEvent(event sharedDB.StreamEvent) error {
	eventType, ok := event.Payload["event"].(string)
	if !ok {
		return nil // Abaikan jika format salah
	}

	// Kita hanya peduli pada balasan dari Python
	if eventType != "payment.success" && eventType != "payment.failed" {
		return nil
	}

	payloadStr, ok := event.Payload["payload"].(string)
	if !ok {
		return nil
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(payloadStr), &data); err != nil {
		return err
	}

	bookingIDStr, _ := data["booking_id"].(string)
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		return err
	}

	userIDStr, _ := data["user_id"].(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return err
	}

	ctx := context.Background()

	if eventType == "payment.success" {
		// Konfirmasi Booking
		_, err = w.db.Exec(ctx, `UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND user_id = $2`, bookingID, userID)
		if err != nil {
			log.Printf("Gagal mengonfirmasi booking %s: %v", bookingID, err)
			return err
		}
		log.Printf("Saga Selesai: Booking %s DIKONFIRMASI (Saldo Terpotong)", bookingID)
	} else if eventType == "payment.failed" {
		// Kompensasi: Batalkan Booking
		reason, _ := data["reason"].(string)
		_, err = w.db.Exec(ctx, `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND user_id = $2`, bookingID, userID)
		if err != nil {
			log.Printf("Gagal membatalkan booking %s: %v", bookingID, err)
			return err
		}
		log.Printf("Saga Dibatalkan: Booking %s DIBATALKAN karena: %s", bookingID, reason)
	}

	return nil
}
