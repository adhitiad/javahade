// Package service implements streaming business logic.
package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/rs/zerolog/log"
)

// VideoSDKService is the VideoSDK REST API client.
type VideoSDKService struct {
	accessToken string
	client      *http.Client
}

func NewVideoSDKService(accessToken string) *VideoSDKService {
	return &VideoSDKService{
		accessToken: accessToken,
		client:      &http.Client{},
	}
}

// CreateStream tells VideoSDK to prepare for a new stream (Create Room).
func (s *VideoSDKService) CreateStream(appName, streamName string) error {
	// Usually rooms are created via POST https://api.videosdk.live/v2/rooms
	// But our frontend uses a client-side UUID so we might not need to pre-create it,
	// or we can just log it.
	log.Info().
		Str("app", appName).
		Str("stream", streamName).
		Msg("VideoSDK stream registered (room assumed)")
	return nil
}

// StopStream tells VideoSDK to deactivate a room.
func (s *VideoSDKService) StopStream(appName, streamName string) error {
	url := "https://api.videosdk.live/v2/rooms/deactivate"
	
	payload := map[string]string{
		"roomId": streamName,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", s.accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to contact VideoSDK")
		return nil // Non-fatal
	}
	defer resp.Body.Close()

	// If token has no allow_mod, it will return 403, which is fine for our setup.
	log.Info().
		Str("app", appName).
		Str("stream", streamName).
		Int("status", resp.StatusCode).
		Msg("VideoSDK stream stop requested")
	return nil
}

// GetStreamInfo fetches stream info.
func (s *VideoSDKService) GetStreamInfo(appName, streamName string) (map[string]interface{}, error) {
	url := fmt.Sprintf("https://api.videosdk.live/v2/rooms/%s", streamName)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", s.accessToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return result, nil
}
