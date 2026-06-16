// Stream Service — Live Streaming Relay & OME Integration.
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

	"github.com/kreativa/shared/config"
	"github.com/kreativa/shared/database"
	"github.com/kreativa/shared/middleware"

	"github.com/kreativa/stream-service/internal/handler"
	"github.com/kreativa/stream-service/internal/service"
	"github.com/kreativa/stream-service/internal/ws"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := config.Load()

	redisClient := database.NewRedisClient(ctx, cfg.RedisURL)
	defer redisClient.Close()

	// Initialize services
	omeSvc := service.NewOMEService(cfg.OMEAPIURL, cfg.OMEAPIAccessToken)
	streamSvc := service.NewStreamService(redisClient, omeSvc)

	// WebSocket hub for viewer interactions
	hub := ws.NewHub()
	go hub.Run()

	// Handlers
	streamHandler := handler.NewStreamHandler(streamSvc)
	viewerHandler := handler.NewViewerHandler(hub, redisClient)

	// Router
	r := chi.NewRouter()
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	r.Use(chiMiddleware.Recoverer)

	// Health
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "stream"})
	})

	// REST API
	r.Route("/api/v1/streams", func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg.JWTSecretKey))
		r.Post("/", streamHandler.CreateStream)
		r.Get("/live", streamHandler.ListLiveStreams)
		r.Get("/{id}", streamHandler.GetStream)
		r.Put("/{id}/stop", streamHandler.StopStream)
	})

	// WebSocket for viewer interactions
	r.Route("/ws/stream", func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg.JWTSecretKey))
		r.Get("/{id}/interact", viewerHandler.HandleWebSocket)
	})

	// Start
	addr := config.Addr(cfg.StreamServicePort)
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	go func() {
		log.Info().Str("addr", addr).Msg("Stream service started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("Shutting down stream service...")

	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()
	srv.Shutdown(shutdownCtx)
	fmt.Println("Stream service stopped")
}
