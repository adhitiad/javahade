"use client";
// ============================================================
// Family Store — Zustand state for family groups and agency
// Uses Django REST API at http://localhost:8000/api/v1/families
// ============================================================
import { createStore } from "zustand/vanilla";
import { createZustandContext } from "./factory";
import type {
  FamilyGroup,
  FamilyMember,
  FamilyContent,
  PaginatedResponse,
} from "@/types";
import { django } from "@/lib/api";

export interface FamilyState {
  families: FamilyGroup[];
  currentFamily: FamilyGroup | null;
  members: FamilyMember[];
  feed: FamilyContent[];
  isLoading: boolean;
  error: string | null;

  fetchFamilies: () => Promise<void>;
  fetchFamilyDetail: (id: string) => Promise<void>;
  createFamily: (data: {
    name: string;
    description?: string;
    is_private?: boolean;
    max_members?: number;
  }) => Promise<FamilyGroup>;
  joinFamily: (code: string) => Promise<FamilyGroup>;
  fetchFamilyMembers: (id: string) => Promise<void>;
  fetchFamilyFeed: (id: string) => Promise<void>;
  shareContent: (
    id: string,
    postId: string,
    message?: string,
  ) => Promise<FamilyContent>;
  generateInviteCode: (
    id: string,
  ) => Promise<{ invite_code: string; invite_link: string }>;
  clearError: () => void;
}

export const createFamilyStore = () => createStore<FamilyState>()((set, get) => ({
  families: [],
  currentFamily: null,
  members: [],
  feed: [],
  isLoading: false,
  error: null,

  fetchFamilies: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.get<
        PaginatedResponse<FamilyGroup> | FamilyGroup[]
      >("/families/");
      const families = Array.isArray(res) ? res : res.results;
      set({ families, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchFamilyDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const family = await django.get<FamilyGroup>(`/families/${id}/`);
      set({ currentFamily: family, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createFamily: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const family = await django.post<FamilyGroup>("/families/", data);
      set((state) => ({
        families: [family, ...state.families],
        isLoading: false,
      }));
      return family;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  joinFamily: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const family = await django.post<FamilyGroup>(`/families/join/${code}/`);
      set((state) => ({
        families: [family, ...state.families],
        isLoading: false,
      }));
      return family;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  fetchFamilyMembers: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.get<
        FamilyMember[] | PaginatedResponse<FamilyMember>
      >(`/families/${id}/members/`);
      const members = Array.isArray(res) ? res : res.results;
      set({ members, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchFamilyFeed: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.get<
        FamilyContent[] | PaginatedResponse<FamilyContent>
      >(`/families/${id}/feed/`);
      const feed = Array.isArray(res) ? res : res.results;
      set({ feed, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  shareContent: async (id, postId, message) => {
    set({ isLoading: true, error: null });
    try {
      const content = await django.post<FamilyContent>(
        `/families/${id}/share/`,
        {
          post_id: postId,
          message,
        },
      );
      set((state) => ({
        feed: [content, ...state.feed],
        isLoading: false,
      }));
      return content;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  generateInviteCode: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.post<{
        invite_code: string;
        invite_link: string;
      }>(`/families/${id}/invite/`);
      if (get().currentFamily?.id === id) {
        set((state) => ({
          currentFamily: state.currentFamily
            ? { ...state.currentFamily, invite_code: res.invite_code }
            : null,
        }));
      }
      set({ isLoading: false });
      return res;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export const { Provider: FamilyStoreProvider, useStoreHook: useFamilyStore } = createZustandContext<FamilyState>();
