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
  paypalClientId: string | null;

  fetchTransactions: () => Promise<void>;
  fetchExchangeRates: () => Promise<void>;
  topupManual: (
    amount: number,
    currency: Currency,
    method: string,
    txHash?: string,
  ) => Promise<void>;
  createPayPalOrder: (amount: number) => Promise<{ id: string }>;
  capturePayPalOrder: (
    orderID: string,
    amount: number,
    currency: Currency,
  ) => Promise<void>;
  verifyCrypto: (
    txid: string,
    network: string,
  ) => Promise<{
    valid: boolean;
    amount?: string;
    currency?: string;
    error?: string;
  }>;
  convertAll: () => Promise<void>;
  requestPayout: (amount: number, currency: Currency) => Promise<void>;
  fetchPayPalClientId: () => Promise<string>;
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
  paypalClientId: null,

  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await django.get(
        "/payments/earnings/",
        earningsResponseSchema
      );
      const parsedBalances: Record<Currency, number> = {
        USD: Number(data.balances.USD || 0),
        SGD: Number(data.balances.SGD || 0),
        IDR: Number(data.balances.IDR || 0),
        MYR: Number(data.balances.MYR || 0),
        CNY: Number(data.balances.CNY || 0),
      };
      const mappedTransactions: WalletTransaction[] = data.transactions.map(
        (tx: any) => ({
          id: tx.id,
          user: "",
          transaction_type: tx.type === "withdrawal" ? "withdraw" : tx.type,
          amount: Number(tx.amount || 0),
          currency: tx.currency,
          status: tx.status,
          notes: tx.notes,
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
      const res = await django.post<{ status: string; message: string }>(
        "/payments/intent/",
        {
          amount: String(amount),
          currency,
          payment_type: "deposit",
          provider: "manual",
          metadata: { method, tx_hash: txHash },
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

  createPayPalOrder: async (amount) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.post<{ id: string }>(
        "/payments/api/paypal/create-order/",
        { amount },
      );
      set({ isLoading: false });
      return res;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  capturePayPalOrder: async (orderID, amount, currency) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.post<{ status: string; error?: string }>(
        "/payments/api/paypal/capture-order/",
        {
          orderID,
          amount: String(amount),
          currency,
        },
      );
      if (res.status !== "COMPLETED")
        throw new Error(res.error || "Failed to capture PayPal order");
      await get().fetchTransactions();
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  verifyCrypto: async (txid, network) => {
    set({ isLoading: true, error: null });
    try {
      const res = await django.post<any>("/payments/verify-crypto/", {
        txid,
        network,
      });
      await get().fetchTransactions();
      set({ isLoading: false });
      return res;
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

  fetchPayPalClientId: async () => {
    try {
      const res = await django.get<{ paypal_client_id: string }>("/payments/");
      set({ paypalClientId: res.paypal_client_id });
      return res.paypal_client_id;
    } catch (err) {
      set({ error: (err as Error).message });
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
