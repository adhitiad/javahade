"use client";
// ============================================================
// UI Store — Zustand state for navigation, theme, modals
// ============================================================
import { createStore } from 'zustand/vanilla';
import { createZustandContext } from './factory';
import type { NavPage } from '@/types';

export interface UIState {
  sidebarOpen: boolean;
  nsfwAccepted: boolean;
  searchQuery: string;
  isMobile: boolean;
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  acceptNSFW: () => void;
  setSearchQuery: (query: string) => void;
  setIsMobile: (mobile: boolean) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const createUIStore = () => createStore<UIState>()((set) => ({
  sidebarOpen: false,
  nsfwAccepted: typeof window !== 'undefined'
    ? localStorage.getItem('nsfw_accepted') === 'true'
    : false,
  searchQuery: '',
  isMobile: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  acceptNSFW: () => {
    if (typeof window !== 'undefined') localStorage.setItem('nsfw_accepted', 'true');
    set({ nsfwAccepted: true });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  addToast: (message, type = 'success') => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export const { Provider: UIStoreProvider, useStoreHook: useUIStore } = createZustandContext<UIState>();
