import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Heart, ThumbsDown, MessageCircle, Eye, Lock, Pin, Play, ImageIcon, Music, Star } from 'lucide-react';
import type { Post } from '@/types';
import { formatCount, MEDIA_GRADIENTS } from './creator-helpers';

export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${star <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function CreatorPostCard({
  post,
  index,
  onReport,
}: {
  post: Post;
  index: number;
  onReport?: (id: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [unliked, setUnliked] = useState(false);

  const handleLike = () => {
    setLiked((prev) => !prev);
    setUnliked(false);
  };
  const handleUnlike = () => {
    setUnliked((prev) => !prev);
    setLiked(false);
  };

  return (
    <Card className="overflow-hidden gap-0 py-0 hover:shadow-md transition-shadow">
      {(post.content_type === "image" || post.content_type === "video") && (
        <div className="relative aspect-[16/9] bg-muted">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${MEDIA_GRADIENTS[index % MEDIA_GRADIENTS.length]} opacity-20`}
          />
          {post.content_type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 rounded-full p-3">
                <Play className="size-6 text-white fill-white" />
              </div>
            </div>
          )}
          {post.content_type === "image" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="size-10 text-muted-foreground/30" />
            </div>
          )}
          {post.is_premium && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive" className="gap-1">
                <Lock className="size-3" />
                Premium
              </Badge>
            </div>
          )}
          {post.is_pinned && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="gap-1 bg-background/80 backdrop-blur-sm"
              >
                <Pin className="size-3" />
              </Badge>
            </div>
          )}
        </div>
      )}
      {post.content_type === "audio" && (
        <div className="p-4 bg-muted/50 flex items-center gap-3">
          <div className="bg-primary rounded-full p-2.5">
            <Music className="size-5 text-primary-foreground" />
          </div>
          <p className="text-sm font-medium truncate flex-1">
            {post.title ?? "Audio"}
          </p>
        </div>
      )}
      <CardContent className="p-4 gap-2">
        <div className="flex justify-between items-start gap-2">
          {post.title && (
            <h3 className="text-sm font-semibold leading-snug flex-1">
              {post.title}
            </h3>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="text-muted-foreground hover:text-white transition-colors p-1"
                type="button"
              >
                <span className="text-xs font-bold">•••</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500 cursor-pointer"
                onClick={() => onReport?.(post.id)}
              >
                Laporkan Postingan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {post.body}
        </p>
      </CardContent>
      <Separator />
      <CardFooter className="px-4 py-2.5 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 text-xs ${liked ? "text-red-500" : "text-muted-foreground"}`}
          onClick={handleLike}
        >
          <Heart className={`size-4 ${liked ? "fill-red-500" : ""}`} />
          <span>{formatCount(post.like_count + (liked ? 1 : 0))}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 text-xs ${unliked ? "text-orange-500" : "text-muted-foreground"}`}
          onClick={handleUnlike}
        >
          <ThumbsDown
            className={`size-4 ${unliked ? "fill-orange-500" : ""}`}
          />
          <span>{formatCount(post.unlike_count + (unliked ? 1 : 0))}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground"
        >
          <MessageCircle className="size-4" />
          <span>{formatCount(post.comment_count)}</span>
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground"
        >
          <Eye className="size-4" />
          <span>{formatCount(post.view_count)}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
