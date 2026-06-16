// Package ws — WebSocket hub dengan Redis PubSub untuk horizontal scaling.
//
// Ditingkatkan dengan:
// - Rate limiting per user (token bucket: maks 10 pesan/menit)
// - Sanitasi input pesan (cegah XSS)
// - Channel JoinRoom untuk auto-join dari handler
// - Username tracking pada client
package ws

import (
	"bytes"
	"context"
	"encoding/json"
	"html"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/kreativa/chat-service/internal/model"
	"github.com/kreativa/chat-service/internal/service"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8192

	// Rate limiting: maksimal 10 pesan per menit per user
	rateLimitWindow  = 1 * time.Minute
	rateLimitMaxMsgs = 10
)

// Regex untuk menghapus tag HTML (sanitasi XSS)
var htmlTagRegex = regexp.MustCompile(`<[^>]*>`)

// JoinRequest — permintaan untuk join room (dari handler)
type JoinRequest struct {
	Client *Client
	RoomID string
}

// Hub mengelola semua client aktif dan routing pesan.
type Hub struct {
	// Clients berdasarkan user ID
	Clients map[string]*Client

	// Rooms berdasarkan room ID → set of clients
	Rooms map[string]map[*Client]bool

	Register    chan *Client
	Unregister  chan *Client
	Broadcast   chan RoomMessage
	JoinRoomChan chan JoinRequest

	redis       *redis.Client
	messageSvc  *service.MessageService
	presenceSvc *service.PresenceService
}

type RoomMessage struct {
	RoomID string
	Data   []byte
}

func NewHub(redis *redis.Client, messageSvc *service.MessageService, presenceSvc *service.PresenceService) *Hub {
	return &Hub{
		Clients:      make(map[string]*Client),
		Rooms:        make(map[string]map[*Client]bool),
		Register:     make(chan *Client),
		Unregister:   make(chan *Client),
		Broadcast:    make(chan RoomMessage, 256),
		JoinRoomChan: make(chan JoinRequest, 64),
		redis:        redis,
		messageSvc:   messageSvc,
		presenceSvc:  presenceSvc,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client.UserID] = client
			h.presenceSvc.SetOnline(context.Background(), client.UserID)
			log.Info().
				Str("user_id", client.UserID).
				Str("username", client.Username).
				Msg("Client terhubung")

		case client := <-h.Unregister:
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
				h.presenceSvc.SetOffline(context.Background(), client.UserID)

				// Hapus dari semua room
				for roomID, members := range h.Rooms {
					delete(members, client)
					if len(members) == 0 {
						delete(h.Rooms, roomID)
					}
				}
				log.Info().
					Str("user_id", client.UserID).
					Str("username", client.Username).
					Msg("Client terputus")
			}

		case req := <-h.JoinRoomChan:
			h.JoinRoom(req.Client, req.RoomID)

		case msg := <-h.Broadcast:
			if room, ok := h.Rooms[msg.RoomID]; ok {
				for client := range room {
					select {
					case client.Send <- msg.Data:
					default:
						close(client.Send)
						delete(room, client)
						delete(h.Clients, client.UserID)
					}
				}
			}
		}
	}
}

// JoinRoom — tambahkan client ke room.
func (h *Hub) JoinRoom(client *Client, roomID string) {
	if _, ok := h.Rooms[roomID]; !ok {
		h.Rooms[roomID] = make(map[*Client]bool)
	}
	h.Rooms[roomID][client] = true
	client.Rooms[roomID] = true

	// Kirim konfirmasi join ke client
	response := model.WSMessage{
		Type:   "joined",
		RoomID: roomID,
		Payload: map[string]interface{}{
			"user_id":  client.UserID,
			"username": client.Username,
			"room_id":  roomID,
		},
		Timestamp: time.Now().Unix(),
	}
	data, _ := json.Marshal(response)
	client.Send <- data

	log.Info().
		Str("user_id", client.UserID).
		Str("room_id", roomID).
		Msg("Client bergabung ke room")
}

// sanitizeContent — bersihkan konten pesan dari tag HTML dan karakter berbahaya.
// Ini mencegah serangan XSS saat pesan ditampilkan di frontend.
func sanitizeContent(content string) string {
	// Hapus tag HTML
	content = htmlTagRegex.ReplaceAllString(content, "")
	// Escape karakter HTML yang tersisa
	content = html.EscapeString(content)
	// Trim whitespace berlebih
	content = strings.TrimSpace(content)
	// Batasi panjang
	if len(content) > 2000 {
		content = content[:2000]
	}
	return content
}

// HandleMessage — proses pesan WebSocket masuk dengan rate limiting dan sanitasi.
func (h *Hub) HandleMessage(client *Client, msg model.WSMessage) {
	ctx := context.Background()

	switch msg.Type {
	case "message":
		// --- RATE LIMITING ---
		if !client.CheckRateLimit() {
			// Kirim notifikasi rate limit ke client
			response := model.WSMessage{
				Type:   "rate_limited",
				RoomID: msg.RoomID,
				Payload: map[string]interface{}{
					"message": "Terlalu banyak pesan. Tunggu sebentar sebelum mengirim lagi.",
					"limit":   rateLimitMaxMsgs,
					"window":  "1 menit",
				},
				Timestamp: time.Now().Unix(),
			}
			data, _ := json.Marshal(response)
			client.Send <- data
			log.Warn().
				Str("user_id", client.UserID).
				Int("msg_count", len(client.msgTimestamps)).
				Msg("Rate limit tercapai")
			return
		}

		// --- SANITASI INPUT ---
		content, _ := msg.Payload["content"].(string)
		content = sanitizeContent(content)

		if content == "" {
			return // Abaikan pesan kosong setelah sanitasi
		}

		msgType, _ := msg.Payload["type"].(string)
		if msgType == "" {
			msgType = "text"
		}

		// --- MODERASI KONTEN VIA DJANGO API ---
		// Hanya moderasi pesan bertipe teks
		if msgType == "text" {
			reqBody, _ := json.Marshal(map[string]string{"text": content})
			resp, err := http.Post("http://localhost:8000/api/v1/moderation/check/", "application/json", bytes.NewBuffer(reqBody))
			
			if err == nil && resp.StatusCode == http.StatusBadRequest {
				// Pesan ditolak oleh moderator
				var respData map[string]interface{}
				json.NewDecoder(resp.Body).Decode(&respData)
				reason, _ := respData["reason"].(string)
				if reason == "" {
					reason = "Pesan melanggar standar komunitas."
				}
				
				rejectResp := model.WSMessage{
					Type:   "error",
					RoomID: msg.RoomID,
					Payload: map[string]interface{}{
						"message": reason,
					},
					Timestamp: time.Now().Unix(),
				}
				data, _ := json.Marshal(rejectResp)
				client.Send <- data
				
				log.Warn().
					Str("user_id", client.UserID).
					Str("content", content).
					Msg("Pesan diblokir oleh moderasi AI")
				return
			}
			if resp != nil {
				resp.Body.Close()
			}
		}

		// Ambil username dari payload atau gunakan client.Username
		username, _ := msg.Payload["username"].(string)
		if username == "" {
			username = client.Username
		}
		username = sanitizeContent(username)

		// Simpan ke MongoDB
		chatMsg := &model.ChatMessage{
			RoomID:         msg.RoomID,
			SenderID:       client.UserID,
			SenderUsername: username,
			Type:           msgType,
			Content:        content,
		}

		if mediaURL, ok := msg.Payload["media_url"].(string); ok {
			chatMsg.MediaURL = sanitizeContent(mediaURL)
		}

		h.messageSvc.SaveMessage(ctx, chatMsg)

		// Broadcast ke room
		response := model.WSMessage{
			Type:   "message",
			RoomID: msg.RoomID,
			Payload: map[string]interface{}{
				"id":         chatMsg.ID,
				"sender_id":  client.UserID,
				"username":   username,
				"type":       msgType,
				"content":    content,
				"created_at": chatMsg.CreatedAt.Format(time.RFC3339),
			},
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(response)
		h.Broadcast <- RoomMessage{RoomID: msg.RoomID, Data: data}

	case "typing":
		response := model.WSMessage{
			Type:   "typing",
			RoomID: msg.RoomID,
			Payload: map[string]interface{}{
				"user_id":  client.UserID,
				"username": client.Username,
				"typing":   true,
			},
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(response)
		h.Broadcast <- RoomMessage{RoomID: msg.RoomID, Data: data}

	case "read":
		response := model.WSMessage{
			Type:   "read",
			RoomID: msg.RoomID,
			Payload: map[string]interface{}{
				"user_id":    client.UserID,
				"message_id": msg.Payload["message_id"],
			},
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(response)
		h.Broadcast <- RoomMessage{RoomID: msg.RoomID, Data: data}

	case "gift":
		giftType, _ := msg.Payload["gift_type"].(string)
		amount, _ := msg.Payload["amount"].(float64)
		animation, _ := msg.Payload["animation"].(string)

		chatMsg := &model.ChatMessage{
			RoomID:         msg.RoomID,
			SenderID:       client.UserID,
			SenderUsername: client.Username,
			Type:           "gift",
			Content:        "",
			Gift: &model.GiftData{
				Type:      sanitizeContent(giftType),
				Amount:    amount,
				Animation: sanitizeContent(animation),
			},
		}
		h.messageSvc.SaveMessage(ctx, chatMsg)

		response := model.WSMessage{
			Type:   "gift",
			RoomID: msg.RoomID,
			Payload: map[string]interface{}{
				"sender_id":  client.UserID,
				"username":   client.Username,
				"gift_type":  giftType,
				"amount":     amount,
				"animation":  animation,
				"created_at": chatMsg.CreatedAt.Format(time.RFC3339),
			},
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(response)
		h.Broadcast <- RoomMessage{RoomID: msg.RoomID, Data: data}

	case "join":
		h.JoinRoom(client, msg.RoomID)

	case "presence":
		h.presenceSvc.Heartbeat(ctx, client.UserID)
	}
}

// SubscribeNotifications — dengarkan Redis PubSub dari Django.
func (h *Hub) SubscribeNotifications(ctx context.Context) {
	pubsub := h.redis.PSubscribe(ctx, "notification:*", "family:*")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		log.Debug().
			Str("channel", msg.Channel).
			Str("payload", msg.Payload).
			Msg("Notifikasi Redis diterima")

		var event map[string]interface{}
		if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
			continue
		}

		wsMsg := model.WSMessage{
			Type: "notification",
			Payload: map[string]interface{}{
				"channel": msg.Channel,
				"data":    event,
			},
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(wsMsg)

		for _, client := range h.Clients {
			select {
			case client.Send <- data:
			default:
			}
		}
	}
}

// ===== CLIENT =====

// Client merepresentasikan koneksi WebSocket.
type Client struct {
	Conn     *websocket.Conn
	UserID   string
	Username string // Username dari JWT claims
	Hub      *Hub
	Send     chan []byte
	Rooms    map[string]bool

	// Rate limiting — sliding window
	msgTimestamps []time.Time
	rateMu        sync.Mutex
}

func NewClient(conn *websocket.Conn, userID, username string, hub *Hub) *Client {
	return &Client{
		Conn:          conn,
		UserID:        userID,
		Username:      username,
		Hub:           hub,
		Send:          make(chan []byte, 256),
		Rooms:         make(map[string]bool),
		msgTimestamps: make([]time.Time, 0),
	}
}

// CheckRateLimit — cek apakah user masih dalam batas rate limit.
// Menggunakan sliding window: maks 10 pesan per menit.
func (c *Client) CheckRateLimit() bool {
	c.rateMu.Lock()
	defer c.rateMu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rateLimitWindow)

	// Hapus timestamp yang sudah di luar window
	validTimestamps := make([]time.Time, 0, len(c.msgTimestamps))
	for _, ts := range c.msgTimestamps {
		if ts.After(windowStart) {
			validTimestamps = append(validTimestamps, ts)
		}
	}
	c.msgTimestamps = validTimestamps

	// Cek apakah masih dalam limit
	if len(c.msgTimestamps) >= rateLimitMaxMsgs {
		return false
	}

	// Tambahkan timestamp baru
	c.msgTimestamps = append(c.msgTimestamps, now)
	return true
}

func (c *Client) ReadPump() {
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
				log.Error().Err(err).Msg("Error baca WebSocket")
			}
			break
		}

		var msg model.WSMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Error().Err(err).Msg("Gagal parse pesan")
			continue
		}
		msg.Timestamp = time.Now().Unix()

		c.Hub.HandleMessage(c, msg)
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

