'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Eye, Users, Flame, MessageCircle, Gift, Send, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useStreamingStore } from '@/stores/streaming-store';
import { streamApi } from '@/lib/api';
import type { LiveStream, ChatMessage, StreamBounty } from '@/types';
import { Virtuoso } from 'react-virtuoso';
import { StickerModal } from './streaming-sticker-modal';
import { MeetingProvider, useMeeting, useParticipant } from "@videosdk.live/react-sdk";

const AVATAR_COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'];

// --- Video SDK Components ---

function ParticipantView({ participantId }: { participantId: string }) {
  const { webcamStream, micStream, webcamOn, micOn, isLocal } = useParticipant(participantId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (webcamOn && webcamStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(webcamStream.track);
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [webcamStream, webcamOn]);

  useEffect(() => {
    if (audioRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        audioRef.current.srcObject = mediaStream;
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);

  return (
    <div className="w-full h-full relative bg-black">
      <audio ref={audioRef} autoPlay muted={isLocal} />
      {webcamOn ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
          <Users className="w-12 h-12 text-zinc-700" />
        </div>
      )}
    </div>
  );
}

function ActiveVideoView({ isHost }: { isHost: boolean }) {
  const { participants, localParticipant, join, leave } = useMeeting();

  useEffect(() => {
    join();
    return () => { leave(); };
  }, [join, leave]);

  const remoteParticipants = [...participants.values()].filter(p => p.id !== localParticipant?.id);

  if (isHost && localParticipant) {
    return <ParticipantView participantId={localParticipant.id} />;
  }

  if (!isHost && remoteParticipants.length > 0) {
    return <ParticipantView participantId={remoteParticipants[0].id} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <span className="text-white/50 text-sm animate-pulse">Menunggu siaran...</span>
    </div>
  );
}

function HostControls({ onEndStream, camEnabled, micEnabled, onToggleCam, onToggleMic }: any) {
  const { toggleMic, toggleWebcam } = useMeeting();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-25 flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className={`p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border-none ${!camEnabled ? 'bg-red-500/50' : ''}`}
        onClick={() => {
           toggleWebcam();
           onToggleCam(!camEnabled);
        }}
        title="Toggle Kamera"
      >
        <Users className="w-5 h-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={`p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border-none ${!micEnabled ? 'bg-red-500/50' : ''}`}
        onClick={() => {
           toggleMic();
           onToggleMic(!micEnabled);
        }}
        title="Toggle Mikrofon"
      >
        <Flame className="w-5 h-5" />
      </Button>
      <Button
        className="px-5 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/25 border-none"
        onClick={onEndStream}
      >
        Akhiri Siaran
      </Button>
    </div>
  );
}

// --- Main Components ---

export function WatchStreamView({
  stream,
  onBack,
}: {
  stream: LiveStream;
  onBack: () => void;
}) {
  const { watchInfo, fetchStreamWatchInfo, clearStream } = useStreamingStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    fetchStreamWatchInfo(stream.id).catch((err) => {
      addToast(err.message || 'Gagal terhubung ke sistem streaming.', 'error');
    });
    return () => {
      clearStream();
    };
  }, [stream.id, fetchStreamWatchInfo, clearStream, addToast]);

  if (!watchInfo) {
    return (
      <div className="h-full flex items-center justify-center text-white">
        <span className="animate-pulse">Menghubungkan ke siaran...</span>
      </div>
    );
  }

  const token = process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN || "";

  return (
    <MeetingProvider
      config={{
        meetingId: stream.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || "fallbackid", // ensure valid ID
        name: watchInfo.is_host ? "Host" : "Viewer",
        micEnabled: watchInfo.is_host,
        webcamEnabled: watchInfo.is_host,
        debugMode: false,
      }}
      token={token}
    >
      <WatchStreamViewInner stream={stream} onBack={onBack} watchInfo={watchInfo} />
    </MeetingProvider>
  );
}

function WatchStreamViewInner({
  stream,
  onBack,
  watchInfo,
}: {
  stream: LiveStream;
  onBack: () => void;
  watchInfo: any;
}) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [stickerModalOpen, setStickerModalOpen] = useState(false);
  const [activeStickerUrl, setActiveStickerUrl] = useState<string | null>(null);
  const [watermarkPos, setWatermarkPos] = useState({ x: 10, y: 10, opacity: 0.2 });
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const [donators, setDonators] = useState<Record<string, number>>({});
  const [isTampered, setIsTampered] = useState(false);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { user } = useAuthStore();
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [bounties, setBounties] = useState<(StreamBounty & { challenger_name: string })[]>([]);

  useEffect(() => {
    if (!stream.id) return;
    streamApi.get<{ results: any[] }>(`/api/v1/streams/${stream.id}/bounties`)
      .then((res) => {
        if (res.results) setBounties(res.results);
      }).catch(() => {});
  }, [stream.id]);

  useEffect(() => {
    if (!watchInfo) return;
    const username = user?.username || 'Guest';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
    const wsBaseUrl = process.env.NEXT_PUBLIC_STREAM_API_URL?.replace('http', 'ws') || 'ws://localhost:3334';
    const wsUrl = `${wsBaseUrl}/ws/stream/${stream.id}/interact?token=${encodeURIComponent(token)}&username=${encodeURIComponent(username)}`;
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'comment':
          setChatMessages((prev) => [
            ...prev,
            {
              id: `comment_${Date.now()}_${Math.random()}`,
              sender: data.payload.username,
              receiver: stream.host,
              body: data.payload.content,
              is_read: true,
              created_at: new Date().toISOString(),
              sender_profile: { username: data.payload.username },
            },
          ]);
          break;
        case 'reaction':
          spawnReaction(data.payload.reaction);
          break;
        case 'gift':
          setChatMessages((prev) => [
            ...prev,
            {
              id: `gift_${Date.now()}_${Math.random()}`,
              sender: data.payload.username,
              receiver: stream.host,
              body: `🎁 Mengirim stiker senilai $${Number(data.payload.amount || 0).toFixed(2)}!`,
              is_read: true,
              created_at: new Date().toISOString(),
              sender_profile: { username: data.payload.username },
            },
          ]);
          if (data.payload.sticker_url) {
            setActiveStickerUrl(data.payload.sticker_url);
            setTimeout(() => {
              setActiveStickerUrl(null);
            }, 3000);
          }
          setDonators((prev) => {
            const username = data.payload.username;
            const amount = Number(data.payload.amount) || 0;
            return { ...prev, [username]: (prev[username] || 0) + amount };
          });
          break;
        case 'bounty_updated':
          const updatedBounty = data.payload;
          setBounties(prev => {
            const exists = prev.find(b => b.id === updatedBounty.id);
            if (exists) {
              return prev.map(b => b.id === updatedBounty.id ? updatedBounty : b);
            }
            return [updatedBounty, ...prev];
          });
          break;
      }
    };

    return () => socket.close();
  }, [watchInfo, stream.id, stream.host, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomX = Math.floor(Math.random() * 60) + 10;
      const randomY = Math.floor(Math.random() * 50) + 10;
      const randomOpacity = (Math.random() * 0.3) + 0.1;
      setWatermarkPos({ x: randomX, y: randomY, opacity: randomOpacity });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (watchInfo?.is_host || isTampered) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const removedNodes = Array.from(mutation.removedNodes);
          const hasWatermarkRemoved = removedNodes.some(
            (node) => {
              const el = node as HTMLElement;
              return el.id === 'forensic-watermark' || el.id === 'invisible-watermark-grid' || el.id === 'drm-container';
            }
          );
          if (hasWatermarkRemoved) {
            setIsTampered(true);
            return;
          }
        } else if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target.id === 'forensic-watermark' || target.id === 'invisible-watermark-grid' || target.id === 'drm-container') {
            const style = window.getComputedStyle(target);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
              setIsTampered(true);
              return;
            }
          }
        }
      }
    });

    if (videoWrapperRef.current) {
      observer.observe(videoWrapperRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'id'],
      });
    }

    return () => observer.disconnect();
  }, [watchInfo?.is_host, isTampered]);

  const handleSendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: 'comment',
      room_id: stream.id,
      payload: { content: chatInput.trim() }
    }));
    setChatInput('');
  };

  const handleSendSticker = (stickerUrl: string, price: number) => {
    if (!wsRef.current) return;
    const urlParts = stickerUrl.split('/');
    const pack = urlParts[urlParts.length - 2] || 'kiss';
    const stickerName = (urlParts[urlParts.length - 1] || 'sticker_1').split('.')[0];

    wsRef.current.send(JSON.stringify({
      type: "gift",
      room_id: stream.id,
      payload: {
        gift_type: "sticker",
        sticker_pack: pack,
        sticker_name: stickerName,
        sticker_url: stickerUrl,
        amount: price,
        animation: "overlay"
      }
    }));
  };

  const spawnReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 80) + 10;
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const sendLocalReaction = (emoji: string) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: "reaction",
      room_id: stream.id,
      payload: { reaction: emoji }
    }));
  };

  const endStream = async () => {
    if (confirm("Anda yakin ingin mengakhiri siaran?")) {
      try {
        const token = localStorage.getItem('access_token');
        const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_API_URL || 'http://localhost:3334';
        await fetch(`${streamBaseUrl}/api/v1/streams/${stream.id}/stop`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
      } catch (err) {
        console.error("Error stopping stream:", err);
      }
      onBack();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-220px) scale(1.2) rotate(15deg); opacity: 0; }
        }
        @keyframes bounceSticker {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit text-gray-300">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Kembali ke Daftar
        </Button>

        <div ref={videoWrapperRef} className="relative aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center shadow-2xl">
          
          <ActiveVideoView isHost={watchInfo.is_host} />

          {!watchInfo?.is_host && (
            <div id="drm-container" className="absolute inset-0 z-40 pointer-events-none">
              <div
                id="forensic-watermark"
                className="absolute text-white/30 font-mono text-[10px] sm:text-xs md:text-sm font-bold select-none tracking-widest mix-blend-overlay transition-all duration-[3000ms] ease-in-out"
                style={{
                  left: `${watermarkPos.x}%`,
                  top: `${watermarkPos.y}%`,
                  opacity: watermarkPos.opacity,
                  textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
                }}
              >
                {user?.username || 'Guest'} • {watchInfo?.viewer_ip || '127.0.0.1'}
              </div>
              
              <div id="invisible-watermark-grid" className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.01] select-none pointer-events-none overflow-hidden mix-blend-overlay">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-center rotate-45 text-[8px] font-mono whitespace-nowrap text-white">
                    {user?.username || 'Guest'}-{watchInfo?.viewer_ip || 'IP'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isTampered && (
            <div className="absolute inset-0 z-50 bg-red-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
              <Flame className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Akses Diblokir</h2>
              <p className="text-red-200 mb-4 text-sm max-w-md">
                Sistem mendeteksi percobaan manipulasi pada pemutar video. 
                Tindakan ini melanggar kebijakan keamanan Javahade.
              </p>
              <Button onClick={onBack} variant="destructive">Tutup Video</Button>
            </div>
          )}

          <div className="absolute bottom-20 left-6 z-30 pointer-events-none w-32 h-[60%] overflow-hidden">
            {floatingReactions.map((r) => (
              <span
                key={r.id}
                className="absolute text-3xl pointer-events-none"
                style={{
                  left: `${r.left}%`,
                  bottom: '0px',
                  animation: 'floatUp 2s ease-out forwards',
                }}
              >
                {r.emoji}
              </span>
            ))}
          </div>

          {activeStickerUrl && (
            <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
              <img
                src={activeStickerUrl}
                alt="Sticker Gift"
                className="w-48 h-48 object-contain drop-shadow-2xl animate-bounce"
                style={{ filter: 'drop-shadow(0 0 30px rgba(255,200,0,0.6))' }}
              />
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none z-40">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-bold w-fit shadow-lg shadow-red-500/30">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
            </span>
            <h1 className="text-sm sm:text-base font-bold text-white drop-shadow-lg">{stream.title}</h1>
            <p className="text-[10px] sm:text-xs text-gray-300">@{stream.host}</p>
          </div>

          <div className="absolute top-3 right-3 flex flex-col items-end gap-2 pointer-events-none z-40">
            <Badge className="bg-black/50 backdrop-blur text-white border border-white/10 pointer-events-auto">
              <Eye className="mr-1 h-3 w-3" />
              {stream.viewer_count?.toLocaleString('id-ID') || 0}
            </Badge>

            {Object.keys(donators).length > 0 && (
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-2 border border-amber-500/30 min-w-32 shadow-lg shadow-amber-500/10 pointer-events-auto">
                <div className="text-[10px] font-bold text-amber-500 uppercase flex items-center justify-center gap-1 border-b border-amber-500/20 pb-1 mb-1">
                  <Trophy className="h-3 w-3" /> Top Sultan
                </div>
                {Object.entries(donators)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([name, amount], idx) => (
                    <div key={name} className="flex justify-between items-center text-[10px] gap-3">
                      <span className="text-gray-200 truncate max-w-20">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {name}
                      </span>
                      <span className="text-amber-400 font-bold">${amount.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {watchInfo?.is_host && (
            <HostControls 
              onEndStream={endStream} 
              camEnabled={camEnabled} 
              micEnabled={micEnabled}
              onToggleCam={setCamEnabled}
              onToggleMic={setMicEnabled}
            />
          )}

          {!watchInfo?.is_host && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-20 flex justify-between items-end pointer-events-auto">
              <div className="flex gap-2">
                {['❤️', '🔥', '👏', '😂'].map((reaction) => (
                  <button
                    key={reaction}
                    onClick={() => sendLocalReaction(reaction)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-lg transition-transform hover:scale-125 active:scale-90 text-white"
                  >
                    {reaction}
                  </button>
                ))}
              </div>
              <div>
                <button
                  onClick={() => setStickerModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold shadow-lg shadow-orange-500/25 transition-transform hover:-translate-y-0.5"
                >
                  <span>🎁</span> Kirim Stiker
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-indigo-600 text-white text-sm">
              {stream.host.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base truncate">{stream.title}</h2>
            <p className="text-sm text-muted-foreground">@{stream.host}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Eye className="mr-1 h-3 w-3" />
              {stream.viewer_count?.toLocaleString('id-ID') || 0} menonton
            </Badge>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-300">
            <Trophy className="h-4 w-4 text-amber-500" /> Tantangan Penonton
          </h3>
          <div className="space-y-2">
            {bounties.map((bounty) => (
              <Card key={bounty.id} className="p-3 bg-gray-900/30 border-white/5 glass">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{bounty.task_description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">oleh {bounty.challenger_name || bounty.challenger}</span>
                      <span className="text-xs font-semibold text-rose-500">
                        Rp{Number(bounty.amount_idr || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {bounty.status === 'pending' && user?.username === stream.host && (
                      <>
                        <Button 
                          size="sm" variant="outline" className="h-7 text-xs border-zinc-800 text-zinc-300"
                          onClick={() => streamApi.post(`/api/v1/streams/bounties/${bounty.id}/status`, { status: 'accepted' }).catch(()=>{})}
                        >Terima</Button>
                        <Button 
                          size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                          onClick={() => streamApi.post(`/api/v1/streams/bounties/${bounty.id}/status`, { status: 'rejected' }).catch(()=>{})}
                        >Tolak</Button>
                      </>
                    )}
                    {bounty.status === 'pending' && user?.username !== stream.host && (
                      <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800">Menunggu</Badge>
                    )}
                    {bounty.status === 'accepted' && user?.username === stream.host && (
                      <Button 
                        size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                        onClick={() => streamApi.post(`/api/v1/streams/bounties/${bounty.id}/status`, { status: 'completed' }).catch(()=>{})}
                      >Selesai</Button>
                    )}
                    {bounty.status === 'accepted' && user?.username !== stream.host && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/20 text-[10px]">Dikerjakan</Badge>
                    )}
                    {bounty.status === 'completed' && (
                      <Badge className="bg-emerald-950/30 text-emerald-400 border-emerald-500/20 text-[10px]">✅ Selesai</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-zinc-950/40 rounded-2xl border border-white/5 h-[400px] lg:h-[calc(100vh-200px)] lg:sticky lg:top-4 glass">
        <div className="flex items-center justify-between p-3 border-b border-white/5">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Obrolan Langsung
          </h3>
          <Badge variant="secondary" className="text-[10px] bg-white/5">
            {stream.viewer_count?.toLocaleString('id-ID') || 0} online
          </Badge>
        </div>

        <div className="flex-1 p-3 min-h-0 relative">
          <Virtuoso
            style={{ height: '100%' }}
            data={chatMessages}
            followOutput="smooth"
            itemContent={(i, msg) => {
              const isMe = msg.sender === user?.username || msg.sender === 'me';
              const colorIdx = i % AVATAR_COLORS.length;
              return (
                <div key={msg.id} className={`flex gap-2 mb-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className={`${AVATAR_COLORS[colorIdx]} text-[8px] text-white font-bold`}>
                        {(msg.sender_profile?.username || msg.sender).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                    {!isMe && <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{msg.sender_profile?.username || msg.sender}</p>}
                    <div className={`inline-block rounded-xl px-3 py-1.5 text-xs ${isMe ? 'bg-rose-500 text-white rounded-br-none' : 'bg-zinc-800 text-gray-200 rounded-bl-none'}`}>
                      {msg.body}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              );
            }}
          />
        </div>

        <Separator className="bg-white/5" />

        <StickerModal open={stickerModalOpen} onClose={() => setStickerModalOpen(false)} onSendSticker={handleSendSticker} />

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-xl" onClick={() => setStickerModalOpen(true)}>
              <Gift className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Ketik pesan..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              className="h-8 text-xs bg-white/5 border-none text-white focus-visible:ring-1 focus-visible:ring-rose-500 rounded-xl"
            />
            <Button size="icon" className="h-8 w-8 shrink-0 bg-rose-500 hover:bg-rose-600 rounded-xl border-none" onClick={handleSendChat}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
