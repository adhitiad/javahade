'use client';

import { useAuthStore } from '@/stores/auth-store';
import FeedView from '@/features/feed/components/feed-view';
import LandingView from '@/features/landing/components/landing-view';

export default function FeedPage() {
  const { user } = useAuthStore();
  return user ? <FeedView /> : <LandingView />;
}
