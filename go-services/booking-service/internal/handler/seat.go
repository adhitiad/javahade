package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"

	"github.com/kreativa/booking-service/internal/service"
	"github.com/kreativa/booking-service/internal/ws"
	sharedWS "github.com/adhitiad/javahade/shared/middleware"
	wsUpgrader "github.com/adhitiad/javahade/shared/ws"
)

// SeatHandler handles WebSocket connections for seat locking.
type SeatHandler struct {
	svc *service.SeatLockService
	hub *ws.Hub
}

func NewSeatHandler(svc *service.SeatLockService, hub *ws.Hub) *SeatHandler {
	return &SeatHandler{svc: svc, hub: hub}
}

// HandleWebSocket handles seat locking WebSocket connections.
func (h *SeatHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	slotID := chi.URLParam(r, "slotID")
	userID := sharedWS.GetUserID(r.Context())

	conn, err := wsUpgrader.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("WebSocket upgrade failed")
		return
	}

	client := ws.NewClient(conn, userID, slotID, h.hub)
	h.hub.Register <- client

	go client.WritePump()
	go client.ReadPump(func(msg ws.Message) {
		switch msg.Type {
		case "seat_lock":
			seatNum, _ := msg.Payload["seat_num"].(string)
			ok, err := h.svc.LockSeat(r.Context(), slotID, seatNum, userID)
			response := ws.Message{
				Type:   "seat_lock_response",
				RoomID: slotID,
				Payload: map[string]interface{}{
					"seat_num": seatNum,
					"locked":   ok,
				},
			}
			if err != nil {
				response.Payload["error"] = err.Error()
			}

			// Broadcast to all clients in the slot room
			data, _ := json.Marshal(response)
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: slotID, Data: data}

		case "seat_unlock":
			seatNum, _ := msg.Payload["seat_num"].(string)
			h.svc.UnlockSeat(r.Context(), slotID, seatNum, userID)

			response := ws.Message{
				Type:   "seat_unlock_response",
				RoomID: slotID,
				Payload: map[string]interface{}{
					"seat_num": seatNum,
					"unlocked": true,
				},
			}
			data, _ := json.Marshal(response)
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: slotID, Data: data}

		case "seat_status":
			maxSeats := 10 // TODO: get from slot
			status, _ := h.svc.GetSeatStatus(r.Context(), slotID, maxSeats)
			response := ws.Message{
				Type:   "seat_status_response",
				RoomID: slotID,
				Payload: map[string]interface{}{
					"seats": status,
				},
			}
			data, _ := json.Marshal(response)
			client.Send <- data
		}
	})
}

