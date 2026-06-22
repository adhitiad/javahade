import { BookingStatus, Currency } from '@/types';

export function formatCurrency(amount: number, currency: Currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusBadge(status: BookingStatus): { label: string; className: string } {
  const map: Record<BookingStatus, { label: string; className: string }> = {
    pending: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Dikonfirmasi', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-800' },
    completed: { label: 'Selesai', className: 'bg-blue-100 text-blue-800' },
  };
  return map[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
}
