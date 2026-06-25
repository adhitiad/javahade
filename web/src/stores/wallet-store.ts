"use client";
// ============================================================
// Wallet Store — Zustand state for wallet/payments
// Uses Django REST API at http://localhost:8000/api/v1/payments
// ============================================================
import { createStore } from "zustand/vanilla";
import { createZustandContext } from "./factory";
import type { WalletTransaction, Currency, ExchangeRates } from "@/types";
import { django } from "@/lib/api";
import { earningsResponseSchema, exchangeRatesResponseSchema } from "@/schemas/responses";

export interface WalletState {
  transactions: WalletTransaction[];
  exchangeRates: ExchangeRates | null;
  selectedCurrency: Currency;
  totalBalance: Record<Currency, number>;
  isLoading: boolean;
  error: string | null;

  fetchTransactions: () => Promise<void>;
  fetchExchangeRates: () => Promise<void>;
  topupManual: (
    amount: number,
    currency: Currency,
    method: string,
    txHash?: string,
  ) => Promise<void>;
  convertAll: () => Promise<void>;
  requestPayout: (amount: number, currency: Currency) => Promise<void>;
  sendGift: (receiver: string, gift: string, context: string) => Promise<void>;
  setSelectedCurrency: (currency: Currency) => void;
  clearError: () => void;
}

export const createWalletStore = () => createStore<WalletState>()((set, get) => ({
  transactions: [],
  exchangeRates: null,
  selectedCurrency: "IDR",
  totalBalance: { USD: 0, SGD: 0, IDR: 0, MYR: 0, CNY: 0 },
  isLoading: false,
  error: null,

  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      // Refresh user to get latest balances
      const currentUser = await django.get<any>("/users/me/");
      
      const parsedBalances: Record<Currency, number> = {
        USD: Number(currentUser?.balance_usd || 0),
        SGD: Number(currentUser?.balance_sgd || 0),
        IDR: Number(currentUser?.balance_idr || 0),
        MYR: Number(currentUser?.balance_myr || 0),
        CNY: Number(currentUser?.balance_cny || 0),
      };

      // Fetch transaction history
      const data = await django.get<{ results: any[] }>("/payments/history/");
      const mappedTransactions: WalletTransaction[] = (data.results || []).map(
        (tx: any) => ({
          id: tx.id,
          user: tx.user,
          transaction_type: tx.payment_type || "deposit",
          amount: Number(tx.amount || 0),
          currency: tx.currency,
          status: tx.status,
          notes: tx.metadata?.notes || "",
          created_at: tx.created_at,
        }),
      );

      set({
        totalBalance: parsedBalances,
        transactions: mappedTransactions,
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchExchangeRates: async () => {
    try {
      const rates = await django.get<ExchangeRates>(
        "/payments/exchange-rates/",
        exchangeRatesResponseSchema
      );
      set({ exchangeRates: rates });
    } catch {
      set({
        exchangeRates: {
          base: "USD",
          rates: { IDR: 16000, SGD: 1.34, MYR: 4.47, CNY: 7.24 },
          timestamp: Date.now(),
        },
      });
    }
  },

  topupManual: async (amount, currency, method, txHash) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.post<{ status: string; message: string; checkout_url?: string }>(
        "/payments/intent/",
        {
          amount: String(amount),
          currency,
          payment_type: "deposit",
          provider: method,
        },
      );
      if (res.status === "error") throw new Error(res.message);
      
      // Navigate to checkout URL if provider returns one (e.g., Segpay, Verotel)
      if (res.checkout_url && typeof window !== 'undefined') {
        window.location.href = res.checkout_url;
      }
      
      await get().fetchTransactions();
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  convertAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.post<{ status: string; message: string }>(
        "/payments/",
        { action: "convert_all" },
      );
      if (res.status === "error") throw new Error(res.message);
      await get().fetchTransactions();
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  requestPayout: async (amount, currency) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.post<{ status: string; message: string }>(
        "/payments/payout/",
        {
          amount: String(amount),
          currency,
        },
      );
      if (res.status === "error") throw new Error(res.message);
      await get().fetchTransactions();
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  sendGift: async (receiver, gift, context) => {
    set({ isLoading: true, error: null });
    try {
      await django.post("/payments/gifts/send/", { receiver, gift, context });
      await get().fetchTransactions();
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
  clearError: () => set({ error: null }),
}));

export const { Provider: WalletStoreProvider, useStoreHook: useWalletStore } = createZustandContext<WalletState>();
