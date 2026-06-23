// Package service implements chat business logic.
package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/kreativa/chat-service/internal/model"
)

// MessageService handles message persistence in MongoDB.
type MessageService struct {
	collection *mongo.Collection
}

func NewMessageService(db *mongo.Database) *MessageService {
	coll := db.Collection("messages")

	// Create indexes
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	coll.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "room_id", Value: 1}, {Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "sender_id", Value: 1}}},
	})

	return &MessageService{collection: coll}
}

// SaveMessage persists a message to MongoDB.
func (s *MessageService) SaveMessage(ctx context.Context, msg *model.ChatMessage) error {
	msg.ID = uuid.New().String()
	msg.CreatedAt = time.Now()
	msg.UpdatedAt = time.Now()

	_, err := s.collection.InsertOne(ctx, msg)
	if err != nil {
		log.Error().Err(err).Str("room_id", msg.RoomID).Msg("Failed to save message")
		return err
	}
	return nil
}

// GetMessages retrieves paginated messages for a room.
func (s *MessageService) GetMessages(ctx context.Context, roomID string, limit, offset int64) ([]model.ChatMessage, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit).
		SetSkip(offset)

	cursor, err := s.collection.Find(ctx, bson.M{
		"room_id":    roomID,
		"is_deleted": false,
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messages []model.ChatMessage
	if err := cursor.All(ctx, &messages); err != nil {
		return nil, err
	}

	if messages == nil {
		messages = []model.ChatMessage{}
	}
	return messages, nil
}

// DeleteMessage soft deletes a message in MongoDB.
func (s *MessageService) DeleteMessage(ctx context.Context, id string) error {
	_, err := s.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"is_deleted": true, "updated_at": time.Now()}},
	)
	if err != nil {
		log.Error().Err(err).Str("message_id", id).Msg("Failed to delete message")
		return err
	}
	return nil
}

