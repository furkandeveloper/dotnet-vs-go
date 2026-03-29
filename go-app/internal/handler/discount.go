package handler

import (
	"encoding/json"
	"math"
	"net/http"
)

type discountRule struct {
	Type  string  `json:"type"`
	Value float64 `json:"value"`
}

type discountRequest struct {
	Price float64        `json:"price"`
	Rules []discountRule `json:"rules"`
}

type discountResponse struct {
	OriginalPrice   float64 `json:"original_price"`
	DiscountedPrice float64 `json:"discounted_price"`
	AppliedRules    int     `json:"applied_rules"`
}

func (h *Handler) Discount(w http.ResponseWriter, r *http.Request) {
	var req discountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	price := req.Price
	applied := 0

	for _, rule := range req.Rules {
		switch rule.Type {
		case "percentage":
			price *= 1 - rule.Value/100
			applied++
		case "fixed":
			price -= rule.Value
			applied++
		}
	}

	if price < 0 {
		price = 0
	}

	resp := discountResponse{
		OriginalPrice:   req.Price,
		DiscountedPrice: math.Round(price*100) / 100,
		AppliedRules:    applied,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
