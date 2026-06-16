// Package ws provides shared WebSocket utilities.
package ws

import (
	"net/http"

	"github.com/gorilla/websocket"
)

// Upgrader is the shared WebSocket upgrader configuration.
var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		// Mengizinkan koneksi lokal untuk development, 
		// di production sesuaikan dengan domain resmi (CORS)
		if origin == "http://localhost:3000" || origin == "http://localhost:8000" || origin == "https://kreativa.app" || origin == "" {
			return true
		}
		// Tolak jika origin tidak terdaftar
		return false
	},
}
