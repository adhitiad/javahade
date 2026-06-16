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
		// TODO: In production, validate origin against allowed list
		return true
	},
}
