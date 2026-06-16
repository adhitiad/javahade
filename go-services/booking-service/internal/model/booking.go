// Package model defines booking domain models.
package model

import (
	"time"

	"github.com/google/uuid"
)

// BookingSlot represents an available time slot by a creator.
type BookingSlot struct {
	ID          uuid.UUID `json:"id"`
	CreatorID   uuid.UUID `json:"creator_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	MaxSeats    int       `json:"max_seats"`
	Price       float64   `json:"price"`
	Currency    string    `json:"currency"`
	Status      string    `json:"status"` // available, full, cancelled, completed
	CreatedAt   time.Time `json:"created_at"`
}

// Booking represents a reservation by a fan.
type Booking struct {
	ID        uuid.UUID `json:"id"`
	SlotID    uuid.UUID `json:"slot_id"`
	UserID    uuid.UUID `json:"user_id"`
	SeatNum   int       `json:"seat_num"`
	Status    string    `json:"status"` // pending, confirmed, cancelled
	CreatedAt time.Time `json:"created_at"`
}

// CreateSlotRequest is the request body for creating a booking slot.
type CreateSlotRequest struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	MaxSeats    int       `json:"max_seats"`
	Price       float64   `json:"price"`
	Currency    string    `json:"currency"`
}

// ReserveRequest is the request body for reserving a slot.
type ReserveRequest struct {
	SlotID uuid.UUID `json:"slot_id"`
}

