"use client";

import { useAuthStore } from "@/stores/auth-store";
import FeedView from "@/features/feed/components/feed-view";
import LandingView from "@/features/landing/components/landing-view";

export default function FeedPage() {
  const { isLoading, isAuthenticated } = useAuthStore();

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <div className="w-8 h-8 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <FeedView /> : <LandingView />;
}
