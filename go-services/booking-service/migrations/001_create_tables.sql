-- Kreativa Platform — Booking & Stream Tables
-- Run this AFTER Django migrations, since Django manages the main schema.
-- These tables are used by Go services that share the same PostgreSQL database.

-- ═══════════════════════════════════════════
-- Booking Slots (managed by Go booking-service)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS booking_slots (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    max_seats INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_creator ON booking_slots(creator_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_status_time ON booking_slots(status, start_time);

-- ═══════════════════════════════════════════
-- Bookings (reservations by fans)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY,
    slot_id UUID NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_num INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(slot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_status ON bookings(slot_id, status);
