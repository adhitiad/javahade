'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GuestNavbar() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-lg bg-background/80 supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1.5"
          aria-label="Go to home"
        >
          <span className="text-xl font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
            Javahade
          </span>
        </Link>

        {/* Auth Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/auth/login')}
            className="gap-1.5"
            aria-label="Login"
          >
            <LogIn className="size-4" />
            <span className="hidden sm:inline">Masuk</span>
          </Button>

          <Button
            size="sm"
            onClick={() => router.push('/auth/register')}
            className="gap-1.5 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white border-0"
            aria-label="Register"
          >
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Daftar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
