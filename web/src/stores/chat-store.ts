// ============================================================
// Chat Store — Zustand + raw WebSocket for real-time chat
// Connects to Go Chat Service at ws://localhost:3335/ws/chat
// ============================================================
import { create } from "zustand";
import type { ChatMessage, ChatConversation } from "@/types";
import { chatApi } from "@/lib/api";

type WSMessage = {
  type: string;
  room_id?: string;
  payload: Record<string, unknown>;
  timestamp?: number;
};

interface ChatState {
  conversations: ChatConversation[];
  currentChat: string | null;
  messages: ChatMessage[];
  unreadTotal: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  _ws: WebSocket | null;
  _token: string;

  connect: () => void;
  disconnect: () => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (username: string) => Promise<void>;
  sendMessage: (receiver: string, body: string, metadata?: Record<string, any>) => void;
  setCurrentChat: (username: string | null) => void;
  markAsRead: (username: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  currentChat: null,
  messages: [],
  unreadTotal: 0,
  isConnected: false,
  isLoading: false,
  error: null,
  _ws: null,
  _token: "",

  connect: () => {
    const state = get();
    if (state._ws?.readyState === WebSocket.OPEN) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") || ""
        : "";
    const chatUrl = `ws://localhost:3335/ws/chat?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(chatUrl);

    ws.onopen = () => {
      set({ isConnected: true, error: null });
    };

    ws.onclose = () => {
      set({ isConnected: false });
    };

    ws.onerror = () => {
      set({ error: "Koneksi chat gagal", isConnected: false });
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "joined": {
            const currentChat = get().currentChat;
            if (currentChat && msg.room_id) {
              const joinMsg: WSMessage = {
                type: "join",
                room_id: msg.room_id,
                payload: {},
              };
              ws.send(JSON.stringify(joinMsg));
            }
            break;
          }

          case "message": {
            const payload = msg.payload;
            const chatMsg: ChatMessage = {
              id: String(payload["id"] || Date.now()),
              sender: String(payload["sender_id"] || payload["username"] || ""),
              receiver: "",
              body: String(payload["content"] || ""),
              type: payload["type"] as string | undefined,
              metadata: payload["metadata"] as Record<string, any> | undefined,
              media_url: payload["media_url"] as string | undefined,
              is_read: true,
              created_at:
                (payload["created_at"] as string) || new Date().toISOString(),
              sender_profile: {
                username: String(payload["username"] || ""),
              },
            };
            const currentChat = get().currentChat;
            if (currentChat) {
              chatMsg.receiver = currentChat;
            }

            const messages = [...get().messages, chatMsg];
            let unreadTotal = get().unreadTotal;
            const conversations = get().conversations.map((c) => {
              if (
                c.username === chatMsg.sender &&
                chatMsg.sender !== currentChat
              ) {
                unreadTotal += 1;
                return {
                  ...c,
                  unread_count: c.unread_count + 1,
                  last_message: chatMsg.body,
                  last_message_time: chatMsg.created_at,
                };
              }
              return c;
            });

            set({ messages, conversations, unreadTotal });
            break;
          }

          case "gift": {
            const payload = msg.payload;
            const chatMsg: ChatMessage = {
              id: String(payload["created_at"] || Date.now()),
              sender: String(payload["sender_id"] || ""),
              receiver: "",
              body: `Gift: ${payload["gift_type"] || "virtual gift"}`,
              is_read: true,
              created_at:
                (payload["created_at"] as string) || new Date().toISOString(),
            };
            const currentChat = get().currentChat;
            if (currentChat) chatMsg.receiver = currentChat;
            set({ messages: [...get().messages, chatMsg] });
            break;
          }

          case "typing":
          case "read":
          case "rate_limited":
            break;

          case "error": {
            const errorMsg =
              (msg.payload["message"] as string) || "Terjadi kesalahan";
            set({ error: errorMsg });
            break;
          }

          case "notification": {
            const data = msg.payload["data"] as Record<string, unknown>;
            const notifType = data?.["type"] as string;
            if (notifType === "new_message") {
              const sender = (data?.["sender"] as string) || "unknown";
              const conversations = get().conversations.map((c) => {
                if (c.username === sender) {
                  return {
                    ...c,
                    unread_count: c.unread_count + 1,
                    last_message: (data?.["body"] as string) || "New message",
                    last_message_time: new Date().toISOString(),
                  };
                }
                return c;
              });
              set({
                conversations,
                unreadTotal: conversations.reduce(
                  (sum, c) => sum + c.unread_count,
                  0,
                ),
              });
            }
            break;
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    set({ _ws: ws });
  },

  disconnect: () => {
    const ws = get()._ws;
    if (ws) {
      ws.close();
      set({ _ws: null, isConnected: false, conversations: [], messages: [] });
    }
  },

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await chatApi.get<ChatConversation[]>(
        "/api/v1/rooms/conversations",
      );
      const conversations = res || [];
      const unreadTotal = conversations.reduce(
        (sum, c) => sum + c.unread_count,
        0,
      );
      set({ conversations, unreadTotal, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  fetchMessages: async (username: string) => {
    set({ currentChat: username, messages: [], isLoading: true, error: null });
    try {
      const res = await chatApi.get<ChatMessage[]>(
        `/api/v1/rooms/messages?username=${username}`,
      );
      set({ messages: res || [], isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  sendMessage: (receiver: string, body: string, metadata?: Record<string, any>) => {
    const ws = get()._ws;
    const msgType = metadata?.type || "text";
    if (ws?.readyState === WebSocket.OPEN) {
      const roomId = receiver;
      const msg: WSMessage = {
        type: "message",
        room_id: roomId,
        payload: {
          content: body,
          type: msgType,
          metadata: metadata,
        },
        timestamp: Math.floor(Date.now() / 1000),
      };
      ws.send(JSON.stringify(msg));
    }

    const chatMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      receiver,
      body,
      type: msgType,
      metadata: metadata,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    set({ messages: [...get().messages, chatMsg] });
  },

  setCurrentChat: (username: string | null) => {
    set({ currentChat: username, messages: [] });
    if (username) {
      get().fetchMessages(username);
    }
  },

  markAsRead: (username: string) => {
    const { conversations } = get();
    set({
      conversations: conversations.map((c) =>
        c.username === username ? { ...c, unread_count: 0 } : c,
      ),
      unreadTotal: conversations.reduce(
        (sum, c) => sum + (c.username === username ? 0 : c.unread_count),
        0,
      ),
    });
  },

  clearMessages: () => set({ messages: [], currentChat: null }),
}));
