// ============================================================
// API Client — Django REST API + Go Services integration
// ============================================================
import type {
  PaginatedResponse,
  AuthTokens,
  Currency,
  ExchangeRates,
} from "@/types";

const isServer = typeof window === "undefined";

const DJANGO_API_BASE =
  (isServer ? (process.env.INTERNAL_API_URL ? `${process.env.INTERNAL_API_URL}/api/v1` : null) : null) || process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://localhost:8000/api/v1";
const GO_BOOKING_BASE =
  (isServer ? (process.env.INTERNAL_BOOKING_API_URL ? `${process.env.INTERNAL_BOOKING_API_URL}/api/v1` : null) : null) || process.env.NEXT_PUBLIC_BOOKING_API_URL || "http://localhost:3333/api/v1";
const GO_STREAM_BASE =
  (isServer ? process.env.INTERNAL_STREAM_API_URL : null) || process.env.NEXT_PUBLIC_STREAM_API_URL || "http://localhost:3334";
const GO_CHAT_BASE =
  (isServer ? process.env.INTERNAL_CHAT_API_URL : null) || process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:3335";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

import { z } from "zod";
import { paginatedResponseSchema } from "@/schemas/responses";

async function apiFetch<T>(
  baseURL: string,
  path: string,
  init: RequestInit = {},
  withCredentials: boolean = false,
  schema?: z.ZodType<T>,
): Promise<T> {
  const token =
    typeof document !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const isFormData = init.body instanceof FormData;

  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseURL}${path}`, {
    ...init,
    headers,
    credentials: withCredentials ? "include" : "omit",
  });

  if (res.status === 401 && token && withCredentials) {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      const refreshRes = await fetch(`${DJANGO_API_BASE}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        credentials: "include",
      });
      if (refreshRes.ok) {
        const refreshData = (await refreshRes.json()) as { access?: string };
        if (refreshData.access) {
          localStorage.setItem("access_token", refreshData.access);
          headers["Authorization"] = `Bearer ${refreshData.access}`;
          const retryRes = await fetch(`${baseURL}${path}`, {
            ...init,
            headers,
            credentials: withCredentials ? "include" : "omit",
          });
          if (retryRes.ok) {
            if (retryRes.status === 204) return undefined as T;
            const data = await retryRes.json();
            if (schema) {
              try {
                return schema.parse(data);
              } catch (err) {
                console.error(`[Zod Error] parsing ${path}:`, err);
                // Return fallback data or throw
              }
            }
            return data as T;
          }
        }
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  if (!res.ok) {
    const error = (await res.json().catch(() => ({
      detail: res.statusText,
    }))) as Record<string, string>;
    throw new ApiError(res.status, error.detail || "Terjadi kesalahan");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (schema) {
    try {
      return schema.parse(data);
    } catch (err) {
      console.error(`[Zod Error] parsing ${path}:`, err);
      // Allow it to pass through for now if schema strictness causes issues with existing data,
      // but in strict production we might want to throw err. We will return data for fallback
      // as requested to just validate (and log errors).
      // Or we can throw err so Zod rules are strictly applied.
      throw err;
    }
  }
  return data as T;
}

// Django REST API client (HttpOnly cookie auth)
export const django = {
  get: async function <T>(endpoint: string, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(DJANGO_API_BASE, endpoint, {}, true, schema);
  },
  post: async function <T>(endpoint: string, body?: unknown, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(
      DJANGO_API_BASE,
      endpoint,
      { method: "POST", body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) },
      true,
      schema
    );
  },
  put: async function <T>(endpoint: string, body?: unknown, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(
      DJANGO_API_BASE,
      endpoint,
      { method: "PUT", body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) },
      true,
      schema
    );
  },
  patch: async function <T>(endpoint: string, body?: unknown, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(
      DJANGO_API_BASE,
      endpoint,
      { method: "PATCH", body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) },
      true,
      schema
    );
  },
  delete: async function <T>(endpoint: string, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(DJANGO_API_BASE, endpoint, { method: "DELETE" }, true, schema);
  },
  getPaginated: async function <T>(
    endpoint: string,
    page = 1,
    pageSize = 20,
    schema?: z.ZodType<T>
  ): Promise<PaginatedResponse<T>> {
    const resSchema = schema ? paginatedResponseSchema(schema) : undefined;
    // We import paginatedResponseSchema below so we'll need to handle it or skip schema for pagination here and let the caller handle it.
    // Actually, let's just pass undefined for schema in getPaginated for now and rely on get()
    return django.get(endpoint + `?page=${page}&page_size=${pageSize}`, resSchema as any);
  },
};

// Go Booking Service client (JWT Bearer token auth)
export const booking = {
  get: async function <T>(endpoint: string, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(GO_BOOKING_BASE, endpoint, {}, false, schema);
  },
  post: async function <T>(endpoint: string, body?: unknown, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(
      GO_BOOKING_BASE,
      endpoint,
      { method: "POST", body: body ? JSON.stringify(body) : undefined },
      false,
      schema
    );
  },
  put: async function <T>(endpoint: string, body?: unknown, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(
      GO_BOOKING_BASE,
      endpoint,
      { method: "PUT", body: body ? JSON.stringify(body) : undefined },
      false,
      schema
    );
  },
  delete: async function <T>(endpoint: string, schema?: z.ZodType<T>): Promise<T> {
    return apiFetch<T>(GO_BOOKING_BASE, endpoint, { method: "DELETE" }, false, schema);
  },
};

// Go Stream Service client
export const streamApi = {
  get: async function <T>(endpoint: string): Promise<T> {
    return apiFetch<T>(GO_STREAM_BASE, endpoint, {}, false);
  },
  post: async function <T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(
      GO_STREAM_BASE,
      endpoint,
      { method: "POST", body: body ? JSON.stringify(body) : undefined },
      false,
    );
  },
  put: async function <T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(
      GO_STREAM_BASE,
      endpoint,
      { method: "PUT", body: body ? JSON.stringify(body) : undefined },
      false,
    );
  },
};

// Go Chat Service client
export const chatApi = {
  get: async function <T>(endpoint: string): Promise<T> {
    return apiFetch<T>(GO_CHAT_BASE, endpoint, {}, false);
  },
  post: async function <T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(
      GO_CHAT_BASE,
      endpoint,
      { method: "POST", body: body ? JSON.stringify(body) : undefined },
      false,
    );
  },
};

// Legacy export for backward compatibility
export const api = {
  ...django,
  booking,
  streamApi,
  request: async function <T>(endpoint: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(DJANGO_API_BASE, endpoint, init, true);
  },
  refreshAccessToken: async (): Promise<string | null> => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;
    try {
      const res = await apiFetch<{ access: string }>(
        DJANGO_API_BASE,
        "/auth/refresh/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        },
      );
      return res.access || null;
    } catch {
      clearTokens();
      return null;
    }
  },
};

// Token management helpers
export function setToken(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;
  try {
    const res = await apiFetch<{ access: string }>(
      DJANGO_API_BASE,
      "/auth/refresh/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      },
    );
    return res.access || null;
  } catch {
    clearTokens();
    return null;
  }
}

export { ApiError };
