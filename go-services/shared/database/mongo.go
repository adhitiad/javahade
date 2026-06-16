package database

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NewMongoClient creates a MongoDB client.
func NewMongoClient(ctx context.Context, mongoURI string) *mongo.Client {
	clientOpts := options.Client().
		ApplyURI(mongoURI).
		SetMaxPoolSize(20).
		SetMinPoolSize(5).
		SetConnectTimeout(10 * time.Second)

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to MongoDB")
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping MongoDB")
	}

	log.Info().Msg("Connected to MongoDB")
	return client
}

