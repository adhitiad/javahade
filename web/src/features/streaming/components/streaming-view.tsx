'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Inbox, Ticket } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStreamingStore } from '@/stores/streaming-store';
import { useUIStore } from '@/stores/ui-store';
import type { LiveStream } from '@/types';

// Import extracted components
import { StreamCard } from './streaming-card';
import { WatchStreamView } from './streaming-watch-view';

export default function StreamingView() {
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled'>('all');
  const [isBuyingTicket, setIsBuyingTicket] = useState(false);

  const { streams, currentStream, fetchStreams, fetchStreamDetail, buyTicket } = useStreamingStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const filteredStreams = streams.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const liveCount = streams.filter(s => s.status === 'live').length;
  const upcomingCount = streams.filter(s => s.status === 'scheduled').length;

  const handleWatchClick = async (stream: LiveStream) => {
    try {
      const detail = await fetchStreamDetail(stream.id);
      setSelectedStream(detail);
    } catch (err) {
      addToast((err as Error).message || 'Gagal memuat detail stream.', 'error');
    }
  };

  const handleBackToList = () => {
    setSelectedStream(null);
    fetchStreams();
  };

  if (selectedStream) {
    if (currentStream && !currentStream.has_ticket) {
      return (
        <div className="container mx-auto px-4 py-16 flex justify-center items-center text-white">
          <Card className="glass border border-white/10 rounded-3xl bg-zinc-950/90 w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400">
              <Ticket className="size-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold mb-2">Tiket Masuk Diperlukan</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Kreator memungut biaya tiket masuk sekali bayar untuk menonton streaming ini.
            </p>
            <div className="bg-black/50 rounded-2xl p-4 mb-6">
              <div className="text-sm text-gray-400 mb-1">Harga Tiket</div>
              <div className="text-3xl font-black text-rose-500">${Number(currentStream.ticket_price_usd).toFixed(2)}</div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full py-6 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-all"
                onClick={async () => {
                  setIsBuyingTicket(true);
                  try {
                    await buyTicket(currentStream.id);
                    addToast("Tiket berhasil dibeli! Akses stream terbuka.", "success");
                  } catch (err) {
                    addToast((err as Error).message || "Gagal membeli tiket.", "error");
                  } finally {
                    setIsBuyingTicket(false);
                  }
                }}
                disabled={isBuyingTicket}
              >
                {isBuyingTicket ? 'Memproses...' : 'Beli Tiket & Tonton'}
              </Button>
              <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={handleBackToList}>
                Batal
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-4">
        <WatchStreamView
          stream={selectedStream}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-rose-500" />
            Streaming Langsung
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tonton host favoritmu secara langsung
          </p>
        </div>
        <div className="flex gap-1 bg-zinc-900/50 border border-white/5 p-1 rounded-xl glass">
          {([
            { key: 'all', label: 'Semua', count: streams.length },
            { key: 'live', label: 'Live', count: liveCount },
            { key: 'scheduled', label: 'Terjadwal', count: upcomingCount },
          ] as const).map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 text-xs rounded-lg transition-all ${filter === f.key ? 'bg-rose-500 text-white' : 'text-gray-400'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-white/10 text-white">
                {f.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Stream Grid */}
      {filteredStreams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filteredStreams.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              onWatch={() => handleWatchClick(stream)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">Tidak ada streaming ditemukan</p>
        </div>
      )}
    </div>
  );
}