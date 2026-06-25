"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  Navbar,
  Sidebar,
  NSFWGate,
  BottomNav,
  MainContent,
  GuestNavbar,
} from "@/components/layout";
import { useAuthStore } from "@/stores/auth-store";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { nsfwAccepted, setIsMobile } = useUIStore();
  const { fetchUser, isAuthenticated } = useAuthStore();

  // Hydration-safe mounted check
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);

    // Fetch current user from Django session to populate Zustand store
    fetchUser();

    return () => window.removeEventListener("resize", check);
  }, [setIsMobile, fetchUser]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Memuat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* NSFW Age Gate */}
      {!nsfwAccepted && <NSFWGate />}
      {/* Jika sudah login → Navbar lengkap, belum login → GuestNavbar */}
      {mounted && (isAuthenticated ? <Navbar /> : <GuestNavbar />)}

      {/* Sidebar hanya muncul jika sudah login */}
      {mounted && isAuthenticated && <Sidebar />}

      {/* Main Content */}
      <MainContent>{children}</MainContent>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
