// Package model defines chat domain models.
package model

import (
	"time"
)

// ChatMessage represents a chat message stored in MongoDB.
type ChatMessage struct {
	ID             string                 `json:"id" bson:"_id"`
	RoomID         string                 `json:"room_id" bson:"room_id"`
	SenderID       string                 `json:"sender_id" bson:"sender_id"`
	SenderUsername string                 `json:"sender_username" bson:"sender_username"`
	Type           string                 `json:"type" bson:"type"` // text, image, video, gift, system
	Content        string                 `json:"content" bson:"content"`
	MediaURL       string                 `json:"media_url,omitempty" bson:"media_url,omitempty"`
	Gift           *GiftData              `json:"gift,omitempty" bson:"gift,omitempty"`
	ReplyTo        string                 `json:"reply_to,omitempty" bson:"reply_to,omitempty"`
	Reactions      map[string][]string    `json:"reactions,omitempty" bson:"reactions,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty" bson:"metadata,omitempty"`
	IsDeleted      bool                   `json:"is_deleted" bson:"is_deleted"`
	CreatedAt      time.Time              `json:"created_at" bson:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at" bson:"updated_at"`
}

// GiftData represents a virtual gift in a message.
type GiftData struct {
	Type      string  `json:"type" bson:"type"`           // rose, diamond, rocket, star
	Amount    float64 `json:"amount" bson:"amount"`       // monetary value
	Animation string  `json:"animation" bson:"animation"` // sparkle, explode, rain
}

// ChatRoom represents a chat room.
type ChatRoom struct {
	ID           string    `json:"id" bson:"_id"`
	Type         string    `json:"type" bson:"type"` // direct, group, family, stream_chat
	Name         string    `json:"name,omitempty" bson:"name,omitempty"`
	Participants []string  `json:"participants" bson:"participants"`
	FamilyID     string    `json:"family_id,omitempty" bson:"family_id,omitempty"`
	StreamID     string    `json:"stream_id,omitempty" bson:"stream_id,omitempty"`
	CreatedBy    string    `json:"created_by" bson:"created_by"`
	LastMessage  *ChatMessage `json:"last_message,omitempty" bson:"last_message,omitempty"`
	CreatedAt    time.Time `json:"created_at" bson:"created_at"`
}

// WSMessage is the WebSocket message protocol.
type WSMessage struct {
	Type      string                 `json:"type"`
	RoomID    string                 `json:"room_id"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp int64                  `json:"timestamp"`
}
