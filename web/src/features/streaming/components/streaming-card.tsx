'use client';

import React from 'react';
import { Eye, Clock, Users, Play, Ticket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CountdownTimer } from './streaming-countdown';
import type { LiveStream } from '@/types';

export function StreamCard({ stream, onWatch }: { stream: LiveStream; onWatch: () => void }) {
  const isLive = stream.status === 'live';
  const isScheduled = stream.status === 'scheduled';
  const hostDisplayName = stream.host_profile?.display_name || stream.host;

  return (
    <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 bg-gray-900/40 border-white/5 glass">
      <div className="relative aspect-video bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
        {isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <Badge className="bg-red-600 text-white hover:bg-red-600 px-2 py-0.5 text-[10px]">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </Badge>
            <Badge variant="secondary" className="bg-black/50 text-white hover:bg-black/50 px-1.5 py-0.5 text-[10px]">
              <Eye className="mr-1 h-3 w-3" />
              {stream.viewer_count?.toLocaleString('id-ID') || 0}
            </Badge>
          </div>
        )}
        {isScheduled && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-500 text-white hover:bg-amber-500 px-2 py-0.5 text-[10px]">
              <Clock className="mr-1 h-3 w-3" />
              Terjadwal
            </Badge>
          </div>
        )}
        {stream.is_family_only && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
            <Users className="mr-1 h-3 w-3" />
            Family
          </Badge>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="rounded-full bg-white/90 p-3 shadow-lg">
            <Play className="h-6 w-6 text-foreground" />
          </div>
        </div>
      </div>
      <CardContent className="p-3 text-white">
        <h3 className="font-semibold text-sm line-clamp-1 mb-2">{stream.title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-indigo-600 text-[10px] text-white">
                {hostDisplayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">@{stream.host}</span>
          </div>
          {stream.ticket_price_usd > 0 && (
            <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-500/30 bg-rose-500/5">
              <Ticket className="mr-1 h-3 w-3" />
              ${Number(stream.ticket_price_usd).toFixed(2)}
            </Badge>
          )}
        </div>
        {isScheduled && stream.scheduled_time && (
          <div className="mt-2">
            <CountdownTimer targetDate={stream.scheduled_time} />
          </div>
        )}
        <Button
          onClick={(e) => { e.stopPropagation(); onWatch(); }}
          className="mt-3 w-full h-8 text-xs bg-rose-500 hover:bg-rose-600 text-white border-none"
          size="sm"
        >
          {isLive ? 'Tonton Sekarang' : 'Lihat Detail'}
        </Button>
      </CardContent>
    </Card>
  );
}
