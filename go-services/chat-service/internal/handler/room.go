package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/kreativa/chat-service/internal/service"
	"github.com/kreativa/shared/middleware"
)

// RoomHandler handles REST endpoints for room management.
type RoomHandler struct {
	svc *service.RoomService
}

func NewRoomHandler(svc *service.RoomService) *RoomHandler {
	return &RoomHandler{svc: svc}
}

func (h *RoomHandler) ListRooms(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	rooms, err := h.svc.GetUserRooms(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"detail":"Failed to list rooms"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rooms)
}

type createRoomRequest struct {
	Type         string   `json:"type"`
	Name         string   `json:"name"`
	Participants []string `json:"participants"`
	FamilyID     string   `json:"family_id,omitempty"`
	StreamID     string   `json:"stream_id,omitempty"`
}

func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req createRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"detail":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	// Ensure creator is in participants
	hasCreator := false
	for _, p := range req.Participants {
		if p == userID {
			hasCreator = true
			break
		}
	}
	if !hasCreator {
		req.Participants = append(req.Participants, userID)
	}

	// For direct rooms, check if already exists
	if req.Type == "direct" && len(req.Participants) == 2 {
		otherUser := req.Participants[0]
		if otherUser == userID {
			otherUser = req.Participants[1]
		}
		existing, _ := h.svc.FindDirectRoom(r.Context(), userID, otherUser)
		if existing != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(existing)
			return
		}
	}

	room, err := h.svc.CreateRoom(r.Context(), req.Type, req.Name, userID, req.Participants, req.FamilyID, req.StreamID)
	if err != nil {
		http.Error(w, `{"detail":"Failed to create room"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(room)
}

func (h *RoomHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	_ = chi.URLParam(r, "roomID")

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := int64(50)
	offset := int64(0)

	if l, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
		limit = l
	}
	if o, err := strconv.ParseInt(offsetStr, 10, 64); err == nil {
		offset = o
	}

	roomID := chi.URLParam(r, "roomID")

	// Use the message service from hub — for now just return empty
	// In a full implementation, this would query MongoDB
	_ = limit
	_ = offset
	_ = roomID

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}
