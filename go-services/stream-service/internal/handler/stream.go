// Package handler implements stream HTTP handlers.
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/kreativa/shared/middleware"
	"github.com/kreativa/stream-service/internal/model"
	"github.com/kreativa/stream-service/internal/service"
)

type StreamHandler struct {
	svc *service.StreamService
}

func NewStreamHandler(svc *service.StreamService) *StreamHandler {
	return &StreamHandler{svc: svc}
}

func (h *StreamHandler) CreateStream(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req model.CreateStreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"detail":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	stream, err := h.svc.CreateStream(r.Context(), userID, req)
	if err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(stream)
}

func (h *StreamHandler) GetStream(w http.ResponseWriter, r *http.Request) {
	streamID := chi.URLParam(r, "id")

	stream, err := h.svc.GetStream(r.Context(), streamID)
	if err != nil {
		http.Error(w, `{"detail":"Stream not found"}`, http.StatusNotFound)
		return
	}

	// Don't expose stream key to non-owners
	userID := middleware.GetUserID(r.Context())
	if stream.CreatorID != userID {
		stream.StreamKey = ""
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stream)
}

func (h *StreamHandler) StopStream(w http.ResponseWriter, r *http.Request) {
	streamID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	if err := h.svc.StopStream(r.Context(), streamID, userID); err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ended"})
}

func (h *StreamHandler) ListLiveStreams(w http.ResponseWriter, r *http.Request) {
	streams, err := h.svc.ListLiveStreams(r.Context())
	if err != nil {
		http.Error(w, `{"detail":"Failed to list streams"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(streams)
}
