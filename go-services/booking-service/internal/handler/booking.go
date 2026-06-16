// Package handler implements HTTP and WebSocket handlers.
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/kreativa/booking-service/internal/model"
	"github.com/kreativa/booking-service/internal/service"
	"github.com/adhitiad/javahade/shared/middleware"
)

// BookingHandler handles REST endpoints for booking.
type BookingHandler struct {
	svc *service.BookingService
}

func NewBookingHandler(svc *service.BookingService) *BookingHandler {
	return &BookingHandler{svc: svc}
}

func (h *BookingHandler) CreateSlot(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req model.CreateSlotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"detail":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	creatorUUID, _ := uuid.Parse(userID)
	slot, err := h.svc.CreateSlot(r.Context(), creatorUUID, req)
	if err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(slot)
}

func (h *BookingHandler) ListSlots(w http.ResponseWriter, r *http.Request) {
	creatorID := r.URL.Query().Get("creator_id")

	slots, err := h.svc.ListSlots(r.Context(), creatorID)
	if err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slots)
}

func (h *BookingHandler) ReserveSlot(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		http.Error(w, `{"detail":"Idempotency-Key header is required"}`, http.StatusBadRequest)
		return
	}

	// Cek Idempotency di Redis (jika tidak ada di Redis, set dan lanjutkan. Jika sudah ada, blokir)
	redisKey := "idempotency:booking:" + idempotencyKey
	success, _ := h.svc.GetRedis().SetNX(r.Context(), redisKey, "processing", 24*time.Hour).Result()
	if !success {
		http.Error(w, `{"detail":"Request already processed (Idempotency conflict)"}`, http.StatusConflict)
		return
	}

	var req model.ReserveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"detail":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	userUUID, _ := uuid.Parse(userID)
	booking, err := h.svc.ReserveSlot(r.Context(), userUUID, req.SlotID)
	if err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(booking)
}

func (h *BookingHandler) ConfirmBooking(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	bookingID := chi.URLParam(r, "id")

	bookingUUID, _ := uuid.Parse(bookingID)
	userUUID, _ := uuid.Parse(userID)

	if err := h.svc.ConfirmBooking(r.Context(), bookingUUID, userUUID); err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "confirmed"})
}

func (h *BookingHandler) CancelBooking(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	bookingID := chi.URLParam(r, "id")

	bookingUUID, _ := uuid.Parse(bookingID)
	userUUID, _ := uuid.Parse(userID)

	if err := h.svc.CancelBooking(r.Context(), bookingUUID, userUUID); err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "cancelled"})
}

func (h *BookingHandler) MyBookings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	userUUID, _ := uuid.Parse(userID)

	bookings, err := h.svc.GetUserBookings(r.Context(), userUUID)
	if err != nil {
		http.Error(w, `{"detail":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}

