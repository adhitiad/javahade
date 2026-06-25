"use client";
// ============================================================
// Auth Store — Zustand state management for authentication
// Django login returns tokens in HttpOnly cookies (not JSON body)
// ============================================================
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import { createZustandContext } from "./factory";
import type { User, CreatorProfile } from "@/types";
import { django, refreshAccessToken, clearTokens } from "@/lib/api";
import { userResponseSchema, creatorProfileResponseSchema } from "@/schemas/responses";

export interface AuthState {
  user: User | null;
  creatorProfile: CreatorProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    gender: string;
    date_of_birth: string;
  }) => Promise<void>;
  syncSocialLogin: () => Promise<void>;
  logout: () => void;
  logoutAll: () => Promise<void>;
  fetchUser: () => Promise<void>;
  fetchCreatorProfile: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;
}

export const createAuthStore = () => createStore<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      creatorProfile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Django CustomCookieLoginView returns tokens in HttpOnly cookies
          // No JSON body with tokens expected
          await django.post("/auth/login/", { email, password });
          await get().fetchUser();
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await django.post("/auth/register/", data);
          // Auto-login after registration (Django also uses cookies)
          await get().login(data.email, data.password);
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      syncSocialLogin: async () => {
        set({ isLoading: true, error: null });
        try {
          // Call the Next.js API route we just created
          // It checks Better Auth session and forwards it to Django
          const res = await fetch("/api/auth/sync");
          if (!res.ok) {
            throw new Error("Failed to sync social login with backend");
          }
          await get().fetchUser();
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        clearTokens();
        set({
          user: null,
          creatorProfile: null,
          isAuthenticated: false,
          error: null,
        });
      },

      logoutAll: async () => {
        try {
          await django.post("/auth/logout-all/");
        } catch {
          // Ignore errors on logout
        }
        get().logout();
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const user = await django.get<User>("/users/me/", userResponseSchema);
          set({ user, isAuthenticated: true, isLoading: false });

          if (user.role === "host") {
            get().fetchCreatorProfile();
          }
        } catch {
          set({ isAuthenticated: false, isLoading: false, user: null });
        }
      },

      fetchCreatorProfile: async () => {
        try {
          const profile = await django.get<CreatorProfile>("/creators/me/", creatorProfileResponseSchema);
          set({ creatorProfile: profile });
        } catch {
          set({ creatorProfile: null });
        }
      },

      updateUser: (data) => {
        const user = get().user;
        if (user) {
          const updated = { ...user, ...data };
          set({ user: updated });
          if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(updated));
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "javahade-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export const { Provider: AuthStoreProvider, useStoreHook: useAuthStore } = createZustandContext<AuthState>();
