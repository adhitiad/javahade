import React from 'react';
import { FileText } from 'lucide-react';
import { CreatorPostCard } from './creator-post-card';
import type { Post, CreatorProfile } from '@/types';

interface CreatorPostsTabProps {
  isSubscribed: boolean;
  creatorProfile: CreatorProfile;
  posts: Post[];
  setReportingPostId: (id: string) => void;
  setShowReportDialog: (show: boolean) => void;
}

export function CreatorPostsTab({
  isSubscribed,
  creatorProfile,
  posts,
  setReportingPostId,
  setShowReportDialog,
}: CreatorPostsTabProps) {
  if (!isSubscribed) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center bg-zinc-950/20 border border-white/5 rounded-3xl mt-4">
        <span className="text-6xl mb-4 opacity-70 animate-bounce">🔒</span>
        <h3 className="text-xl font-bold text-white mb-2">Konten Eksklusif</h3>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          Berlangganan untuk melihat semua foto dan video eksklusif dari {creatorProfile.display_name}.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {posts.map((post, i) => (
          <CreatorPostCard
            key={post.id}
            post={post}
            index={i}
            onReport={(id) => {
              setReportingPostId(id);
              setShowReportDialog(true);
            }}
          />
        ))}
      </div>
      {posts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="size-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada postingan dari creator ini</p>
        </div>
      )}
    </>
  );
}
