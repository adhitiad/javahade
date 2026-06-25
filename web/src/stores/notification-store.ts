"use client";
// ============================================================
// Notification Store — Zustand state for notifications
// Uses Django REST API at http://localhost:8000/api/v1/notifications
// ============================================================
import { createStore } from "zustand/vanilla";
import { createZustandContext } from "./factory";
import type { Notification, PaginatedResponse } from "@/types";
import { django } from "@/lib/api";

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  clearError: () => void;
}

export const createNotificationStore = () => createStore<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.get<
        PaginatedResponse<Notification> | Notification[]
      >("/notifications/");
      const notifications = Array.isArray(res) ? res : res.results;
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  markAsRead: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await django.post(`/notifications/${id}/read/`, {});
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  markAllAsRead: async () => {
    set({ isLoading: true, error: null });
    try {
      await django.post("/notifications/read-all/", {});
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
        })),
        unreadCount: 0,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await django.get<{ count: number }>(
        "/notifications/unread-count/",
      );
      set({ unreadCount: res.count });
    } catch {
      // ignore
    }
  },

  clearError: () => set({ error: null }),
}));

export const { Provider: NotificationStoreProvider, useStoreHook: useNotificationStore } = createZustandContext<NotificationState>();
