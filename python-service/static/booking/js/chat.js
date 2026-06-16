/**
 * Kreativa Booking — WebSocket Chat Client
 *
 * Fitur:
 * - Koneksi WebSocket ke Go chat-service
 * - JWT authentication (ambil token dari Django endpoint)
 * - Kirim & terima pesan real-time
 * - Reconnection dengan exponential backoff
 * - Sanitasi input (client-side)
 * - Scroll otomatis ke pesan terbaru
 * - Indikator status koneksi
 *
 * Keamanan:
 * - Token JWT dikirim via query parameter
 * - Input pesan di-sanitasi sebelum render
 * - Maksimal 1000 karakter per pesan
 */

(function () {
  "use strict";

  // ===== KONFIGURASI =====
  const config = window.CHAT_CONFIG || {};
  const WS_URL = config.wsUrl || "ws://localhost:8081/ws/chat";
  const ROOM_ID = config.roomId || "";
  const TOKEN_URL = config.tokenUrl || "/booking/api/token/";
  const CURRENT_USER = config.currentUser || "anonymous";
  const CURRENT_USER_ID = config.currentUserId || "";

  // Pengaturan reconnection
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_RECONNECT_DELAY = 1000; // 1 detik
  const MAX_RECONNECT_DELAY = 30000; // 30 detik

  // ===== STATE =====
  let ws = null;
  let jwtToken = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let isConnected = false;

  // ===== ELEMEN DOM =====
  const messagesContainer = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const chatError = document.getElementById("chat-error");

  // ===== UTILITAS =====

  /**
   * Sanitasi teks — cegah XSS di client-side
   * Server (Go) juga melakukan sanitasi tambahan
   */
  function sanitizeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Format waktu ke HH:MM
   */
  function formatTime(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Scroll ke pesan terbaru dengan animasi halus
   */
  function scrollToBottom() {
    if (messagesContainer) {
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }
  }

  /**
   * Update indikator status koneksi
   */
  function updateStatus(status) {
    const statusConfig = {
      connecting: {
        dot: "bg-amber-500 animate-pulse",
        text: "Menghubungkan...",
        color: "text-amber-400",
      },
      connected: {
        dot: "bg-emerald-500",
        text: "Terhubung",
        color: "text-emerald-400",
      },
      disconnected: {
        dot: "bg-red-500",
        text: "Terputus",
        color: "text-red-400",
      },
      reconnecting: {
        dot: "bg-amber-500 animate-pulse",
        text: "Menghubungkan ulang...",
        color: "text-amber-400",
      },
      error: { dot: "bg-red-500", text: "Error", color: "text-red-400" },
    };

    const cfg = statusConfig[status] || statusConfig.disconnected;
    if (statusDot) statusDot.className = `w-2 h-2 rounded-full ${cfg.dot}`;
    if (statusText) {
      statusText.textContent = cfg.text;
      statusText.className = cfg.color;
    }
  }

  /**
   * Tampilkan/sembunyikan error
   */
  function showError(message) {
    if (chatError) {
      chatError.textContent = message;
      chatError.classList.remove("hidden");
      setTimeout(() => chatError.classList.add("hidden"), 5000);
    }
  }

  // ===== RENDER PESAN =====

  /**
   * Tambahkan pesan ke area chat
   */
  function addMessage(data) {
    if (!messagesContainer) return;

    const payload = data.payload || {};
    const senderId = payload.sender_id || "";
    const content = sanitizeHTML(payload.content || "");
    const timestamp = payload.created_at || new Date().toISOString();
    const username = payload.username || senderId;
    const isOwn = senderId === CURRENT_USER_ID;

    const messageEl = document.createElement("div");
    messageEl.className = `flex ${isOwn ? "justify-end" : "justify-start"} animate-slide-up`;

    messageEl.innerHTML = `
            <div class="max-w-[75%] ${
              isOwn
                ? "bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-indigo-500/20"
                : "bg-gray-800/60 border border-gray-700/30"
            } rounded-2xl ${isOwn ? "rounded-tr-md" : "rounded-tl-md"} px-4 py-3 shadow-lg">
                ${!isOwn ? `<p class="text-xs font-semibold text-indigo-400 mb-1">${sanitizeHTML(username)}</p>` : ""}
                <p class="text-sm text-gray-100 leading-relaxed break-words">${content}</p>
                <p class="text-[10px] ${isOwn ? "text-indigo-300/50" : "text-gray-500"} mt-1.5 text-right">${formatTime(timestamp)}</p>
            </div>
        `;

    messagesContainer.appendChild(messageEl);
    scrollToBottom();
  }

  /**
   * Tambahkan pesan sistem
   */
  function addSystemMessage(text) {
    if (!messagesContainer) return;

    const el = document.createElement("div");
    el.className = "text-center animate-fade-in";
    el.innerHTML = `
            <span class="inline-block px-4 py-2 rounded-full bg-gray-800/50 text-xs text-gray-500">
                ${sanitizeHTML(text)}
            </span>
        `;
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  // ===== JWT TOKEN =====

  /**
   * Ambil JWT token dari Django API endpoint
   * Endpoint dilindungi session auth
   */
  async function fetchToken() {
    try {
      const response = await fetch(TOKEN_URL, {
        credentials: "same-origin", // Kirim session cookie
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`Token request gagal: ${response.status}`);
      }

      const data = await response.json();
      jwtToken = data.access_token;
      return jwtToken;
    } catch (error) {
      console.error("Gagal mendapatkan JWT token:", error);
      showError("Gagal mengambil token autentikasi. Silakan refresh halaman.");
      updateStatus("error");
      return null;
    }
  }

  // ===== WEBSOCKET =====

  /**
   * Inisialisasi koneksi WebSocket ke Go chat-service
   */
  async function connect() {
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    updateStatus("connecting");

    // Ambil token jika belum ada
    if (!jwtToken) {
      const token = await fetchToken();
      if (!token) return;
    }

    // Buat koneksi WebSocket dengan token & room_id
    const wsUrl = `${WS_URL}?token=${encodeURIComponent(jwtToken)}&room_id=${encodeURIComponent(ROOM_ID)}`;

    try {
      ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error("Gagal membuat WebSocket:", error);
      updateStatus("error");
      scheduleReconnect();
      return;
    }

    // --- Event: Koneksi Terbuka ---
    ws.onopen = function () {
      console.log("WebSocket terhubung");
      isConnected = true;
      reconnectAttempts = 0;
      updateStatus("connected");

      // Enable input
      if (chatInput) chatInput.disabled = false;
      if (sendBtn) sendBtn.disabled = false;

      // Join room
      ws.send(
        JSON.stringify({
          type: "join",
          room_id: ROOM_ID,
          payload: {},
        }),
      );

      addSystemMessage("🟢 Terhubung ke chat room");
    };

    // --- Event: Pesan Diterima ---
    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            addMessage(data);
            break;
          case "joined":
            // Konfirmasi bergabung ke room
            console.log("Berhasil join room:", data.room_id);
            break;
          case "typing":
            // Bisa ditambahkan indikator typing
            break;
          case "error":
            showError(data.payload?.message || "Terjadi kesalahan");
            break;
          case "rate_limited":
            showError("⚠️ Terlalu banyak pesan! Tunggu sebentar.");
            break;
          default:
            console.log("Pesan tipe tidak dikenal:", data.type);
        }
      } catch (error) {
        console.error("Gagal parse pesan WebSocket:", error);
      }
    };

    // --- Event: Koneksi Ditutup ---
    ws.onclose = function (event) {
      console.log("WebSocket ditutup:", event.code, event.reason);
      isConnected = false;
      updateStatus("disconnected");

      // Disable input
      if (chatInput) chatInput.disabled = true;
      if (sendBtn) sendBtn.disabled = true;

      // Reconnect jika bukan ditutup secara sengaja
      if (event.code !== 1000) {
        addSystemMessage("🔴 Koneksi terputus. Mencoba menghubungkan ulang...");
        scheduleReconnect();
      }
    };

    // --- Event: Error ---
    ws.onerror = function (error) {
      console.error("WebSocket error:", error);
      updateStatus("error");
    };
  }

  /**
   * Jadwalkan reconnection dengan exponential backoff
   */
  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      addSystemMessage(
        "❌ Gagal menghubungkan setelah beberapa percobaan. Silakan refresh halaman.",
      );
      updateStatus("error");
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ... max 30s
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
      MAX_RECONNECT_DELAY,
    );

    reconnectAttempts++;
    updateStatus("reconnecting");

    console.log(`Reconnect attempt ${reconnectAttempts} dalam ${delay}ms`);

    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(async () => {
      // Refresh token sebelum reconnect
      jwtToken = null;
      await connect();
    }, delay);
  }

  /**
   * Kirim pesan via WebSocket
   */
  function sendMessage(content) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showError("Tidak terhubung ke chat. Menghubungkan ulang...");
      connect();
      return;
    }

    if (!content.trim()) return;

    // Batas panjang pesan
    if (content.length > 1000) {
      showError("Pesan terlalu panjang (maks 1000 karakter)");
      return;
    }

    const message = {
      type: "message",
      room_id: ROOM_ID,
      payload: {
        content: content.trim(),
        type: "text",
        username: CURRENT_USER,
      },
    };

    ws.send(JSON.stringify(message));
  }

  // ===== EVENT LISTENERS =====

  // Form submit — kirim pesan
  if (chatForm) {
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const content = chatInput.value.trim();
      if (!content) return;

      sendMessage(content);
      chatInput.value = "";
      chatInput.focus();
    });
  }

  // Enter key — kirim pesan
  if (chatInput) {
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event("submit"));
      }
    });
  }

  // ===== INISIALISASI =====
  document.addEventListener("DOMContentLoaded", function () {
    // Disable input sampai terhubung
    if (chatInput) chatInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    // Mulai koneksi
    connect();
  });

  // Bersihkan saat halaman ditutup
  window.addEventListener("beforeunload", function () {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null; // Hindari reconnect saat halaman ditutup
      ws.close(1000, "Halaman ditutup");
    }
  });
})();
