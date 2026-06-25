"use client";
// ============================================================
// Booking Store — Zustand state management for bookings
// Uses Go Booking Service at http://localhost:3333/api/v1/bookings
// ============================================================
import { createStore } from "zustand/vanilla";
import { createZustandContext } from "./factory";
import type { Booking, BookingSlot } from "@/types";
import { booking } from "@/lib/api";
import { z } from "zod";
import { bookingSlotResponseSchema, bookingResponseSchema } from "@/schemas/responses";

export interface BookingState {
  slots: BookingSlot[];
  myBookings: Booking[];
  isLoading: boolean;
  error: string | null;

  fetchSlots: (creatorId?: string) => Promise<void>;
  createSlot: (data: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    max_seats: number;
    price: number;
    currency: string;
  }) => Promise<BookingSlot>;
  fetchMyBookings: () => Promise<void>;
  reserveSlot: (slotId: string) => Promise<Booking>;
  confirmBooking: (id: string) => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  clearError: () => void;
}

export const createBookingStore = () => createStore<BookingState>()((set, get) => ({
  slots: [],
  myBookings: [],
  isLoading: false,
  error: null,

  fetchSlots: async (creatorId?: string) => {
    set({ isLoading: true });
    try {
      const params = creatorId ? `?creator_id=${creatorId}` : "";
      const res = await booking.get<BookingSlot[]>(`/bookings/slots${params}`, z.array(bookingSlotResponseSchema));
      set({ slots: res, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createSlot: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const slot = await booking.post<BookingSlot>("/bookings/slots", data, bookingSlotResponseSchema);
      set((state) => ({ slots: [...state.slots, slot], isLoading: false }));
      return slot;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  fetchMyBookings: async () => {
    set({ isLoading: true });
    try {
      const res = await booking.get<Booking[]>("/bookings/my", z.array(bookingResponseSchema));
      set({ myBookings: res, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  reserveSlot: async (slotId) => {
    set({ isLoading: true, error: null });
    try {
      const bookingRes = await booking.post<Booking>("/bookings/reserve", {
        slot_id: slotId,
      }, bookingResponseSchema);
      set((state) => ({
        myBookings: [...state.myBookings, bookingRes],
        isLoading: false,
      }));
      return bookingRes;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  confirmBooking: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await booking.put(`/bookings/${id}/confirm`, {});
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  cancelBooking: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await booking.delete(`/bookings/${id}/cancel`);
      set((state) => ({
        myBookings: state.myBookings.filter((b) => b.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export const { Provider: BookingStoreProvider, useStoreHook: useBookingStore } = createZustandContext<BookingState>();
