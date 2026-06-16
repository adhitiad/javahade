// Package model defines streaming domain models.
package model

import "time"

// Stream represents a live stream session.
type Stream struct {
	ID           string    `json:"id"`
	CreatorID    string    `json:"creator_id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	StreamKey    string    `json:"stream_key,omitempty"`
	IngestURL    string    `json:"ingest_url,omitempty"`
	PlaybackURL  string    `json:"playback_url,omitempty"`
	ThumbnailURL string    `json:"thumbnail_url,omitempty"`
	Status       string    `json:"status"` // live, ended, scheduled
	ViewerCount  int       `json:"viewer_count"`
	PeakViewers  int       `json:"peak_viewers"`
	GiftsTotal   float64   `json:"gifts_total"`
	StartedAt    time.Time `json:"started_at"`
	EndedAt      *time.Time `json:"ended_at,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// CreateStreamRequest is the request body.
type CreateStreamRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}
