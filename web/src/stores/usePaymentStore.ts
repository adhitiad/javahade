'use client';

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createContext, useContext, useRef } from 'react';

interface PaymentState {
  balance: number;
  lockedBalance: number;
  isLoading: boolean;
  error: string | null;
}

interface PaymentActions {
  fetchBalance: () => Promise<void>;
  createIntent: (amount: number, provider: string) => Promise<string | null>;
}

export type PaymentStore = PaymentState & PaymentActions;

export const createPaymentStore = (initProps?: Partial<PaymentState>) => {
  return createStore<PaymentStore>()((set) => ({
    balance: 0,
    lockedBalance: 0,
    isLoading: false,
    error: null,
    ...initProps,
    
    fetchBalance: async () => {
      set({ isLoading: true, error: null });
      try {
        const res = await fetch('/api/payments/balance');
        if (!res.ok) throw new Error('Gagal mengambil saldo');
        const data = await res.json();
        set({ balance: data.balance, lockedBalance: data.locked_balance, isLoading: false });
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
      }
    },
    
    createIntent: async (amount, provider) => {
      set({ isLoading: true, error: null });
      try {
        const res = await fetch('/api/payments/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, provider_preference: provider }),
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Gagal top up');
        }
        
        const data = await res.json();
        set({ isLoading: false });
        return data.checkout_url;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return null;
      }
    }
  }));
};

// React Context & Provider Setup for SSR-safe Zustand
export const PaymentStoreContext = createContext<ReturnType<typeof createPaymentStore> | null>(null);

export function usePaymentStore<T>(selector: (state: PaymentStore) => T): T {
  const store = useContext(PaymentStoreContext);
  if (!store) throw new Error('Missing PaymentStoreProvider in tree');
  return useStore(store, selector);
}
