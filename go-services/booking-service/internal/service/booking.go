// Package service implements booking business logic.
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/kreativa/booking-service/internal/model"
)

// BookingService handles booking operations.
type BookingService struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

// NewBookingService creates a new BookingService.
func NewBookingService(db *pgxpool.Pool, redis *redis.Client) *BookingService {
	return &BookingService{db: db, redis: redis}
}

// CreateSlot creates a new booking slot.
func (s *BookingService) CreateSlot(ctx context.Context, creatorID uuid.UUID, req model.CreateSlotRequest) (*model.BookingSlot, error) {
	slot := &model.BookingSlot{
		ID:          uuid.New(),
		CreatorID:   creatorID,
		Title:       req.Title,
		Description: req.Description,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		MaxSeats:    req.MaxSeats,
		Price:       req.Price,
		Currency:    req.Currency,
		Status:      "available",
		CreatedAt:   time.Now(),
	}

	_, err := s.db.Exec(ctx,
		`INSERT INTO booking_slots (id, creator_id, title, description, start_time, end_time, max_seats, price, currency, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		slot.ID, slot.CreatorID, slot.Title, slot.Description,
		slot.StartTime, slot.EndTime, slot.MaxSeats,
		slot.Price, slot.Currency, slot.Status, slot.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create slot: %w", err)
	}

	log.Info().Str("slot_id", slot.ID.String()).Msg("Booking slot created")
	return slot, nil
}

// ListSlots returns available slots, optionally filtered by creator.
func (s *BookingService) ListSlots(ctx context.Context, creatorID string) ([]model.BookingSlot, error) {
	var slots []model.BookingSlot

	query := `SELECT id, creator_id, title, description, start_time, end_time, max_seats, price, currency, status, created_at
	           FROM booking_slots WHERE status = 'available' AND start_time > NOW()`

	var rows interface{ Close() }
	var err error

	if creatorID != "" {
		query += " AND creator_id = $1 ORDER BY start_time"
		r, e := s.db.Query(ctx, query, creatorID)
		rows = r
		err = e
		defer r.Close()

		if err != nil {
			return nil, fmt.Errorf("failed to list slots: %w", err)
		}

		for r.Next() {
			var slot model.BookingSlot
			if err := r.Scan(&slot.ID, &slot.CreatorID, &slot.Title, &slot.Description,
				&slot.StartTime, &slot.EndTime, &slot.MaxSeats, &slot.Price,
				&slot.Currency, &slot.Status, &slot.CreatedAt); err != nil {
				return nil, err
			}
			slots = append(slots, slot)
		}
	} else {
		query += " ORDER BY start_time"
		r, e := s.db.Query(ctx, query)
		rows = r
		err = e
		defer r.Close()
		_ = rows

		if err != nil {
			return nil, fmt.Errorf("failed to list slots: %w", err)
		}

		for r.Next() {
			var slot model.BookingSlot
			if err := r.Scan(&slot.ID, &slot.CreatorID, &slot.Title, &slot.Description,
				&slot.StartTime, &slot.EndTime, &slot.MaxSeats, &slot.Price,
				&slot.Currency, &slot.Status, &slot.CreatedAt); err != nil {
				return nil, err
			}
			slots = append(slots, slot)
		}
	}

	if slots == nil {
		slots = []model.BookingSlot{}
	}
	return slots, nil
}

// ReserveSlot reserves a seat in a booking slot.
func (s *BookingService) ReserveSlot(ctx context.Context, userID, slotID uuid.UUID) (*model.Booking, error) {
	// Get next available seat number
	var currentBookings int
	var maxSeats int

	err := s.db.QueryRow(ctx,
		`SELECT max_seats FROM booking_slots WHERE id = $1 AND status = 'available'`,
		slotID,
	).Scan(&maxSeats)
	if err != nil {
		return nil, fmt.Errorf("slot not found or unavailable")
	}

	err = s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings WHERE slot_id = $1 AND status != 'cancelled'`,
		slotID,
	).Scan(&currentBookings)
	if err != nil {
		return nil, fmt.Errorf("failed to count bookings: %w", err)
	}

	if currentBookings >= maxSeats {
		return nil, fmt.Errorf("no seats available")
	}

	booking := &model.Booking{
		ID:        uuid.New(),
		SlotID:    slotID,
		UserID:    userID,
		SeatNum:   currentBookings + 1,
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	_, err = s.db.Exec(ctx,
		`INSERT INTO bookings (id, slot_id, user_id, seat_num, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		booking.ID, booking.SlotID, booking.UserID,
		booking.SeatNum, booking.Status, booking.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	return booking, nil
}

// ConfirmBooking confirms a pending booking.
func (s *BookingService) ConfirmBooking(ctx context.Context, bookingID, userID uuid.UUID) error {
	result, err := s.db.Exec(ctx,
		`UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
		bookingID, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to confirm booking: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("booking not found or already confirmed")
	}
	return nil
}

// CancelBooking cancels a booking.
func (s *BookingService) CancelBooking(ctx context.Context, bookingID, userID uuid.UUID) error {
	result, err := s.db.Exec(ctx,
		`UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'confirmed')`,
		bookingID, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to cancel booking: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("booking not found or already cancelled")
	}
	return nil
}

// GetUserBookings returns bookings for a user.
func (s *BookingService) GetUserBookings(ctx context.Context, userID uuid.UUID) ([]model.Booking, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, slot_id, user_id, seat_num, status, created_at
		 FROM bookings WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []model.Booking
	for rows.Next() {
		var b model.Booking
		if err := rows.Scan(&b.ID, &b.SlotID, &b.UserID, &b.SeatNum, &b.Status, &b.CreatedAt); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}

	if bookings == nil {
		bookings = []model.Booking{}
	}
	return bookings, nil
}
