// Package ws implements WebSocket hub pattern for the booking service.
package ws

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
)

// Message is the standard WebSocket message format.
type Message struct {
	Type      string                 `json:"type"`
	RoomID    string                 `json:"room_id"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp int64                  `json:"timestamp"`
}

// BroadcastMessage wraps data to broadcast to a specific room.
type BroadcastMessage struct {
	RoomID string
	Data   []byte
}

// Hub maintains active clients and broadcasts messages to rooms.
type Hub struct {
	Rooms      map[string]map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan BroadcastMessage
}

func NewHub() *Hub {
	return &Hub{
		Rooms:      make(map[string]map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan BroadcastMessage),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			if _, ok := h.Rooms[client.RoomID]; !ok {
				h.Rooms[client.RoomID] = make(map[*Client]bool)
			}
			h.Rooms[client.RoomID][client] = true
			log.Info().
				Str("room", client.RoomID).
				Str("user", client.UserID).
				Int("room_size", len(h.Rooms[client.RoomID])).
				Msg("Client joined room")

		case client := <-h.Unregister:
			if room, ok := h.Rooms[client.RoomID]; ok {
				if _, ok := room[client]; ok {
					delete(room, client)
					close(client.Send)
					if len(room) == 0 {
						delete(h.Rooms, client.RoomID)
					}
				}
			}

		case msg := <-h.Broadcast:
			if room, ok := h.Rooms[msg.RoomID]; ok {
				for client := range room {
					select {
					case client.Send <- msg.Data:
					default:
						close(client.Send)
						delete(room, client)
					}
				}
			}
		}
	}
}

// Client represents a single WebSocket connection.
type Client struct {
	Conn   *websocket.Conn
	UserID string
	RoomID string
	Hub    *Hub
	Send   chan []byte
}

func NewClient(conn *websocket.Conn, userID, roomID string, hub *Hub) *Client {
	return &Client{
		Conn:   conn,
		UserID: userID,
		RoomID: roomID,
		Hub:    hub,
		Send:   make(chan []byte, 256),
	}
}

func (c *Client) ReadPump(handler func(msg Message)) {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, data, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Error().Err(err).Msg("WebSocket read error")
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Error().Err(err).Msg("Failed to parse WebSocket message")
			continue
		}
		msg.Timestamp = time.Now().Unix()

		handler(msg)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
