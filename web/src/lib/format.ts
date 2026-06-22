import { Currency } from "@/types";

/**
 * Format mata uang sesuai lokal id-ID
 */
export function formatCurrency(amount: number, currency: Currency | string = 'IDR'): string {
  const isIDR = currency === 'IDR';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: isIDR ? 0 : 2,
    maximumFractionDigits: isIDR ? 0 : 2,
  }).format(amount);
}

/**
 * Mendapatkan format label mata uang seperti Rp, $, dll.
 */
export function formatCurrencyLabel(currency: Currency | string): string {
  const symbols: Record<string, string> = { IDR: 'Rp', USD: '$', SGD: 'S$', MYR: 'RM', CNY: '¥' };
  return symbols[currency] || '$';
}

/**
 * Format relative date (X menit lalu, X jam lalu)
 */
export function timeSince(dateStr: string | Date): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return 'baru saja';

  const diffMins = Math.floor(seconds / 60);
  if (diffMins < 60) return `${diffMins} menit lalu`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} bulan lalu`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} tahun lalu`;
}

/**
 * Format angka dalam bentuk K/M (contoh: 1.5K, 2M)
 */
export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Ekstrak 2 inisial pertama dari nama
 */
export function getInitials(name: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
