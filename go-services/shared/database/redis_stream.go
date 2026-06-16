package database

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

// StreamEvent struktur untuk mengirim/menerima event dari Redis Stream
type StreamEvent struct {
	ID      string
	Stream  string
	Payload map[string]interface{}
}

// PublishEvent menerbitkan event ke Redis Stream
func PublishEvent(ctx context.Context, client *redis.Client, streamName string, payload map[string]interface{}) (string, error) {
	args := &redis.XAddArgs{
		Stream: streamName,
		Values: payload,
	}

	id, err := client.XAdd(ctx, args).Result()
	if err != nil {
		return "", fmt.Errorf("gagal melempar event ke stream %s: %w", streamName, err)
	}

	return id, nil
}

// CreateConsumerGroup membuat grup konsumen jika belum ada
func CreateConsumerGroup(ctx context.Context, client *redis.Client, streamName, groupName string) error {
	err := client.XGroupCreateMkStream(ctx, streamName, groupName, "$").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return fmt.Errorf("gagal membuat consumer group %s: %w", groupName, err)
	}
	return nil
}

// ConsumeEvents membaca event dari Redis Stream menggunakan Consumer Group secara blocking
func ConsumeEvents(ctx context.Context, client *redis.Client, streamName, groupName, consumerName string, handler func(event StreamEvent) error) {
	for {
		select {
		case <-ctx.Done():
			log.Printf("Consumer %s berhenti mendengarkan %s", consumerName, streamName)
			return
		default:
			// Baca pesan baru secara blocking (block=0 berarti tunggu terus)
			args := &redis.XReadGroupArgs{
				Group:    groupName,
				Consumer: consumerName,
				Streams:  []string{streamName, ">"},
				Count:    1,
				Block:    0,
			}

			streams, err := client.XReadGroup(ctx, args).Result()
			if err != nil {
				// Cegah spam log jika connection closed
				if err == redis.Nil || err == context.Canceled {
					continue
				}
				log.Printf("Error membaca stream %s: %v", streamName, err)
				continue
			}

			for _, stream := range streams {
				for _, msg := range stream.Messages {
					event := StreamEvent{
						ID:      msg.ID,
						Stream:  stream.Stream,
						Payload: msg.Values,
					}

					// Eksekusi Handler
					if err := handler(event); err != nil {
						log.Printf("Gagal memproses event %s: %v", msg.ID, err)
						// Secara default, pesan yang tidak di-Ack akan masuk ke PEL (Pending Entries List)
					} else {
						// Jika sukses, beri Acknowledgement agar pesan dihapus dari PEL
						client.XAck(ctx, streamName, groupName, msg.ID)
					}
				}
			}
		}
	}
}

