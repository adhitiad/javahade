package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// InitLogger initializes the global zerolog logger for JSON output.
func InitLogger(level string) {
	// Set default level
	logLevel, err := zerolog.ParseLevel(level)
	if err != nil {
		logLevel = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(logLevel)
	zerolog.TimeFieldFormat = time.RFC3339

	// Default is JSON logger to os.Stdout
	log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
}

// Get returns the global logger instance
func Get() zerolog.Logger {
	return log.Logger
}
