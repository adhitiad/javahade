package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"

	"github.com/kreativa/booking-service/internal/ws"
	sharedMW "github.com/adhitiad/javahade/shared/middleware"
	wsUpgrader "github.com/adhitiad/javahade/shared/ws"
)

// StreamSignalHandler handles WebSocket connections for stream signaling.
type StreamSignalHandler struct {
	hub *ws.Hub
}

func NewStreamSignalHandler(hub *ws.Hub) *StreamSignalHandler {
	return &StreamSignalHandler{hub: hub}
}

func (h *StreamSignalHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	streamID := chi.URLParam(r, "streamID")
	userID := sharedMW.GetUserID(r.Context())
	userRole, _ := r.Context().Value(sharedMW.RoleKey).(string)

	conn, err := wsUpgrader.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("WebSocket upgrade failed")
		return
	}

	client := ws.NewClient(conn, userID, streamID, h.hub)
	h.hub.Register <- client

	go client.WritePump()
	go client.ReadPump(func(msg ws.Message) {
		// Broadcast stream signals to all viewers
		switch msg.Type {
		case "stream_start", "stream_stop", "stream_metadata_update", "webrtc_offer":
			if userRole != "host" && userRole != "admin" {
				log.Warn().Str("user_id", userID).Str("role", userRole).Msg("Privilege Escalation attempt: non-host tried to send host-only signal")
				return // Block the message
			}
			fallthrough // Proceed to broadcast
		case "webrtc_answer", "webrtc_ice_candidate":
			msg.RoomID = streamID
			data, _ := json.Marshal(msg)
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: data}

		case "viewer_join":
			response := ws.Message{
				Type:   "viewer_joined",
				RoomID: streamID,
				Payload: map[string]interface{}{
					"user_id": userID,
				},
			}
			data, _ := json.Marshal(response)
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: data}
		}
	})
}

