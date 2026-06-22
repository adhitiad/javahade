'use client';

import { useState, useEffect } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useChatStore } from '@/stores/chat-store';
import { ChatConversationItem } from './chat-conversation-item';
import { ChatWindow } from './chat-window';

export default function ChatView() {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, unreadTotal, fetchConversations, connect, disconnect, setCurrentChat } = useChatStore();

  useEffect(() => {
    connect();
    fetchConversations();
    return () => disconnect();
  }, [connect, disconnect, fetchConversations]);

  const filtered = searchQuery
    ? conversations.filter(c =>
        (c.displayName || c.username).toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const handleSelect = (username: string) => {
    setSelectedUsername(username);
    setCurrentChat(username);
  };

  const selectedConversation = conversations.find(c => c.username === selectedUsername);

  return (
    <div className="w-full h-[calc(100vh-140px)] min-h-[500px] border rounded-2xl overflow-hidden bg-card flex shadow-sm">
      {/* Sidebar List */}
      <div className={`w-full lg:w-80 flex-col border-r bg-muted/10 ${selectedUsername ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-rose-500" />
              Pesan
            </h2>
            {unreadTotal > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadTotal} Baru
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari percakapan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <Separator />

        {/* Conversations */}
        <ScrollArea className="flex-1 max-h-none h-full">
          <div className="p-2">
            {filtered.length > 0 ? (
              filtered.map((conv) => (
                <ChatConversationItem
                  key={conv.username}
                  conversation={conv}
                  isActive={selectedUsername === conv.username}
                  onClick={() => handleSelect(conv.username)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Tidak ada percakapan ditemukan</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col min-w-0 ${
        selectedUsername ? 'flex' : 'hidden lg:flex'
      }`}>
        {selectedConversation ? (
          <ChatWindow
            key={selectedConversation.username}
            conversation={selectedConversation}
            onBack={() => setSelectedUsername(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">Pilih percakapan untuk mulai chat</p>
            <p className="text-xs mt-1">Pilih kontak di sebelah kiri untuk memulai percakapan</p>
          </div>
        )}
      </div>
    </div>
  );
}