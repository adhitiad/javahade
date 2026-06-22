package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/kreativa/stream-service/internal/model"
)

// StreamService handles stream lifecycle.
type StreamService struct {
	redis *redis.Client
	videosdk *VideoSDKService
}

func NewStreamService(redis *redis.Client, videosdk *VideoSDKService) *StreamService {
	return &StreamService{redis: redis, videosdk: videosdk}
}

// CreateStream creates a new live stream session.
func (s *StreamService) CreateStream(ctx context.Context, creatorID string, req model.CreateStreamRequest) (*model.Stream, error) {
	streamID := uuid.New().String()
	
	// Generate cryptographically secure stream key
	keyBytes := make([]byte, 16)
	if _, err := rand.Read(keyBytes); err != nil {
		return nil, fmt.Errorf("failed to generate stream key: %w", err)
	}
	streamKey := hex.EncodeToString(keyBytes)

	rtmpHost := os.Getenv("RTMP_HOST")
	if rtmpHost == "" {
		rtmpHost = "localhost:1935"
	}
	wsHost := os.Getenv("WS_HOST")
	if wsHost == "" {
		wsHost = "localhost:3334"
	}

	stream := &model.Stream{
		ID:          streamID,
		CreatorID:   creatorID,
		Title:       req.Title,
		Description: req.Description,
		StreamKey:   streamKey,
		IngestURL:   fmt.Sprintf("rtmp://%s/live/%s", rtmpHost, streamKey),
		PlaybackURL: fmt.Sprintf("wss://%s/live/%s", wsHost, streamKey),
		Status:      "live",
		ViewerCount: 0,
		PeakViewers: 0,
		StartedAt:   time.Now(),
		CreatedAt:   time.Now(),
	}

	// Register with VideoSDK
	s.videosdk.CreateStream("live", streamID)

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

	// Stop on VideoSDK
	s.videosdk.StopStream("live", stream.ID)

	// Update Redis
	data, _ := json.Marshal(stream)
	s.redis.Set(ctx, fmt.Sprintf("stream:%s", streamID), string(data), 24*time.Hour)
	s.redis.SRem(ctx, "streams:live", streamID)

	log.Info().Str("stream_id", streamID).Msg("Stream stopped")
	return nil
}

// ListLiveStreams returns all currently live streams (Optimized with Redis Pipeline).
func (s *StreamService) ListLiveStreams(ctx context.Context) ([]*model.Stream, error) {
	dbCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	streamIDs, err := s.redis.SMembers(dbCtx, "streams:live").Result()
	if err != nil {
		return nil, err
	}
	if len(streamIDs) == 0 {
		return []*model.Stream{}, nil
	}

	pipe := s.redis.Pipeline()
	var metadataCmds []*redis.StringCmd
	var viewerCmds []*redis.StringCmd

	for _, id := range streamIDs {
		metadataCmds = append(metadataCmds, pipe.Get(dbCtx, fmt.Sprintf("stream:%s", id)))
		viewerCmds = append(viewerCmds, pipe.Get(dbCtx, fmt.Sprintf("stream:%s:viewers", id)))
	}

	// Eksekusi semua command dalam 1 network roundtrip
	_, _ = pipe.Exec(dbCtx)

	var streams []*model.Stream
	for i := range streamIDs {
		data, err := metadataCmds[i].Result()
		if err != nil {
			continue // skip broken stream
		}
		
		var stream model.Stream
		if err := json.Unmarshal([]byte(data), &stream); err == nil {
			count, _ := viewerCmds[i].Int()
			stream.ViewerCount = count
			stream.StreamKey = "" // Jangan expose stream key ke publik
			streams = append(streams, &stream)
		}
	}

	if streams == nil {
		streams = []*model.Stream{}
	}
	return streams, nil
}

// IncrementViewers increments the viewer count for a stream.
func (s *StreamService) IncrementViewers(ctx context.Context, streamID string) (int64, error) {
	stream, err := s.GetStream(ctx, streamID)
	if err != nil {
		return 0, err
	}

	key := fmt.Sprintf("stream:%s:viewers", streamID)
	count, err := s.redis.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}

	// Limit check
	if stream.MaxViewers > 0 && count > int64(stream.MaxViewers) {
		s.redis.Decr(ctx, key)
		return 0, fmt.Errorf("stream viewer limit reached")
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

