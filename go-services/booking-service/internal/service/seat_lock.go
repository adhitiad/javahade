package service

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

// SeatLockService handles real-time seat locking via Redis distributed locks.
type SeatLockService struct {
	redis *redis.Client
}

func NewSeatLockService(redis *redis.Client) *SeatLockService {
	return &SeatLockService{redis: redis}
}

// LockSeat attempts to lock a seat for a user using Redis SETNX.
func (s *SeatLockService) LockSeat(ctx context.Context, slotID, seatNum, userID string) (bool, error) {
	key := fmt.Sprintf("seat_lock:%s:%s", slotID, seatNum)
	ttl := 5 * time.Minute // Lock expires after 5 minutes

	ok, err := s.redis.SetNX(ctx, key, userID, ttl).Result()
	if err != nil {
		return false, fmt.Errorf("failed to lock seat: %w", err)
	}

	if ok {
		log.Info().
			Str("slot_id", slotID).
			Str("seat", seatNum).
			Str("user_id", userID).
			Msg("Seat locked")
	}

	return ok, nil
}

// UnlockSeat releases a seat lock.
func (s *SeatLockService) UnlockSeat(ctx context.Context, slotID, seatNum, userID string) (bool, error) {
	key := fmt.Sprintf("seat_lock:%s:%s", slotID, seatNum)

	// Only unlock if the current user holds the lock
	currentHolder, err := s.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return true, nil // Already unlocked
	}
	if err != nil {
		return false, err
	}

	if currentHolder != userID {
		return false, fmt.Errorf("seat locked by another user")
	}

	s.redis.Del(ctx, key)
	log.Info().Str("slot_id", slotID).Str("seat", seatNum).Msg("Seat unlocked")
	return true, nil
}

// GetSeatStatus returns the lock status of all seats for a slot.
func (s *SeatLockService) GetSeatStatus(ctx context.Context, slotID string, maxSeats int) (map[string]string, error) {
	status := make(map[string]string)

	for i := 1; i <= maxSeats; i++ {
		key := fmt.Sprintf("seat_lock:%s:%d", slotID, i)
		holder, err := s.redis.Get(ctx, key).Result()
		if err == redis.Nil {
			status[fmt.Sprintf("%d", i)] = "available"
		} else if err != nil {
			return nil, err
		} else {
			status[fmt.Sprintf("%d", i)] = "locked:" + holder
		}
	}

	return status, nil
}

