package service

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// PresenceService tracks user online/offline status via Redis sorted sets.
type PresenceService struct {
	redis *redis.Client
}

func NewPresenceService(redis *redis.Client) *PresenceService {
	return &PresenceService{redis: redis}
}

// SetOnline marks a user as online.
func (s *PresenceService) SetOnline(ctx context.Context, userID string) error {
	key := "presence:online"
	return s.redis.ZAdd(ctx, key, redis.Z{
		Score:  float64(time.Now().Unix()),
		Member: userID,
	}).Err()
}

// SetOffline marks a user as offline.
func (s *PresenceService) SetOffline(ctx context.Context, userID string) error {
	return s.redis.ZRem(ctx, "presence:online", userID).Err()
}

// IsOnline checks if a user is online (activity within last 5 minutes).
func (s *PresenceService) IsOnline(ctx context.Context, userID string) (bool, error) {
	score, err := s.redis.ZScore(ctx, "presence:online", userID).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	lastSeen := time.Unix(int64(score), 0)
	return time.Since(lastSeen) < 5*time.Minute, nil
}

// GetOnlineUsers returns list of online user IDs.
func (s *PresenceService) GetOnlineUsers(ctx context.Context) ([]string, error) {
	cutoff := float64(time.Now().Add(-5 * time.Minute).Unix())
	now := float64(time.Now().Unix())

	results, err := s.redis.ZRangeByScore(ctx, "presence:online", &redis.ZRangeBy{
		Min: fmt.Sprintf("%f", cutoff),
		Max: fmt.Sprintf("%f", now),
	}).Result()
	if err != nil {
		return nil, err
	}
	return results, nil
}

// Heartbeat updates user's last activity timestamp.
func (s *PresenceService) Heartbeat(ctx context.Context, userID string) error {
	return s.SetOnline(ctx, userID)
}
