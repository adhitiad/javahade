// Package config provides environment-based configuration loading.
package config

import (
	"fmt"
	"log"

	"github.com/kelseyhightower/envconfig"
)

// Config holds all configuration for the application.
type Config struct {
	// General
	ProjectName string `envconfig:"PROJECT_NAME" default:"kreativa"`
	Debug       bool   `envconfig:"DEBUG" default:"true"`

	// PostgreSQL
	DatabaseURL string `envconfig:"DATABASE_URL" default:"postgres://kreativa:kreativa_pass@localhost:5432/kreativa_db"`

	// Redis
	RedisURL string `envconfig:"REDIS_URL" default:"redis://localhost:6379/0"`

	// MongoDB
	MongoURI    string `envconfig:"MONGO_URI" default:"mongodb://localhost:27017"`
	MongoDBName string `envconfig:"MONGO_DB_NAME" default:"kreativa_chat"`

	// JWT
	JWTSecretKey string `envconfig:"JWT_SECRET_KEY" default:"change-me-shared-jwt-secret-between-python-and-go"`

	// Service Ports
	BookingServicePort int `envconfig:"BOOKING_SERVICE_PORT" default:"8080"`
	ChatServicePort    int `envconfig:"CHAT_SERVICE_PORT" default:"8081"`
	StreamServicePort  int `envconfig:"STREAM_SERVICE_PORT" default:"8082"`

	// OvenMediaEngine
	OMEAPIURL         string `envconfig:"OME_API_URL" default:"http://localhost:8081/v1"`
	OMEAPIAccessToken string `envconfig:"OME_API_ACCESS_TOKEN" default:""`

	// CORS
	CORSAllowedOrigins string `envconfig:"CORS_ALLOWED_ORIGINS" default:"http://localhost:3000,http://localhost:5173"`
}

// Load reads configuration from environment variables.
func Load() *Config {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	return &cfg
}

// Addr returns the address string for a given port.
func Addr(port int) string {
	return fmt.Sprintf(":%d", port)
}
