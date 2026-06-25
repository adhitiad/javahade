'use client';

import {
  Home,
  Search,
  UserCircle,
  CalendarCheck,
  Wallet,
  Radio,
  MessageCircle,
  Users,
  LayoutDashboard,
  Layers,
  DollarSign,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  /** If set, only shown when user role matches */
  role?: 'host' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Feed', icon: Home, href: '/' },
  { label: 'Search', icon: Search, href: '/search' },
  { label: 'Creator Profile', icon: UserCircle, href: '/creator' },
  { label: 'Booking', icon: CalendarCheck, href: '/booking' },
  { label: 'Wallet', icon: Wallet, href: '/wallet' },
  { label: 'Live Streaming', icon: Radio, href: '/streaming' },
  { label: 'Chat', icon: MessageCircle, href: '/chat' },
  { label: 'Family Groups', icon: Users, href: '/family' },
];

const HOST_ITEMS: NavItem[] = [
  { label: 'Host Dashboard', icon: LayoutDashboard, href: '/creator', role: 'host' },
  { label: 'My Tiers', icon: Layers, href: '/host/tiers', role: 'host' },
  { label: 'Manage Rates', icon: DollarSign, href: '/booking', role: 'host' },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Admin Dashboard', icon: ShieldCheck, href: '/admin', role: 'admin' },
];

function SidebarNavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-gradient-to-r from-rose-500/10 to-orange-500/10 text-rose-500 dark:from-rose-500/20 dark:to-orange-500/20 dark:text-rose-400'
          : 'text-muted-foreground'
      )}
    >
      <Icon className={cn('size-5 shrink-0', isActive && 'text-rose-500 dark:text-rose-400')} />
      <span className="flex-1 text-left">{item.label}</span>
      {isActive && <ChevronRight className="size-4 text-rose-500/60 dark:text-rose-400/60" />}
    </button>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isHost = userRole === 'host';

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'G';

  const handleNavigate = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent
        side="left"
        className="w-72 sm:max-w-xs p-0 flex flex-col bg-background/95 backdrop-blur-xl border-r"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-5 pb-3">
          <SheetTitle className="text-lg font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
            Javahade
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Navigate your platform
          </SheetDescription>
        </SheetHeader>

        <Separator className="mx-4 w-auto" />

        {/* Navigation Links */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="flex flex-col gap-1" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                onClick={() => handleNavigate(item.href)}
              />
            ))}

            {/* Become Host Link (Female user only) */}
            {user && !isHost && !isAdmin && user.gender === 'F' && (
              <SidebarNavLink
                item={{ label: 'Jadi Host (Kreator)', icon: Sparkles, href: '/host/become' }}
                isActive={isActive('/host/become')}
                onClick={() => handleNavigate('/host/become')}
              />
            )}

            {/* Host-specific links */}
            {isHost && (
              <>
                <div className="pt-2 pb-1">
                  <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Creator Tools
                  </span>
                </div>
                {HOST_ITEMS.map((item) => (
                  <SidebarNavLink
                    key={`host-${item.label}`}
                    item={item}
                    isActive={isActive(item.href)}
                    onClick={() => handleNavigate(item.href)}
                  />
                ))}
              </>
            )}

            {/* Admin-specific links */}
            {isAdmin && (
              <>
                <div className="pt-2 pb-1">
                  <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Administration
                  </span>
                </div>
                {ADMIN_ITEMS.map((item) => (
                  <SidebarNavLink
                    key={`admin-${item.label}`}
                    item={item}
                    isActive={isActive(item.href)}
                    onClick={() => handleNavigate(item.href)}
                  />
                ))}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* Bottom: User info + Logout */}
        <Separator className="mx-4 w-auto" />
        <div className="px-4 py-3 flex flex-col gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
                <AvatarFallback className="bg-gradient-to-br from-rose-500 to-orange-500 text-white text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    ${user.balance_usd?.toFixed(2) ?? '0.00'}
                  </span>
                  {(isAdmin || isHost) && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 leading-tight"
                    >
                      {isAdmin ? 'Admin' : 'Host'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleNavigate('/login')}
            >
              Sign In
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => {
              logout();
              setSidebarOpen(false);
            }}
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </Button>

          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/70">
            <Link href="/terms" onClick={() => setSidebarOpen(false)} className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" onClick={() => setSidebarOpen(false)} className="hover:text-foreground">Privacy</Link>
            <Link href="/2257" onClick={() => setSidebarOpen(false)} className="hover:text-foreground">18 U.S.C. 2257</Link>
            <Link href="/dmca" onClick={() => setSidebarOpen(false)} className="hover:text-foreground">DMCA</Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
