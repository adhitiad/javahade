// Package database provides database connection helpers.
package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// NewPostgresPool creates a connection pool to PostgreSQL.
func NewPostgresPool(ctx context.Context, databaseURL string) *pgxpool.Pool {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to parse database URL")
	}

	config.MaxConns = 20
	config.MinConns = 5
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to PostgreSQL")
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping PostgreSQL")
	}

	log.Info().Msg("Connected to PostgreSQL")
	return pool
}

