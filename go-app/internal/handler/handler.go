package handler

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func New(db *pgxpool.Pool, redis *redis.Client) *Handler {
	return &Handler{db: db, redis: redis}
}
