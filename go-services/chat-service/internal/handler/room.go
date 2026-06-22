package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/adhitiad/javahade/shared/middleware"
	"github.com/kreativa/chat-service/internal/service"
)

// RoomHandler handles REST endpoints for room management.
type RoomHandler struct {
	svc    *service.RoomService
	msgSvc *service.MessageService
}

func NewRoomHandler(svc *service.RoomService, msgSvc *service.MessageService) *RoomHandler {
	return &RoomHandler{svc: svc, msgSvc: msgSvc}
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
	roomID := chi.URLParam(r, "roomID")

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

	messages, err := h.msgSvc.GetMessages(r.Context(), roomID, limit, offset)
	if err != nil {
		http.Error(w, `{"detail":"Failed to get messages"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// ListConversations returns DM conversations with last message preview.
func (h *RoomHandler) ListConversations(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	conversations, err := h.svc.GetConversations(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"detail":"Failed to list conversations"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversations)
}
