'use client';

import React, { useEffect, useState } from 'react';
import { PenSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useContentStore } from '@/stores/content-store';
import { useAuthStore } from '@/stores/auth-store';

// Import extracted components
import { StoryItem } from './feed-story-item';
import { PostCard } from './feed-post-card';
import { CreatePostDialog } from './feed-create-post-dialog';
import { FeedReportDialog } from './feed-report-dialog';

interface FeedViewProps {
  userRole?: 'user' | 'host';
}

export default function FeedView({ userRole = 'user' }: FeedViewProps) {
  const { user } = useAuthStore();
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const { posts, stories, isLoading, fetchFeed, fetchStories, toggleLike } = useContentStore();

  useEffect(() => {
    fetchFeed();
    fetchStories();
  }, [fetchFeed, fetchStories]);

  const handleOpenReport = (postId: string) => {
    setReportingPostId(postId);
    setShowReportDialog(true);
  };

  const handleCloseReport = () => {
    setShowReportDialog(false);
    setTimeout(() => setReportingPostId(null), 200);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto min-h-screen pb-20">
      {/* ── Stories Bar ── */}
      {stories.length > 0 && (
        <div className="w-full bg-zinc-950/60 backdrop-blur-xl border-b border-white/5 py-4 pl-4 mb-6 sticky top-0 z-40">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 pr-4">
              {/* My Story Button */}
              {userRole === 'host' && (
                <div className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer w-20">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center bg-gray-900 group-hover:border-white transition-colors relative overflow-hidden">
                    <span className="text-2xl text-gray-400 group-hover:text-white transition-colors">+</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium group-hover:text-white transition-colors">Add Story</span>
                </div>
              )}
              {stories.map((story) => (
                <StoryItem key={story.id} story={story} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>
      )}

      {/* ── Feed List ── */}
      <div className="px-4 space-y-6">
        {isLoading && posts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative size-16 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"></div>
              <span className="text-xl">✨</span>
            </div>
            <p className="text-gray-400 animate-pulse text-sm">Memuat feed premium...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center glass rounded-3xl border border-white/5 bg-gray-900/40 px-6">
            <div className="size-20 rounded-full bg-white/5 flex items-center justify-center">
              <AlertCircle className="size-10 text-gray-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Feed Kosong</h3>
              <p className="text-gray-400 text-sm">Belum ada konten dari kreator yang Anda ikuti.</p>
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

      {/* ── Floating Action Button (Host Only) ── */}
      {userRole === 'host' && (
        <Button 
          className="fixed bottom-24 right-4 md:right-[calc(50%-20rem)] lg:right-[calc(50%-25rem)] size-14 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] bg-gradient-to-r from-rose-500 to-pink-600 hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.7)] transition-all z-50 text-white border-none p-0"
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