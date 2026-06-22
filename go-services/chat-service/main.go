// Chat Service — Real-time messaging with WebSocket.
//
// Supports direct (1-1), group, family, and stream chat rooms.
// Messages persisted to MongoDB, presence tracked via Redis.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/adhitiad/javahade/shared/config"
	"github.com/adhitiad/javahade/shared/database"
	"github.com/adhitiad/javahade/shared/middleware"

	"github.com/kreativa/chat-service/internal/handler"
	"github.com/kreativa/chat-service/internal/service"
	"github.com/kreativa/chat-service/internal/ws"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := config.Load()

	// Connect to databases
	mongoClient := database.NewMongoClient(ctx, cfg.MongoURI)
	defer mongoClient.Disconnect(ctx)
	mongoDB := mongoClient.Database(cfg.MongoDBName)

	redisClient := database.NewRedisClient(ctx, cfg.RedisURL)
	defer redisClient.Close()

	// Initialize services
	messageSvc := service.NewMessageService(mongoDB)
	roomSvc := service.NewRoomService(mongoDB)
	presenceSvc := service.NewPresenceService(redisClient)

	// Initialize WebSocket hub
	hub := ws.NewHub(redisClient, messageSvc, presenceSvc)
	go hub.Run()

	// Subscribe to Redis PubSub for cross-service notifications
	go hub.SubscribeNotifications(ctx)

	// Initialize handlers
	chatHandler := handler.NewChatHandler(hub, cfg.JWTSecretKey)
	roomHandler := handler.NewRoomHandler(roomSvc, messageSvc)

	// Setup router
	r := chi.NewRouter()
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	r.Use(chiMiddleware.Recoverer)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "chat"})
	})

	// WebSocket endpoint
	r.Get("/ws/chat", chatHandler.HandleWebSocket)

	// REST API (internal, for room management)
	r.Route("/api/v1/rooms", func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg.JWTSecretKey))
		r.Get("/", roomHandler.ListRooms)
		r.Post("/", roomHandler.CreateRoom)
		r.Get("/conversations", roomHandler.ListConversations)
		r.Get("/{roomID}/messages", roomHandler.GetMessages)
	})

	// Start server
	addr := config.Addr(cfg.ChatServicePort)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Info().Str("addr", addr).Msg("Chat service started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("Shutting down chat service...")

	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()

	srv.Shutdown(shutdownCtx)
	fmt.Println("Chat service stopped")
}
