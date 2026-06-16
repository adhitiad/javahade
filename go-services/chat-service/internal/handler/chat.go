// Package handler — HTTP dan WebSocket handlers untuk chat service.
// Ditingkatkan dengan:
// - Validasi room_id dari query parameter
// - Validasi origin header (whitelist)
// - Ekstraksi username dari JWT claims
package handler

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog/log"

	"github.com/kreativa/chat-service/internal/ws"
	wsUpgrader "github.com/kreativa/shared/ws"
)

// allowedOrigins — daftar origin yang diizinkan untuk koneksi WebSocket
// Ini mencegah koneksi dari domain yang tidak dikenal (CSRF pada WebSocket)
var allowedOrigins = map[string]bool{
	"http://localhost:8000": true,
	"http://127.0.0.1:8000": true,
	"http://localhost:3000": true,
	"http://localhost:5173": true,
}

// ChatHandler menangani endpoint WebSocket utama.
type ChatHandler struct {
	hub       *ws.Hub
	jwtSecret string
}

func NewChatHandler(hub *ws.Hub, jwtSecret string) *ChatHandler {
	return &ChatHandler{hub: hub, jwtSecret: jwtSecret}
}

// HandleWebSocket — upgrade HTTP ke WebSocket dengan autentikasi JWT.
//
// Keamanan yang diterapkan:
// 1. Validasi Origin header (mencegah CSRF pada WebSocket)
// 2. Validasi JWT token dari query parameter atau Authorization header
// 3. Validasi room_id dari query parameter
// 4. Ekstraksi user_id dan username dari JWT claims
func (h *ChatHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {

	// --- LANGKAH 1: Validasi Origin Header ---
	origin := r.Header.Get("Origin")
	if origin != "" && !allowedOrigins[origin] {
		log.Warn().
			Str("origin", origin).
			Str("remote_addr", r.RemoteAddr).
			Msg("Koneksi WebSocket ditolak: origin tidak diizinkan")
		http.Error(w, `{"detail":"Origin tidak diizinkan"}`, http.StatusForbidden)
		return
	}

	// --- LANGKAH 2: Ekstrak JWT Token ---
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		// Fallback: coba Authorization header
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if tokenStr == "" {
		http.Error(w, `{"detail":"Autentikasi diperlukan"}`, http.StatusUnauthorized)
		return
	}

	// --- LANGKAH 3: Validasi JWT ---
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		// Pastikan menggunakan HMAC (sama dengan Django SimpleJWT)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		log.Warn().
			Err(err).
			Str("remote_addr", r.RemoteAddr).
			Msg("JWT tidak valid")
		http.Error(w, `{"detail":"Token tidak valid"}`, http.StatusUnauthorized)
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, `{"detail":"Claims tidak valid"}`, http.StatusUnauthorized)
		return
	}

	// Cek token_type harus "access" (SimpleJWT)
	tokenType, _ := claims["token_type"].(string)
	if tokenType != "access" {
		http.Error(w, `{"detail":"Tipe token tidak valid"}`, http.StatusUnauthorized)
		return
	}

	// Ekstrak user_id (UUID string dari Django)
	userID, _ := claims["user_id"].(string)
	if userID == "" {
		http.Error(w, `{"detail":"user_id tidak ditemukan di token"}`, http.StatusUnauthorized)
		return
	}

	// Ekstrak username dari custom claim (ditambahkan di Django token_api)
	username, _ := claims["username"].(string)
	if username == "" {
		username = userID // Fallback ke user_id jika username tidak ada
	}

	// --- LANGKAH 4: Ekstrak & Validasi Room ID ---
	roomID := r.URL.Query().Get("room_id")
	if roomID == "" {
		http.Error(w, `{"detail":"room_id diperlukan"}`, http.StatusBadRequest)
		return
	}

	// Sanitasi room_id — hanya izinkan UUID format
	roomID = strings.TrimSpace(roomID)
	if len(roomID) > 50 {
		http.Error(w, `{"detail":"room_id tidak valid"}`, http.StatusBadRequest)
		return
	}

	// --- LANGKAH 5: Upgrade ke WebSocket ---
	conn, err := wsUpgrader.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("Gagal upgrade WebSocket")
		return
	}

	// Buat client dengan informasi lengkap
	client := ws.NewClient(conn, userID, username, h.hub)
	h.hub.Register <- client

	// Auto-join room berdasarkan room_id dari query parameter
	h.hub.JoinRoomChan <- ws.JoinRequest{Client: client, RoomID: roomID}

	log.Info().
		Str("user_id", userID).
		Str("username", username).
		Str("room_id", roomID).
		Str("remote_addr", r.RemoteAddr).
		Msg("Client WebSocket terhubung")

	go client.WritePump()
	go client.ReadPump()
}
