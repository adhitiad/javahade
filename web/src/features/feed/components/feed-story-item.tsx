'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Story } from '@/types';

export function StoryItem({ story }: { story: Story }) {
  const username = story.creator_profile?.user ?? story.creator ?? 'unknown';
  const fallbackChar = (username[0] ?? 'U').toUpperCase();
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer w-20">
      <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-rose-400 via-fuchsia-500 to-indigo-500 group-hover:animate-pulse shadow-lg shadow-pink-500/30 transition-all">
        <div className="w-full h-full rounded-full bg-zinc-900 border-2 border-transparent flex items-center justify-center text-xl overflow-hidden">
          <Avatar className="w-full h-full">
            <AvatarFallback className="text-white font-bold bg-transparent">
              {fallbackChar}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-xs text-white max-w-[64px] truncate text-center group-hover:text-foreground transition-colors">
        {username}
      </span>
    </div>
  );
}
