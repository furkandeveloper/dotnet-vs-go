package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"go-benchmark/internal/handler"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/benchmark?sslmode=disable"
	}
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		slog.Error("failed to connect to postgres", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	defer rdb.Close()

	h := handler.New(pool, rdb)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", h.Health)
	mux.HandleFunc("POST /api/discount", h.Discount)
	mux.HandleFunc("GET /api/product/{id}", h.Product)

	slog.Info("starting server", "port", 8080)
	if err := http.ListenAndServe(":8080", mux); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
