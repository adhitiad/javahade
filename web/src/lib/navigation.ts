// ============================================================
// Navigation helper — maps NavPage keys to URL paths
// ============================================================
import type { NavPage } from '@/types';

/**
 * Mapping dari NavPage identifier ke URL path.
 * Digunakan oleh komponen yang masih butuh NavPage key → path conversion.
 */
export const PAGE_PATHS: Record<NavPage, string> = {
  feed: '/',
  search: '/search',
  creator: '/creator',
  booking: '/booking',
  wallet: '/wallet',
  streaming: '/streaming',
  chat: '/chat',
  family: '/family',
  admin: '/admin',
  settings: '/settings',
  kyc: '/kyc',
  become_host: '/host/become',
  manage_tiers: '/host/tiers',
  login: '/login',
  register: '/register',
};

/**
 * Get URL path for a NavPage key.
 */
export function getPagePath(page: NavPage): string {
  return PAGE_PATHS[page] ?? '/';
}

/**
 * Get NavPage key from current pathname.
 */
export function getNavPageFromPath(pathname: string): NavPage {
  // Exact matches first
  for (const [page, path] of Object.entries(PAGE_PATHS)) {
    if (pathname === path) return page as NavPage;
  }
  // Prefix matches for dynamic routes
  if (pathname.startsWith('/creator/')) return 'creator';
  if (pathname.startsWith('/host/')) return 'become_host';
  return 'feed';
}
