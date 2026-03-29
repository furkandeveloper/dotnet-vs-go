package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

type productResponse struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Price  float64 `json:"price"`
	Cached bool    `json:"cached"`
}

func (h *Handler) Product(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ctx := r.Context()
	cacheKey := "product:" + id

	if product, ok := h.fromCache(ctx, cacheKey); ok {
		product.Cached = true
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(product)
		return
	}

	var product productResponse
	err := h.db.QueryRow(ctx,
		"SELECT id, name, price FROM products WHERE id = $1", id).
		Scan(&product.ID, &product.Name, &product.Price)

	if errors.Is(err, pgx.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	if data, err := json.Marshal(product); err == nil {
		h.redis.Set(ctx, cacheKey, data, 60*time.Second)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

func (h *Handler) fromCache(ctx context.Context, key string) (productResponse, bool) {
	val, err := h.redis.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) || err != nil {
		return productResponse{}, false
	}
	var p productResponse
	if err := json.Unmarshal([]byte(val), &p); err != nil {
		return productResponse{}, false
	}
	return p, true
}
