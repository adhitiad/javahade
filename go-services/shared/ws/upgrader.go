// Package ws provides shared WebSocket utilities.
package ws

import (
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
)

// Upgrader is the shared WebSocket upgrader configuration.
var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = "http://localhost:3000,http://localhost:8000,https://kreativa.app"
		}
		
		origins := strings.Split(allowedOrigins, ",")
		for _, o := range origins {
			if origin == strings.TrimSpace(o) {
				return true
			}
		}
		
		return false
	},
}

