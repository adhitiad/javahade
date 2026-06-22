'use client';

import { Home, Search, Radio, MessageCircle, Wallet, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const BOTTOM_NAV = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/search', label: 'Temukan', icon: Search },
  { href: '/streaming', label: 'Live', icon: Radio },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/wallet', label: 'Dompet', icon: Wallet },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {BOTTOM_NAV.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[48px]',
                isActive ? 'text-rose-500 scale-105' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon
                className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')}
              />
              <span
                className={cn('text-[10px] font-medium transition-all', isActive && 'font-bold')}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More menu for logged in users */}
        {user && (
          <Link
            href="/settings"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[48px]',
              pathname === '/settings'
                ? 'text-rose-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <UserCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">Lainnya</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
