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
  needs2FA: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    gender: string;
    date_of_birth: string;
  }) => Promise<void>;
  syncSocialLogin: () => Promise<boolean>;
  submitSocial2FA: (totpCode: string) => Promise<void>;
  cancelSocial2FA: () => void;
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
      needs2FA: false,

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
        set({ isLoading: true, error: null, needs2FA: false });
        try {
          // Call the Next.js API route
          // It checks Better Auth session and forwards it to Django
          const res = await fetch("/api/auth/sync", { method: "POST" });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));

            // Django returned 2fa_required — show 2FA dialog
            if (data.error === "2fa_required") {
              set({ needs2FA: true, isLoading: false });
              return true;
            }

            throw new Error(data.error || "Failed to sync social login with backend");
          }

          // Sync successful — store tokens and fetch user
          const syncData = await res.json();
          if (syncData.tokens?.access) {
            localStorage.setItem("access_token", syncData.tokens.access);
          }
          if (syncData.tokens?.refresh) {
            localStorage.setItem("refresh_token", syncData.tokens.refresh);
          }

          await get().fetchUser();
          return false;
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      submitSocial2FA: async (totpCode: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ totp_code: totpCode }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const message = data.error === "invalid_2fa_code"
              ? "Kode 2FA tidak valid. Silakan coba lagi."
              : data.error || "Verifikasi 2FA gagal.";
            set({ error: message, isLoading: false });
            return;
          }

          // 2FA passed — store tokens and fetch user
          const syncData = await res.json();
          if (syncData.tokens?.access) {
            localStorage.setItem("access_token", syncData.tokens.access);
          }
          if (syncData.tokens?.refresh) {
            localStorage.setItem("refresh_token", syncData.tokens.refresh);
          }

          set({ needs2FA: false, isLoading: false });
          await get().fetchUser();
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      cancelSocial2FA: () => {
        set({ needs2FA: false, error: null, isLoading: false });
      },

      logout: () => {
        clearTokens();
        set({
          user: null,
          creatorProfile: null,
          isAuthenticated: false,
          error: null,
          needs2FA: false,
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
