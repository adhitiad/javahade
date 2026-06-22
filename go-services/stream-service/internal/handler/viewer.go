package handler

import (
	"bytes"
	"encoding/json"
	"html"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	sharedMW "github.com/adhitiad/javahade/shared/middleware"
	wsUpgrader "github.com/adhitiad/javahade/shared/ws"
	"github.com/kreativa/stream-service/internal/ws"
)

var htmlTagRegex = regexp.MustCompile(`<[^>]*>`)

// ViewerHandler handles WebSocket connections for stream interactions.
type ViewerHandler struct {
	hub    *ws.Hub
	redis  *redis.Client
	modURL string
}

func NewViewerHandler(hub *ws.Hub, redis *redis.Client, modURL string) *ViewerHandler {
	return &ViewerHandler{hub: hub, redis: redis, modURL: modURL}
}

// sanitize membersihkan konten dari tag HTML dan karakter berbahaya.
func sanitize(s string) string {
	s = htmlTagRegex.ReplaceAllString(s, "")
	s = html.EscapeString(s)
	s = strings.TrimSpace(s)
	if len(s) > 500 {
		s = s[:500]
	}
	return s
}

// checkModeration mengirim teks ke Django AI Moderation endpoint.
// Mengembalikan (lolos, alasan).
func (h *ViewerHandler) checkModeration(text string) (bool, string) {
	reqBody, _ := json.Marshal(map[string]string{"text": text})
	resp, err := http.Post(h.modURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		// Jika service down, izinkan pesan lewat (fail-open)
		return true, ""
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusBadRequest {
		var data map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&data)
		reason, _ := data["reason"].(string)
		if reason == "" {
			reason = "Pesan melanggar standar komunitas."
		}
		return false, reason
	}
	return true, ""
}

func (h *ViewerHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	streamID := chi.URLParam(r, "id")
	userID := sharedMW.GetUserID(r.Context())
	username := r.URL.Query().Get("username")
	if username == "" {
		username = "Anon"
	}

	conn, err := wsUpgrader.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("WebSocket upgrade failed")
		return
	}

	client := ws.NewClient(conn, userID, streamID, h.hub)
	client.Username = sanitize(username)
	h.hub.Register <- client

	// Increment viewer count
	h.redis.Incr(r.Context(), "stream:"+streamID+":viewers")
	viewerCount := h.getViewerCount(r, streamID)

	// Broadcast viewer joined
	joinMsg, _ := json.Marshal(map[string]interface{}{
		"type":    "viewer_joined",
		"room_id": streamID,
		"payload": map[string]interface{}{
			"user_id":      userID,
			"username":     client.Username,
			"viewer_count": viewerCount,
		},
		"timestamp": time.Now().Unix(),
	})
	h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: joinMsg}

	go client.WritePump()
	go client.ReadPump(func(msg ws.Message) {
		switch msg.Type {

		// ── LIVE CHAT (Komentar) ──────────────────────────────────
		case "comment":
			content, _ := msg.Payload["content"].(string)
			content = sanitize(content)
			if content == "" {
				return
			}

			// Moderasi konten via Django AI
			if ok, reason := h.checkModeration(content); !ok {
				errResp, _ := json.Marshal(map[string]interface{}{
					"type":    "error",
					"room_id": streamID,
					"payload": map[string]interface{}{
						"message": reason,
					},
					"timestamp": time.Now().Unix(),
				})
				client.Send <- errResp

				log.Warn().
					Str("user_id", userID).
					Str("content", content).
					Msg("Live chat diblokir oleh moderasi AI")
				return
			}

			data, _ := json.Marshal(map[string]interface{}{
				"type":    "comment",
				"room_id": streamID,
				"payload": map[string]interface{}{
					"user_id":  userID,
					"username": client.Username,
					"content":  content,
				},
				"timestamp": time.Now().Unix(),
			})
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: data}

		// ── REAKSI (Like/Emote) ──────────────────────────────────
		case "reaction":
			reaction, _ := msg.Payload["reaction"].(string)
			if reaction == "" {
				return
			}
			data, _ := json.Marshal(map[string]interface{}{
				"type":    "reaction",
				"room_id": streamID,
				"payload": map[string]interface{}{
					"user_id":  userID,
					"username": client.Username,
					"reaction": reaction,
				},
				"timestamp": time.Now().Unix(),
			})
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: data}

		// ── GIFT ─────────────────────────────────────────────────
		case "gift":
			data, _ := json.Marshal(map[string]interface{}{
				"type":    "gift",
				"room_id": streamID,
				"payload": map[string]interface{}{
					"user_id":      userID,
					"username":     client.Username,
					"gift_type":    msg.Payload["gift_type"],
					"sticker_pack": msg.Payload["sticker_pack"],
					"sticker_name": msg.Payload["sticker_name"],
					"sticker_url":  msg.Payload["sticker_url"],
					"amount":       msg.Payload["amount"],
					"animation":    msg.Payload["animation"],
				},
				"timestamp": time.Now().Unix(),
			})
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: data}

		// ── POLL ─────────────────────────────────────────────────
		case "poll":
			data, _ := json.Marshal(msg)
			h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: data}
		}
	})

	// Cleanup saat client disconnect: sudah di-handle oleh ReadPump defer
	// Tapi kita perlu decrement viewer count
	go func() {
		// Tunggu sampai ReadPump selesai (client.Send ditutup oleh Hub)
		<-client.Done
		h.redis.Decr(r.Context(), "stream:"+streamID+":viewers")

		leftMsg, _ := json.Marshal(map[string]interface{}{
			"type":    "viewer_left",
			"room_id": streamID,
			"payload": map[string]interface{}{
				"user_id":      userID,
				"viewer_count": h.getViewerCount(r, streamID),
			},
			"timestamp": time.Now().Unix(),
		})
		h.hub.Broadcast <- ws.BroadcastMessage{RoomID: streamID, Data: leftMsg}
	}()
}

func (h *ViewerHandler) getViewerCount(r *http.Request, streamID string) int64 {
	count, _ := h.redis.Get(r.Context(), "stream:"+streamID+":viewers").Int64()
	return count
}

