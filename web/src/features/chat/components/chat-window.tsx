import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ArrowLeft, Circle, Check, CheckCheck, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/stores/chat-store';
import type { ChatMessage } from '@/types';
import { AVATAR_COLORS, getInitials, formatTime, TypingIndicator } from './chat-helpers';

export function ChatWindow({
  conversation,
  onBack,
}: {
  conversation: any; // ChatConversation
  onBack: () => void;
}) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, markAsRead, messages, fetchMessages } = useChatStore();

  const displayName = conversation.displayName || conversation.username;
  const colorIndex = conversation.username.length % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];

  // Fetch real messages
  useEffect(() => {
    fetchMessages(conversation.username);
  }, [conversation.username, fetchMessages]);

  useEffect(() => {
    markAsRead(conversation.username);
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [conversation.username, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(conversation.username, inputText);
    setInputText('');
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung oleh browser ini.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendMessage(conversation.username, "Membagikan lokasi", {
          type: "location",
          lat: latitude,
          lng: longitude
        });
      },
      (error) => {
        alert("Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.");
      }
    );
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b shrink-0">
        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className={`${avatarColor} text-white text-xs`}>
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {conversation.isOnline ? (
              <>
                <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                Sedang online
              </>
            ) : (
              'Terakhir dilihat baru-baru ini'
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center my-3">
                <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] sm:max-w-[70%] ${isMe ? 'order-1' : ''}`}>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? 'bg-rose-500 text-white rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          }`}
                        >
                          {(msg.type === 'location' || msg.body.startsWith('LOCATION::')) ? (() => {
                            try {
                              let lat, lng;
                              if (msg.type === 'location' && msg.metadata) {
                                lat = msg.metadata.lat;
                                lng = msg.metadata.lng;
                              } else {
                                const coords = JSON.parse(msg.body.replace('LOCATION::', ''));
                                lat = coords.lat;
                                lng = coords.lng;
                              }
                              return (
                                <div className="flex flex-col gap-2 min-w-[200px] mt-1">
                                  <div className="flex items-center gap-2 font-medium">
                                    <MapPin className="w-4 h-4" />
                                    Lokasi Dibagikan
                                  </div>
                                  <div className="h-24 bg-black/10 rounded-lg flex items-center justify-center overflow-hidden relative border border-white/10">
                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
                                    <MapPin className={`w-8 h-8 absolute animate-bounce ${isMe ? 'text-white' : 'text-rose-500'}`} />
                                    <div className="absolute bottom-2 text-[8px] opacity-50 font-mono">
                                      {lat.toFixed(4)}, {lng.toFixed(4)}
                                    </div>
                                  </div>
                                  <Button 
                                    variant={isMe ? "secondary" : "default"}
                                    size="sm" 
                                    className={`w-full mt-1 ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                                    onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
                                  >
                                    <Navigation className="w-3 h-3 mr-2" /> Buka di Maps
                                  </Button>
                                </div>
                              );
                            } catch {
                              return msg.body;
                            }
                          })() : (
                            msg.body
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(msg.created_at)}
                          </span>
                          {isMe && (
                            msg.is_read
                              ? <CheckCheck className="h-3 w-3 text-rose-500" />
                              : <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleShareLocation} title="Bagikan Lokasi">
            <MapPin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Ketik pesan..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1 h-9"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 bg-rose-500 hover:bg-rose-600 disabled:opacity-40"
            disabled={!inputText.trim()}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
