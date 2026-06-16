// Booking & Live Streaming Signaling Service
//
// Handles booking slots, seat locking, host matchmaking,
// and stream signaling via REST + WebSocket.
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

	"github.com/kreativa/booking-service/internal/handler"
	"github.com/kreativa/booking-service/internal/service"
	"github.com/kreativa/booking-service/internal/ws"
)

func main() {
	// Setup logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Load config
	cfg := config.Load()

	// Connect to databases
	pgPool := database.NewPostgresPool(ctx, cfg.DatabaseURL)
	defer pgPool.Close()

	redisClient := database.NewRedisClient(ctx, cfg.RedisURL)
	defer redisClient.Close()

	// Initialize services
	bookingSvc := service.NewBookingService(pgPool, redisClient)
	seatLockSvc := service.NewSeatLockService(redisClient)

	// Initialize WebSocket hub
	hub := ws.NewHub()
	go hub.Run()

	// Initialize handlers
	bookingHandler := handler.NewBookingHandler(bookingSvc)
	seatHandler := handler.NewSeatHandler(seatLockSvc, hub)
	streamSignalHandler := handler.NewStreamSignalHandler(hub)

	// Setup router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	r.Use(chiMiddleware.Recoverer)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "booking"})
	})

	// REST API routes (authenticated)
	r.Route("/api/v1/bookings", func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg.JWTSecretKey))

		r.Post("/slots", bookingHandler.CreateSlot)
		r.Get("/slots", bookingHandler.ListSlots)
		r.Post("/reserve", bookingHandler.ReserveSlot)
		r.Put("/{id}/confirm", bookingHandler.ConfirmBooking)
		r.Delete("/{id}/cancel", bookingHandler.CancelBooking)
		r.Get("/my", bookingHandler.MyBookings)
	})

	// WebSocket routes (authenticated)
	r.Route("/ws", func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg.JWTSecretKey))

		r.Get("/booking/{slotID}", seatHandler.HandleWebSocket)
		r.Get("/stream/{streamID}/signal", streamSignalHandler.HandleWebSocket)
	})

	// Start server
	addr := config.Addr(cfg.BookingServicePort)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Str("addr", addr).Msg("Booking service started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("Shutting down booking service...")

	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	fmt.Println("Booking service stopped")
}
