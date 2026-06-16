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

// OMEService is the OvenMediaEngine REST API client.
type OMEService struct {
	baseURL     string
	accessToken string
	client      *http.Client
}

func NewOMEService(baseURL, accessToken string) *OMEService {
	return &OMEService{
		baseURL:     baseURL,
		accessToken: accessToken,
		client:      &http.Client{},
	}
}

// CreateStream tells OME to prepare for a new stream.
func (s *OMEService) CreateStream(appName, streamName string) error {
	// OME auto-creates streams on ingest, so this is mostly for validation
	log.Info().
		Str("app", appName).
		Str("stream", streamName).
		Msg("OME stream registered")
	return nil
}

// StopStream tells OME to stop a stream.
func (s *OMEService) StopStream(appName, streamName string) error {
	url := fmt.Sprintf("%s/vhosts/default/apps/%s/streams/%s", s.baseURL, appName, streamName)

	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.accessToken)

	resp, err := s.client.Do(req)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to contact OME (might not be running)")
		return nil // Non-fatal — OME might not be configured
	}
	defer resp.Body.Close()

	log.Info().
		Str("app", appName).
		Str("stream", streamName).
		Int("status", resp.StatusCode).
		Msg("OME stream stopped")
	return nil
}

// GetStreamInfo fetches stream info from OME.
func (s *OMEService) GetStreamInfo(appName, streamName string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/vhosts/default/apps/%s/streams/%s", s.baseURL, appName, streamName)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.accessToken)

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

// omeRequest is a helper for making requests to OME API.
func (s *OMEService) omeRequest(method, path string, body interface{}) (*http.Response, error) {
	var reqBody io.Reader
	if body != nil {
		data, _ := json.Marshal(body)
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, s.baseURL+path, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if s.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.accessToken)
	}

	return s.client.Do(req)
}

