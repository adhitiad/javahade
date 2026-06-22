import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AVATAR_COLORS, getInitials, formatConversationTime } from './chat-helpers';

export function ChatConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: any; // ChatConversation
  isActive: boolean;
  onClick: () => void;
}) {
  const displayName = conversation.displayName || conversation.username;
  const colorIndex = conversation.username.length % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 text-left transition-colors rounded-lg hover:bg-accent ${
        isActive ? 'bg-accent' : ''
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarFallback className={`${avatarColor} text-white text-sm`}>
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {conversation.isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate">{displayName}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {conversation.last_message_time ? formatConversationTime(conversation.last_message_time) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">{conversation.last_message || ''}</p>
          {conversation.unread_count > 0 && (
            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-rose-500 hover:bg-rose-600 shrink-0">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
