'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  Search,
  Bell,
  Wallet,
  Menu,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, searchQuery, setSearchQuery, isMobile, setIsMobile } =
    useUIStore();
  const { theme, setTheme } = useTheme();
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Hydration guard
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Responsive detection
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [setIsMobile]);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchQuery.trim()) {
        router.push('/search');
      }
    },
    [searchQuery, router]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isHost = user?.role === 'host';

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-lg bg-background/80 supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        {/* Left: Hamburger (mobile) + Logo */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </Button>

          <Link
            href="/"
            className="flex items-center gap-1.5"
            aria-label="Go to feed"
          >
            <span className="text-xl font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
              Javahade
            </span>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="flex-1 flex justify-center max-w-md mx-auto hidden sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search creators, posts..."
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:border-ring"
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="hidden sm:flex"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          )}

          {/* Notification Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 size-4 p-0 flex items-center justify-center text-[10px] leading-none bg-rose-600 border-0 rounded-full text-white"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[350px] overflow-y-auto">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} baru
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="divide-y divide-white/5">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={`flex flex-col items-start gap-1 py-2.5 px-3 cursor-pointer transition-colors ${
                        !n.is_read ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''
                      }`}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                    >
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
                        )}
                        {n.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground line-clamp-2">
                        {n.body}
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Tidak ada notifikasi
                  </div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {unreadCount > 0 && (
                <DropdownMenuItem
                  className="justify-center text-center text-xs font-semibold text-rose-500 focus:text-rose-500 cursor-pointer py-2"
                  onClick={() => markAllAsRead()}
                >
                  Tandai semua dibaca
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Wallet */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex gap-1.5"
            onClick={() => router.push('/wallet')}
            aria-label="Open wallet"
          >
            <Wallet className="size-4" />
            <span className="text-sm font-medium">
              ${user?.balance_usd?.toFixed(2) ?? '0.00'}
            </span>
          </Button>

          <Separator orientation="vertical" className="mx-1 hidden sm:block h-6" />

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0"
                aria-label="User menu"
              >
                <Avatar className="size-8">
                  {user?.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
                  <AvatarFallback className="bg-gradient-to-br from-rose-500 to-orange-500 text-white text-xs font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium leading-none">{user?.username ?? 'Guest'}</p>
                  <p className="text-xs text-muted-foreground leading-none">
                    {user?.email ?? 'Not signed in'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push('/settings')}
                >
                  <User className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push('/settings')}
                >
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                {isHost && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/creator/' + (user?.username ?? ''))}
                  >
                    <LayoutDashboard className="size-4" />
                    Creator Dashboard
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/admin')}
                  >
                    <ShieldCheck className="size-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={logout}
              >
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isMobile && (
        <div className="px-4 pb-2">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search creators, posts..."
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:border-ring"
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      )}
    </header>
  );
}
