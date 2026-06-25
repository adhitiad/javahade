"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PenSquare,
  AlertCircle,
  Home,
  Wallet,
  ShieldCheck,
  User,
  CalendarCheck,
  Star,
  Users,
  Radio,
  Ticket,
  Image,
  Video,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useContentStore } from "@/stores/content-store";
import { useAuthStore } from "@/stores/auth-store";

// Import extracted components
import { StoryItem } from "./feed-story-item";
import { PostCard } from "./feed-post-card";
import { CreatePostDialog } from "./feed-create-post-dialog";
import { FeedReportDialog } from "./feed-report-dialog";

export default function FeedView() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  const { 
    posts, 
    stories, 
    suggestedCreators,
    isLoading, 
    fetchFeed, 
    fetchStories, 
    fetchSuggestedCreators,
    toggleLike 
  } = useContentStore();
  const { user } = useAuthStore();

  const router = useRouter();

  const isHost =
    user?.role === "host" ||
    user?.role === "admin" ||
    user?.role === "superadmin";
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isCreator = isHost; // alias agar sesuai semantik Django

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "U";

  useEffect(() => {
    fetchFeed();
    fetchStories();
    fetchSuggestedCreators();
  }, [fetchFeed, fetchStories, fetchSuggestedCreators]);

  const handleOpenReport = (postId: string) => {
    setReportingPostId(postId);
    setShowReportDialog(true);
  };

  const handleCloseReport = () => {
    setShowReportDialog(false);
    setTimeout(() => setReportingPostId(null), 200);
  };

  // ── Nav items (mirror feed.html) ─────────────────────────────────────────
  const navItems = [
    { href: "/", label: "Beranda", icon: <Home className="size-5" />, active: true, color: "text-purple-400 bg-purple-600/20" },
    { href: "/wallet", label: "Dompet Finansial", icon: <Wallet className="size-5" />, color: "text-emerald-400 hover:bg-emerald-500/10" },
    ...(isAdmin ? [{ href: "/admin", label: "Dasbor Admin", icon: <ShieldCheck className="size-5" />, color: "text-red-400 hover:bg-red-500/10" }] : []),
    ...(isCreator ? [
      { href: `/creator/${user?.username ?? ""}`, label: "Profil Saya", icon: <User className="size-5" />, color: "text-gray-400 hover:bg-white/5 hover:text-white" },
      { href: "/bookings/host", label: "Pesanan Masuk", icon: <CalendarCheck className="size-5" />, color: "text-gray-400 hover:bg-white/5 hover:text-white" },
    ] : user?.gender === "F" ? [
      { href: "/become-host", label: "Jadi Host", icon: <Star className="size-5" />, color: "text-pink-400 hover:bg-white/5 hover:text-pink-300" },
    ] : []),
    { href: "/family", label: "Family", icon: <Users className="size-5" />, color: "text-gray-400 hover:bg-white/5 hover:text-white" },
    ...(isCreator || isAdmin ? [
      { href: "/live", label: "Live Stream", icon: <Radio className="size-5" />, color: "text-gray-400 hover:bg-white/5 hover:text-white" },
      { href: "/bookings", label: "Pesanan Privat", icon: <Ticket className="size-5" />, color: "text-gray-400 hover:bg-white/5 hover:text-white" },
    ] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 animate-fade-in">

      {/* ══════════════════════════════════════════════════════════
          LEFT SIDEBAR — Profil mini + Navigasi (hidden di mobile)
          ══════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 h-fit space-y-6">

        {/* User Mini Profile */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="size-12 shadow-lg">
              {user?.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
              <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-lg">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-white truncate max-w-[120px]">
                @{user?.username ?? "guest"}
              </h3>
              <p className="text-xs text-gray-400">{user?.email ?? ""}</p>
            </div>
          </div>
          {isCreator && (
            <Link
              href="/settings"
              className="block w-full py-2.5 px-4 text-center rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-colors"
            >
              Edit Profil Host
            </Link>
          )}
        </div>

        {/* Menu Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-3 rounded-xl font-semibold transition-colors ${item.color} ${item.active ? "font-bold" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          MAIN FEED — Stories + Compose + Posts
          ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-2xl w-full mx-auto space-y-6">

        {/* ── Story / Live Highlights ── */}
        <div className="glass p-4 rounded-3xl border border-white/5">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 pr-2">
              {/* Add Story button (host/admin only) */}
              {isHost && (
                <button
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  onClick={() => router.push("/live")}
                >
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                    <span className="text-2xl text-gray-400 group-hover:text-white">+</span>
                  </div>
                  <span className="text-xs text-gray-400">Go Live</span>
                </button>
              )}

              {stories.length > 0 ? (
                stories.map((story) => (
                  <StoryItem key={story.id} story={story} />
                ))
              ) : (
                <div className="flex-shrink-0 flex items-center justify-center h-16 px-4">
                  <span className="text-xs text-gray-500">Belum ada highlight.</span>
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        {/* ── Compose Post (host/admin only) ── */}
        {isHost && (
          <div className="glass p-5 rounded-3xl border border-white/5">
            <div className="flex gap-4">
              <Avatar className="size-10 flex-shrink-0">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
                <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <input
                type="text"
                placeholder="Ada konten eksklusif hari ini?"
                className="flex-1 bg-transparent border-none text-white focus:outline-none text-lg placeholder-gray-500 cursor-pointer"
                readOnly
                onClick={() => setShowCreatePost(true)}
              />
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
              <div className="flex gap-1 text-xl">
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowCreatePost(true)}
                  title="Foto"
                >
                  <Image className="size-5 text-gray-400" />
                </button>
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowCreatePost(true)}
                  title="Video"
                >
                  <Video className="size-5 text-gray-400" />
                </button>
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setShowCreatePost(true)}
                  title="Audio"
                >
                  <Mic className="size-5 text-gray-400" />
                </button>
              </div>
              <button
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full transition-colors text-sm"
                onClick={() => setShowCreatePost(true)}
              >
                Post
              </button>
            </div>
          </div>
        )}

        {/* ── Feed Posts ── */}
        <div className="space-y-6">
          {isLoading && posts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative size-16 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin" />
                <span className="text-xl">✨</span>
              </div>
              <p className="text-gray-400 animate-pulse text-sm">
                Memuat feed premium...
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center glass rounded-3xl border border-white/5 bg-gray-900/40 px-6">
              <div className="size-20 rounded-full bg-white/5 flex items-center justify-center">
                <AlertCircle className="size-10 text-gray-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Feed Kosong</h3>
                <p className="text-gray-400 text-sm">
                  Belum ada konten dari kreator yang Anda ikuti.
                </p>
              </div>
            </div>
          ) : (
            posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                index={i}
                onLike={toggleLike}
                onReport={handleOpenReport}
              />
            ))
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════
          RIGHT SIDEBAR — Saran Kreator + Footer (hidden di mobile)
          ══════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:block w-80 flex-shrink-0 sticky top-24 h-fit space-y-6">

        {/* Saran Kreator */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <h3 className="font-bold text-white mb-4">Saran Kreator</h3>
          <div className="space-y-4">
            {suggestedCreators.map((creator) => (
              <div key={creator.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 flex-shrink-0">
                    {typeof creator.user === 'object' && creator.user?.avatar && <AvatarImage src={creator.user.avatar} alt={creator.username} />}
                    <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-sm">
                      {creator.display_name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-white">{creator.display_name}</p>
                    <p className="text-xs text-gray-400">@{creator.username}</p>
                  </div>
                </div>
                <Link
                  href={`/creator/${creator.username}`}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Lihat
                </Link>
              </div>
            ))}
            {suggestedCreators.length === 0 && !isLoading && (
              <p className="text-xs text-gray-500">Tidak ada saran saat ini.</p>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-xs text-gray-500 flex gap-2 flex-wrap px-2">
          <Link href="/about" className="hover:underline hover:text-gray-300 transition-colors">Tentang</Link>
          <Link href="/help" className="hover:underline hover:text-gray-300 transition-colors">Bantuan</Link>
          <Link href="/privacy" className="hover:underline hover:text-gray-300 transition-colors">Privasi</Link>
          <Link href="/terms" className="hover:underline hover:text-gray-300 transition-colors">Syarat</Link>
          <span>© 2026 Javahade</span>
        </div>
      </aside>

      {/* ── Floating Action Button (Host Only, mobile) ── */}
      {isHost && (
        <Button
          className="fixed bottom-24 right-4 lg:hidden size-14 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] bg-gradient-to-r from-rose-500 to-pink-600 hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.7)] transition-all z-50 text-white border-none p-0"
          onClick={() => setShowCreatePost(true)}
        >
          <PenSquare className="size-6" />
        </Button>
      )}

      {/* ── Dialogs ── */}
      <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} />
      <FeedReportDialog open={showReportDialog} postId={reportingPostId} onClose={handleCloseReport} />
    </div>
  );
}

