package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/kreativa/chat-service/internal/model"
)

// RoomService handles chat room operations.
type RoomService struct {
	collection *mongo.Collection
}

func NewRoomService(db *mongo.Database) *RoomService {
	coll := db.Collection("rooms")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	coll.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "participants", Value: 1}}},
		{Keys: bson.D{{Key: "type", Value: 1}}},
		{Keys: bson.D{{Key: "family_id", Value: 1}}},
	})

	return &RoomService{collection: coll}
}

// CreateRoom creates a new chat room.
func (s *RoomService) CreateRoom(ctx context.Context, roomType, name, creatorID string, participants []string, familyID, streamID string) (*model.ChatRoom, error) {
	room := &model.ChatRoom{
		ID:           uuid.New().String(),
		Type:         roomType,
		Name:         name,
		Participants: participants,
		FamilyID:     familyID,
		StreamID:     streamID,
		CreatedBy:    creatorID,
		CreatedAt:    time.Now(),
	}

	_, err := s.collection.InsertOne(ctx, room)
	return room, err
}

// GetUserRooms returns rooms where the user is a participant.
func (s *RoomService) GetUserRooms(ctx context.Context, userID string) ([]model.ChatRoom, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := s.collection.Find(ctx, bson.M{
		"participants": userID,
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rooms []model.ChatRoom
	if err := cursor.All(ctx, &rooms); err != nil {
		return nil, err
	}

	if rooms == nil {
		rooms = []model.ChatRoom{}
	}
	return rooms, nil
}

// FindDirectRoom finds an existing direct room between two users.
func (s *RoomService) FindDirectRoom(ctx context.Context, user1, user2 string) (*model.ChatRoom, error) {
	var room model.ChatRoom
	err := s.collection.FindOne(ctx, bson.M{
		"type":         "direct",
		"participants": bson.M{"$all": []string{user1, user2}, "$size": 2},
	}).Decode(&room)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &room, err
}

// Conversation represents a DM conversation with last message preview.
type Conversation struct {
	RoomID        string    `json:"room_id"`
	OtherUserID   string    `json:"other_user_id"`
	OtherUsername string    `json:"other_username"`
	LastMessage   string    `json:"last_message"`
	LastMessageAt time.Time `json:"last_message_at"`
	UnreadCount   int       `json:"unread_count"`
}

// GetConversations returns DM conversations for a user with last message preview.
func (s *RoomService) GetConversations(ctx context.Context, userID string) ([]Conversation, error) {
	// Get all direct rooms where user is a participant
	cursor, err := s.collection.Find(ctx, bson.M{
		"type":         "direct",
		"participants": userID,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rooms []model.ChatRoom
	if err := cursor.All(ctx, &rooms); err != nil {
		return nil, err
	}

	if rooms == nil {
		return []Conversation{}, nil
	}

	conversations := make([]Conversation, 0, len(rooms))
	for _, room := range rooms {
		// Find the other user
		var otherUserID string
		for _, p := range room.Participants {
			if p != userID {
				otherUserID = p
				break
			}
		}
		if otherUserID == "" {
			continue
		}

		conv := Conversation{
			RoomID:      room.ID,
			OtherUserID: otherUserID,
			UnreadCount: 0,
		}

		// Get last message from the room
		// The last message is stored in room.LastMessage if available
		if room.LastMessage != nil {
			conv.LastMessage = room.LastMessage.Content
			conv.LastMessageAt = room.LastMessage.CreatedAt
		}

		conversations = append(conversations, conv)
	}

	return conversations, nil
}
