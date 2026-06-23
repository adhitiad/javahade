"use client";

import React from "react";
import { AuthStoreProvider, createAuthStore } from "./auth-store";
import { WalletStoreProvider, createWalletStore } from "./wallet-store";
import { ChatStoreProvider, createChatStore } from "./chat-store";
import { BookingStoreProvider, createBookingStore } from "./booking-store";
import { UIStoreProvider, createUIStore } from "./ui-store";
import { ContentStoreProvider, createContentStore } from "./content-store";
import { FamilyStoreProvider, createFamilyStore } from "./family-store";
import { NotificationStoreProvider, createNotificationStore } from "./notification-store";
import { StreamingStoreProvider, createStreamingStore } from "./streaming-store";

export function ZustandProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthStoreProvider createStore={createAuthStore}>
      <WalletStoreProvider createStore={createWalletStore}>
        <ChatStoreProvider createStore={createChatStore}>
          <BookingStoreProvider createStore={createBookingStore}>
            <UIStoreProvider createStore={createUIStore}>
              <ContentStoreProvider createStore={createContentStore}>
                <FamilyStoreProvider createStore={createFamilyStore}>
                  <NotificationStoreProvider createStore={createNotificationStore}>
                    <StreamingStoreProvider createStore={createStreamingStore}>
                      {children}
                    </StreamingStoreProvider>
                  </NotificationStoreProvider>
                </FamilyStoreProvider>
              </ContentStoreProvider>
            </UIStoreProvider>
          </BookingStoreProvider>
        </ChatStoreProvider>
      </WalletStoreProvider>
    </AuthStoreProvider>
  );
}
