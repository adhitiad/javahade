import os

file_path = 'e:/java/go-services/booking-service/internal/service/booking.go'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add context timeout in CreateSlot
old_create_slot = '''func (s *BookingService) CreateSlot(ctx context.Context, creatorID uuid.UUID, req model.CreateSlotRequest) (*model.BookingSlot, error) {
	// Overlap Detection: Pastikan tidak ada slot yang bertabrakan waktunya
	var overlapCount int
	err := s.db.QueryRow(ctx,'''
new_create_slot = '''func (s *BookingService) CreateSlot(ctx context.Context, creatorID uuid.UUID, req model.CreateSlotRequest) (*model.BookingSlot, error) {
	// Anti-Goroutine Leak: Proteksi Timeout 5 Detik
	dbCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Overlap Detection: Pastikan tidak ada slot yang bertabrakan waktunya
	var overlapCount int
	err := s.db.QueryRow(dbCtx,'''
content = content.replace(old_create_slot, new_create_slot)

old_exec_create = '''	_, err = s.db.Exec(ctx,
		INSERT INTO booking_slots (id, creator_id, title, description, start_time, end_time, max_seats, price, currency, status, created_at)
		 VALUES (, , , , , , , , , , ),'''
new_exec_create = '''	_, err = s.db.Exec(dbCtx,
		INSERT INTO booking_slots (id, creator_id, title, description, start_time, end_time, max_seats, price, currency, status, created_at)
		 VALUES (, , , , , , , , , , ),'''
content = content.replace(old_exec_create, new_exec_create)


# 2. Redis Caching in ListSlots
old_list_slots = '''func (s *BookingService) ListSlots(ctx context.Context, creatorID string) ([]model.BookingSlot, error) {
	var slots []model.BookingSlot

	query := SELECT id, creator_id, title, description, start_time, end_time, max_seats, price, currency, status, created_at
	           FROM booking_slots WHERE status = 'available' AND start_time > NOW()

	var rows interface{ Close() }
	var err error'''
	
new_list_slots = '''import_json = 
import "encoding/json"

func (s *BookingService) ListSlots(ctx context.Context, creatorID string) ([]model.BookingSlot, error) {
	var slots []model.BookingSlot

	// Redis Cache Check (TTL: 30s)
	cacheKey := "booking_slots:all"
	if creatorID != "" {
		cacheKey = "booking_slots:creator:" + creatorID
	}
	cachedData, err := s.redis.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		// Cache hit
		if err := json.Unmarshal([]byte(cachedData), &slots); err == nil {
			return slots, nil
		}
	}

	// Anti-Goroutine Leak: Proteksi Timeout 5 Detik
	dbCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := SELECT id, creator_id, title, description, start_time, end_time, max_seats, price, currency, status, created_at
	           FROM booking_slots WHERE status = 'available' AND start_time > NOW()

	var rows interface{ Close() }'''

content = content.replace(old_list_slots, new_list_slots)
content = content.replace('r, e := s.db.Query(ctx, query, creatorID)', 'r, e := s.db.Query(dbCtx, query, creatorID)')
content = content.replace('r, e := s.db.Query(ctx, query)', 'r, e := s.db.Query(dbCtx, query)')

# Set Cache
old_return_list = '''	if slots == nil {
		slots = []model.BookingSlot{}
	}
	return slots, nil
}'''

new_return_list = '''	if slots == nil {
		slots = []model.BookingSlot{}
	}
	
	// Simpan ke Redis (Cache Miss)
	if jsonData, err := json.Marshal(slots); err == nil {
		s.redis.Set(ctx, cacheKey, jsonData, 30*time.Second)
	}

	return slots, nil
}'''
content = content.replace(old_return_list, new_return_list)

# Add encoding/json if not exists
if '"encoding/json"' not in content:
    content = content.replace('"context"', '"context"\n\t"encoding/json"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated booking.go")
