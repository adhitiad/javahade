'use client';
import BookingView from '@/features/booking/components/booking-view';
import { useAuthStore } from '@/stores/auth-store';

export default function BookingPage() {
  const { user } = useAuthStore();
  const isHost = user?.role === 'host' || user?.role === 'admin' || user?.role === 'superadmin';
  return <BookingView userRole={isHost ? 'host' : 'user'} />;
}
