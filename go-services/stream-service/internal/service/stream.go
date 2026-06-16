package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/kreativa/stream-service/internal/model"
)

// StreamService handles stream lifecycle.
type StreamService struct {
	redis *redis.Client
	ome   *OMEService
}

func NewStreamService(redis *redis.Client, ome *OMEService) *StreamService {
	return &StreamService{redis: redis, ome: ome}
}

// CreateStream creates a new live stream session.
func (s *StreamService) CreateStream(ctx context.Context, creatorID string, req model.CreateStreamRequest) (*model.Stream, error) {
	streamID := uuid.New().String()
	streamKey := uuid.New().String()[:16]

	stream := &model.Stream{
		ID:          streamID,
		CreatorID:   creatorID,
		Title:       req.Title,
		Description: req.Description,
		StreamKey:   streamKey,
		IngestURL:   fmt.Sprintf("rtmp://localhost:1935/live/%s", streamKey),
		PlaybackURL: fmt.Sprintf("wss://localhost:3334/live/%s", streamKey),
		Status:      "live",
		ViewerCount: 0,
		PeakViewers: 0,
		StartedAt:   time.Now(),
		CreatedAt:   time.Now(),
	}

	// Register with OME
	s.ome.CreateStream("live", streamKey)

	// Store stream metadata in Redis
	data, _ := json.Marshal(stream)
	s.redis.Set(ctx, fmt.Sprintf("stream:%s", streamID), string(data), 24*time.Hour)
	s.redis.SAdd(ctx, "streams:live", streamID)

	log.Info().Str("stream_id", streamID).Str("creator", creatorID).Msg("Stream created")
	return stream, nil
}

// GetStream retrieves stream metadata from Redis.
func (s *StreamService) GetStream(ctx context.Context, streamID string) (*model.Stream, error) {
	data, err := s.redis.Get(ctx, fmt.Sprintf("stream:%s", streamID)).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("stream not found")
	}
	if err != nil {
		return nil, err
	}

	var stream model.Stream
	json.Unmarshal([]byte(data), &stream)

	// Get live viewer count
	count, _ := s.redis.Get(ctx, fmt.Sprintf("stream:%s:viewers", streamID)).Int()
	stream.ViewerCount = count

	return &stream, nil
}

// StopStream stops a live stream.
func (s *StreamService) StopStream(ctx context.Context, streamID, creatorID string) error {
	stream, err := s.GetStream(ctx, streamID)
	if err != nil {
		return err
	}

	if stream.CreatorID != creatorID {
		return fmt.Errorf("not the stream owner")
	}

	now := time.Now()
	stream.Status = "ended"
	stream.EndedAt = &now

	// Stop on OME
	s.ome.StopStream("live", stream.StreamKey)

	// Update Redis
	data, _ := json.Marshal(stream)
	s.redis.Set(ctx, fmt.Sprintf("stream:%s", streamID), string(data), 24*time.Hour)
	s.redis.SRem(ctx, "streams:live", streamID)

	log.Info().Str("stream_id", streamID).Msg("Stream stopped")
	return nil
}

// ListLiveStreams returns all currently live streams.
func (s *StreamService) ListLiveStreams(ctx context.Context) ([]*model.Stream, error) {
	streamIDs, err := s.redis.SMembers(ctx, "streams:live").Result()
	if err != nil {
		return nil, err
	}

	var streams []*model.Stream
	for _, id := range streamIDs {
		stream, err := s.GetStream(ctx, id)
		if err == nil {
			// Don't expose stream key to viewers
			stream.StreamKey = ""
			streams = append(streams, stream)
		}
	}

	if streams == nil {
		streams = []*model.Stream{}
	}
	return streams, nil
}

// IncrementViewers increments the viewer count for a stream.
func (s *StreamService) IncrementViewers(ctx context.Context, streamID string) (int64, error) {
	key := fmt.Sprintf("stream:%s:viewers", streamID)
	count, err := s.redis.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}

	// Track peak
	peakKey := fmt.Sprintf("stream:%s:peak", streamID)
	s.redis.Set(ctx, peakKey, count, 24*time.Hour)

	return count, nil
}

// DecrementViewers decrements the viewer count for a stream.
func (s *StreamService) DecrementViewers(ctx context.Context, streamID string) (int64, error) {
	key := fmt.Sprintf("stream:%s:viewers", streamID)
	count, err := s.redis.Decr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	if count < 0 {
		s.redis.Set(ctx, key, 0, 24*time.Hour)
		return 0, nil
	}
	return count, nil
}
