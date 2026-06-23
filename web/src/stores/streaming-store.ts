"use client";

import { createStore } from "zustand/vanilla";
import { createZustandContext } from "./factory";
import type { LiveStream, StreamBounty } from "@/types";
import { streamApi } from "@/lib/api";

interface WatchStreamInfo {
  stream: {
    id: string;
    host: string;
    title: string;
    status: string;
    viewer_count: number;
    stream_key: string;
  };
  is_host: boolean;
  signed_token: string;
  viewer_ip: string;
}

export interface StreamingState {
  streams: LiveStream[];
  currentStream: LiveStream | null;
  watchInfo: WatchStreamInfo | null;
  bounties: StreamBounty[];
  activeSticker: { url: string; timestamp: number } | null;
  isLoading: boolean;
  error: string | null;
  _ws: WebSocket | null;

  connectStreamWS: (streamId: string) => void;
  disconnectStreamWS: () => void;
  sendSticker: (streamId: string, url: string, price: number) => void;
  createBounty: (streamId: string, task: string, amount: number) => Promise<void>;
  updateBountyStatus: (bountyId: string, status: "pending" | "accepted" | "completed" | "rejected" | "failed") => Promise<void>;
  
  fetchStreams: () => Promise<void>;
  fetchStreamDetail: (streamId: string) => Promise<LiveStream>;
  createStream: (data: {
    title: string;
    is_family_only?: boolean;
    family_group?: string;
    ticket_price_usd?: number;
    scheduled_time?: string;
  }) => Promise<LiveStream>;
  stopStream: (streamId: string) => Promise<void>;
  fetchStreamWatchInfo: (streamId: string) => Promise<void>;
  clearStream: () => void;
  clearError: () => void;
  buyTicket: (streamId: string) => Promise<void>;
}

export const createStreamingStore = () => createStore<StreamingState>()((set, get) => ({
  streams: [],
  currentStream: null,
  watchInfo: null,
  bounties: [],
  activeSticker: null,
  isLoading: false,
  error: null,
  _ws: null,

  connectStreamWS: (streamId: string) => {
    const state = get();
    if (state._ws?.readyState === WebSocket.OPEN) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
    const wsUrl = `ws://localhost:3334/ws/stream?room_id=${streamId}&token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "bounty_updated") {
          // Bounties event
          const newBounty: StreamBounty = msg.payload;
          set((state) => {
            const exists = state.bounties.find((b) => b.id === newBounty.id);
            if (exists) {
              return { bounties: state.bounties.map((b) => (b.id === newBounty.id ? newBounty : b)) };
            }
            return { bounties: [newBounty, ...state.bounties] };
          });
        } else if (msg.type === "sticker_received") {
          // Sticker event
          set({ activeSticker: { url: msg.payload.url, timestamp: Date.now() } });
          setTimeout(() => {
            set((s) => (s.activeSticker?.timestamp === msg.payload.timestamp ? { activeSticker: null } : s));
          }, 4000);
        }
      } catch (err) {}
    };

    set({ _ws: ws });
  },

  disconnectStreamWS: () => {
    const ws = get()._ws;
    if (ws) {
      ws.close();
      set({ _ws: null, bounties: [] });
    }
  },

  sendSticker: (streamId: string, url: string, price: number) => {
    const ws = get()._ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "send_sticker", room_id: streamId, payload: { url, price } }));
      
      // Call payment/wallet endpoint indirectly via HTTP to deduct balance
      import('@/lib/api').then(({ django }) => {
        django.post('/payments/gifts/send/', { receiver: streamId, gift: `Sticker: ${url}`, amount: price }).catch(() => {});
      });
    }
  },

  createBounty: async (streamId, task, amount) => {
    try {
      const res = await streamApi.post<StreamBounty>(`/api/v1/streams/${streamId}/bounties`, { task_description: task, amount_idr: amount });
      set((state) => ({ bounties: [res, ...state.bounties] }));
    } catch (err) {
      throw err;
    }
  },

  updateBountyStatus: async (bountyId, status) => {
    try {
      const res = await streamApi.post<StreamBounty>(`/api/v1/streams/bounties/${bountyId}/status`, { status });
      set((state) => ({
        bounties: state.bounties.map((b) => (b.id === bountyId ? res : b)),
      }));
    } catch (err) {
      throw err;
    }
  },

  fetchStreams: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await streamApi.get<{ results: LiveStream[] }>(
        "/api/v1/streams/live",
      );
      set({ streams: res.results || [], isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchStreamDetail: async (streamId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await streamApi.get<LiveStream>(
        `/api/v1/streams/${streamId}`,
      );
      set({ currentStream: res, isLoading: false });
      return res;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  createStream: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await streamApi.post<LiveStream>("/api/v1/streams/", data);
      set({ isLoading: false });
      return res;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  stopStream: async (streamId) => {
    set({ isLoading: true, error: null });
    try {
      await streamApi.put(`/api/v1/streams/${streamId}/stop`, {});
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  fetchStreamWatchInfo: async (streamId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await streamApi.get<WatchStreamInfo>(
        `/api/v1/streams/${streamId}/watch`,
      );
      set({ watchInfo: res, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  clearStream: () => set({ watchInfo: null }),

  buyTicket: async (streamId) => {
    set({ isLoading: true, error: null });
    try {
      await streamApi.post(`/api/v1/streams/${streamId}/ticket`, {});
      // Update currentStream if it matches
      set((state) => ({
        currentStream:
          state.currentStream && state.currentStream.id === streamId
            ? { ...state.currentStream, has_ticket: true }
            : state.currentStream,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export const { Provider: StreamingStoreProvider, useStoreHook: useStreamingStore } = createZustandContext<StreamingState>();
