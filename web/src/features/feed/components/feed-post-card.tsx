'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pin, ImageIcon, Video, Music, Loader2, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Post } from '@/types';
import { useContentStore } from '@/stores/content-store';
import { formatCount, timeSince, getInitials } from '@/lib/format';

const PLACEHOLDER_COLORS = [
  'from-rose-400 via-fuchsia-500 to-purple-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-amber-400 via-orange-500 to-red-500',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-lime-400 via-green-500 to-emerald-600',
  'from-pink-400 via-rose-500 to-red-600',
  'from-violet-400 via-purple-500 to-fuchsia-600',
  'from-teal-400 via-cyan-500 to-sky-600',
];

function getPlaceholderGradient(index: number): string {
  return PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface PostCardProps {
  post: Post;
  index: number;
  onLike: (id: string) => void;
  onReport?: (id: string) => void;
}

export function PostCard({ post, index, onLike, onReport }: PostCardProps) {
  const { comments, fetchComments, addComment } = useContentStore();
  const router = useRouter();
  const creator = post.creator_profile;
  const creatorUsername = creator?.user ?? 'unknown';
  const creatorName = creator?.display_name ?? 'Unknown';
  const contentPreview = post.body.length > 120 ? post.body.slice(0, 120) + '...' : post.body;

  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const liked = post.is_liked ?? false;

  const handleLike = () => onLike(post.id);

  const handleToggleComments = () => {
    if (!showComments) fetchComments(post.id);
    setShowComments(!showComments);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment(post.id, newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const postComments = comments[post.id] || [];

  return (
    <Card className="glass rounded-3xl border border-white/5 overflow-hidden mb-6 animate-fade-in shadow-[0_0_20px_rgba(0,0,0,0.3)] bg-gray-950/40 gap-0 py-0 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="p-5 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 p-[2px] shadow-lg shadow-pink-500/30 overflow-hidden">
            <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-lg uppercase font-bold text-white">
              {getInitials(creatorName)[0]}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-white flex items-center gap-1">
              {creatorName}
              <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-0.5 size-4">
                <CheckIcon className="size-2 text-white" />
              </span>
            </h4>
            <p className="text-xs text-gray-400">@{creatorUsername} • {timeSince(post.created_at)}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-gray-500 hover:text-white transition-colors p-1" type="button">
              <span className="text-xs font-bold">•••</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-red-500 focus:text-red-500 cursor-pointer" onClick={() => onReport?.(post.id)}>
              Laporkan Postingan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Text */}
      {post.body && (
        <div className="px-5 pb-3">
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{contentPreview}</p>
        </div>
      )}

      {/* Post Media / Locked Premium Content */}
      {(post.content_type === 'image' || post.content_type === 'video') && (
        <>
          {post.is_premium ? (
            <div className="relative w-full aspect-square bg-zinc-900 border-y border-white/5 flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xl z-10 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-4xl mb-4">🔒</span>
                <h3 className="text-xl font-bold text-white mb-2">Konten Eksklusif</h3>
                <p className="text-sm text-gray-400 mb-6">Berlangganan untuk membuka foto dan video rahasia.</p>
                <Button className="px-8 py-3 bg-white hover:bg-gray-200 text-black font-bold rounded-full border-none" onClick={() => router.push(`/creator/${creatorUsername}`)}>
                  Subscribe Now
                </Button>
              </div>
              <div className="w-full h-full bg-gradient-to-tr from-pink-900 to-purple-900 opacity-50 blur-sm" />
            </div>
          ) : (
            <div className="relative aspect-[4/3] bg-muted border-y border-white/5 overflow-hidden flex justify-center bg-black/50">
              <div className={`absolute inset-0 bg-gradient-to-br ${getPlaceholderGradient(index)} opacity-30`} />
              {post.content_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-black/50 rounded-full p-3"><Video className="size-6 text-white" /></div>
                </div>
              )}
              {post.content_type === 'image' && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <ImageIcon className="size-10 text-muted-foreground/40" />
                </div>
              )}
              {post.is_pinned && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur-sm"><Pin className="size-3" /> Disematkan</Badge>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {post.content_type === 'audio' && (
        <div className="p-4 bg-muted/55 flex items-center gap-3 border-y border-white/5">
          <div className="bg-primary rounded-full p-2.5"><Music className="size-5 text-primary-foreground" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{post.title || 'Audio Eksklusif'}</p>
            <div className="h-1.5 bg-muted rounded-full mt-2"><div className="h-full bg-primary rounded-full w-1/3" /></div>
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="p-4 flex justify-between items-center bg-white/[0.02] border-t border-white/5">
        <div className="flex gap-4">
          <button className={`flex items-center gap-2 transition-all transform active:scale-90 ${liked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`} onClick={handleLike}>
            <span className={`text-xl ${liked ? 'scale-110' : ''}`}>{liked ? '❤️' : '🤍'}</span>
            <span className={`font-medium ${liked ? 'text-pink-400' : ''}`}>{formatCount(post.like_count)}</span>
          </button>
          <button onClick={handleToggleComments} className={`flex items-center gap-2 transition-colors ${showComments ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}`}>
            <span className="text-xl">💬</span>
            <span className="font-medium">{formatCount(post.comment_count)}</span>
          </button>
          <button className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors" onClick={() => alert(`Kirim tip untuk @${creatorUsername}!`)}>
            <span className="text-xl">💰</span>
            <span className="font-medium">Tip</span>
          </button>
        </div>
        <button className="text-gray-400 hover:text-white transition-colors" onClick={() => alert('Disimpan ke Bookmark!')}><span className="text-xl">🔖</span></button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-4 border-t border-white/5 bg-zinc-950/60 space-y-4">
          <Separator className="bg-white/5" />
          <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
            {postComments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Belum ada komentar.</p>
            ) : (
              postComments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5 items-start text-xs">
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                      {getInitials(comment.user?.display_name ?? comment.user?.username ?? 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white/5 rounded-2xl p-2.5 flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">@{comment.user?.username}</span>
                      <span className="text-[10px] text-muted-foreground">{timeSince(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-300 leading-normal">{comment.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendComment} className="flex gap-2 pt-2">
            <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Tulis komentar..." className="bg-zinc-900 border-white/10 text-white rounded-xl h-10 text-xs" />
            <Button type="submit" disabled={isSubmittingComment || !newComment.trim()} size="icon" className="rounded-xl size-10 shrink-0 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500">
              {isSubmittingComment ? <Loader2 className="size-4 animate-spin text-white" /> : <Send className="size-4 text-white" />}
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
