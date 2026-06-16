// Package ws implements WebSocket hub for the stream service.
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

type Message struct {
	Type      string                 `json:"type"`
	RoomID    string                 `json:"room_id"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp int64                  `json:"timestamp"`
}

type BroadcastMessage struct {
	RoomID string
	Data   []byte
}

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
		Broadcast:  make(chan BroadcastMessage, 256),
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

type Client struct {
	Conn     *websocket.Conn
	UserID   string
	Username string
	RoomID   string
	Hub      *Hub
	Send     chan []byte
	Done     chan struct{}
}

func NewClient(conn *websocket.Conn, userID, roomID string, hub *Hub) *Client {
	return &Client{
		Conn:   conn,
		UserID: userID,
		RoomID: roomID,
		Hub:    hub,
		Send:   make(chan []byte, 256),
		Done:   make(chan struct{}),
	}
}

func (c *Client) ReadPump(handler func(msg Message)) {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
		close(c.Done)
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
			c.Conn.WriteMessage(websocket.TextMessage, message)

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
