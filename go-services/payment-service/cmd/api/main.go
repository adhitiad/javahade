package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"payment-service/internal/adapters"
	"payment-service/internal/api"
	"payment-service/internal/ledger"
	"payment-service/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	// Initialize Database Connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Fallback for local testing if not set
		dbURL = "postgres://postgres:postgres@localhost:6543/postgres" 
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse database config: %v\n", err)
	}

	dbpool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
	}
	defer dbpool.Close()

	// Initialize Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Unable to parse redis config: %v\n", err)
	}
	rdb := redis.NewClient(opts)
	defer rdb.Close()

	// Initialize Gateway Adapters
	providers := map[string]adapters.Provider{
		"verotel":    adapters.NewVerotel(os.Getenv("VEROTEL_SHOP_ID"), os.Getenv("VEROTEL_SIGNATURE")),
		"segpay":     adapters.NewSegpay(os.Getenv("SEGPAY_PACKAGE_ID")),
		"netbilling": adapters.NewNETbilling(os.Getenv("NETBILLING_ACCOUNT_ID")),
		"elotpay":    adapters.NewELotPay(os.Getenv("ELOTPAY_API_KEY")),
		"paxum":      adapters.NewPaxum(os.Getenv("PAXUM_EMAIL"), os.Getenv("PAXUM_SECRET")),
	}

	// Initialize Ledger
	ledgerApp := ledger.NewLedger(dbpool)

	// Start Saga Worker
	sagaWorker := service.NewSagaWorker(rdb, ledgerApp)
	ctx, cancelSaga := context.WithCancel(context.Background())
	go sagaWorker.Run(ctx)
	defer cancelSaga()

	// Initialize Fiber App
	app := fiber.New(fiber.Config{
		DisableStartupMessage: false,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())

	// Setup Routes
	handler := api.NewHandler(dbpool, providers)
	api.SetupRoutes(app, handler)

	// Graceful Shutdown
	go func() {
		if err := app.Listen(":3001"); err != nil {
			log.Panic(err)
		}
	}()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Gracefully shutting down...")
	_, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := app.Shutdown(); err != nil {
		log.Panic(err)
	}

	log.Println("Fiber was successful shutdown.")
}
