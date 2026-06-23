"use client";

import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";

export interface ZustandContextFactory<TState> {
  Provider: React.FC<{
    createStore: () => StoreApi<TState>;
    children: React.ReactNode;
  }>;
  useStoreHook: <TSelector = TState>(
    selector?: (state: TState) => TSelector,
  ) => TSelector;
}

export function createZustandContext<TState>(): ZustandContextFactory<TState> {
  const StoreContext = createContext<StoreApi<TState> | null>(null);

  const Provider: React.FC<{
    createStore: () => StoreApi<TState>;
    children: React.ReactNode;
  }> = ({ createStore, children }) => {
    const storeRef = useRef<StoreApi<TState>>(null);
    if (!storeRef.current) {
      storeRef.current = createStore();
    }
    return (
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    );
  };

  const useStoreHook = <TSelector = TState,>(
    selector?: (state: TState) => TSelector,
  ): TSelector => {
    const store = useContext(StoreContext);
    if (!store) {
      throw new Error(
        "useStoreHook must be used within the corresponding Zustand Provider",
      );
    }
    // If no selector is provided, return the whole state (as unknown -> TSelector)
    return useStore(
      store,
      selector || ((s: TState) => s as unknown as TSelector),
    );
  };

  return { Provider, useStoreHook };
}
