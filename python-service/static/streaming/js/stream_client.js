/**
 * Streaming Client untuk Integrasi Go Services
 * Menangani API Fetch, WebRTC OvenPlayer, dan WebSocket Chat.
 */

const StreamClient = (function() {
    let jwtToken = null;
    let ws = null;
    let ovenPlayerInstance = null;

    // --- Utility: Format Tanggal ---
    function formatDate(dateString) {
        const d = new Date(dateString);
        return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    function formatTime(dateString) {
        const d = new Date(dateString);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    }

    // --- Authentication ---
    async function fetchToken() {
        if (jwtToken) return jwtToken;
        try {
            const res = await fetch(CONFIG.tokenUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (res.ok) {
                const data = await res.json();
                jwtToken = data.access_token;
                return jwtToken;
            }
        } catch (e) {
            console.error("Failed to fetch token", e);
        }
        return null;
    }

    async function authFetch(url, options = {}) {
        const token = await fetchToken();
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `Bearer ${token}`;
        options.headers['Content-Type'] = 'application/json';
        return fetch(url, options);
    }

    // --- API Calls ---
    
    // 1. Fetch Daftar Live Stream dari Stream Service (:8082)
    async function fetchLiveStreams() {
        const container = document.getElementById('live-streams-container');
        if (!container) return;

        try {
            const res = await authFetch(`${CONFIG.streamApiUrl}/live`);
            if (res.ok) {
                const streams = await res.json();
                container.innerHTML = ''; // Clear loading
                
                if (streams.length === 0) {
                    container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">Belum ada live stream saat ini.</div>`;
                    return;
                }

                streams.forEach(stream => {
                    const card = `
                        <a href="/streaming/watch/${stream.id}/" class="glass rounded-2xl overflow-hidden group block transform transition hover:-translate-y-1">
                            <div class="relative h-48 bg-gray-900">
                                ${stream.thumbnail_url ? `<img src="${stream.thumbnail_url}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition">` : `<div class="w-full h-full flex items-center justify-center text-4xl">🎥</div>`}
                                <div class="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded flex items-center gap-1">
                                    <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span> LIVE
                                </div>
                                <div class="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur text-white text-xs rounded flex items-center gap-1">
                                    👁️ ${stream.viewer_count}
                                </div>
                            </div>
                            <div class="p-4">
                                <h3 class="font-bold text-white mb-1 truncate">${stream.title}</h3>
                                <p class="text-xs text-gray-400">Oleh Creator: ${stream.creator_id.substring(0,8)}</p>
                            </div>
                        </a>
                    `;
                    container.insertAdjacentHTML('beforeend', card);
                });
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="text-red-400">Gagal memuat live stream.</div>`;
        }
    }

    // 2. Fetch Jadwal Upcoming dari Booking Service (:8080)
    async function fetchUpcomingSlots() {
        const container = document.getElementById('upcoming-slots-container');
        if (!container) return;

        try {
            const res = await authFetch(`${CONFIG.bookingApiUrl}/slots`);
            if (res.ok) {
                const slots = await res.json();
                container.innerHTML = '';
                
                if (slots.length === 0) {
                    container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">Tidak ada jadwal slot mendatang.</div>`;
                    return;
                }

                slots.forEach(slot => {
                    const card = `
                        <a href="/streaming/slot/${slot.id}/" class="glass rounded-2xl p-5 block transform transition hover:-translate-y-1">
                            <div class="text-xs text-indigo-400 font-semibold mb-2">${formatDate(slot.start_time)}</div>
                            <h3 class="font-bold text-white mb-1 line-clamp-2">${slot.title}</h3>
                            <div class="flex items-center gap-2 text-xs text-gray-400 mb-4">
                                <span>🕒 ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</span>
                            </div>
                            <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-700/50">
                                <span class="text-emerald-400 font-bold">${formatRupiah(slot.price)}</span>
                                <span class="text-xs px-2 py-1 bg-white/5 rounded-full text-gray-300">👥 ${slot.max_seats} Kursi</span>
                            </div>
                        </a>
                    `;
                    container.insertAdjacentHTML('beforeend', card);
                });
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="text-red-400">Gagal memuat jadwal slot.</div>`;
        }
    }

    // 3. Fetch Detail Slot
    async function fetchSlotDetail(slotId) {
        if (!document.getElementById('slot-detail-container')) return;
        
        try {
            // Karena API Go booking-service tidak ada endpoint /slots/{id}, kita filter list
            const res = await authFetch(`${CONFIG.bookingApiUrl}/slots`);
            if (res.ok) {
                const slots = await res.json();
                const slot = slots.find(s => s.id === slotId);
                
                if (slot) {
                    document.getElementById('slot-title').textContent = slot.title;
                    document.getElementById('slot-creator').innerHTML = `Creator ID: <span class="font-mono text-xs">${slot.creator_id}</span>`;
                    document.getElementById('slot-date').textContent = formatDate(slot.start_time);
                    document.getElementById('slot-time').textContent = `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;
                    document.getElementById('slot-desc').textContent = slot.description || "Tidak ada deskripsi.";
                    document.getElementById('slot-price').textContent = formatRupiah(slot.price);
                    document.getElementById('slot-seats').textContent = slot.max_seats;
                    
                    document.getElementById('slot-loading').classList.add('hidden');
                    document.getElementById('slot-detail-container').classList.remove('hidden');
                } else {
                    document.getElementById('slot-loading').innerHTML = `<p class="text-red-400">Jadwal tidak ditemukan.</p>`;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    // 4. Booking (Reserve Slot)
    async function reserveSlot(slotId) {
        const btn = document.getElementById('btn-reserve');
        btn.disabled = true;
        btn.innerHTML = 'Memproses...';

        try {
            const res = await authFetch(`${CONFIG.bookingApiUrl}/reserve`, {
                method: 'POST',
                body: JSON.stringify({ slot_id: slotId })
            });

            if (res.ok) {
                alert("Berhasil booking kursi!");
                window.location.href = '/streaming/';
            } else {
                const data = await res.json();
                alert(`Gagal: ${data.detail || 'Terjadi kesalahan'}`);
                btn.disabled = false;
                btn.innerHTML = '💳 Beli Tiket Sekarang';
            }
        } catch (e) {
            alert('Kesalahan jaringan');
            btn.disabled = false;
        }
    }

    // --- Watch Room & WebRTC Player ---
    async function initWatchRoom(streamId) {
        // 1. Dapatkan detail stream dari Go stream-service
        try {
            const res = await authFetch(`${CONFIG.streamApiUrl}/${streamId}`);
            if (res.ok) {
                const stream = await res.json();
                document.getElementById('stream-title').textContent = stream.title;
                document.getElementById('viewer-count').textContent = stream.viewer_count;

                // 2. Setup OvenPlayer WebRTC
                setupOvenPlayer(stream.playback_url || `ws://localhost:3333/app/${streamId}`);
            }
        } catch (e) {
            console.error("Gagal mendapatkan detail stream", e);
        }

        // 3. Setup WebSocket interaksi
        setupWatchWebSocket();
        
        // 4. Binding tombol reaction
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const reaction = btn.getAttribute('data-reaction');
                sendWebSocketMessage({ type: 'reaction', payload: { reaction } });
                showFloatingReaction(reaction); // local feedback
            });
        });
    }

    function setupOvenPlayer(url) {
        document.getElementById('player-loading').classList.add('hidden');
        
        // Cek OvenPlayer
        if (typeof OvenPlayer !== 'undefined') {
            ovenPlayerInstance = OvenPlayer.create('ovenplayer', {
                sources: [
                    {
                        label: 'WebRTC',
                        type: 'webrtc',
                        file: url
                    }
                ],
                autoFallback: true,
                autoStart: true,
            });
            
            ovenPlayerInstance.on('error', function(e) {
                console.error('OvenPlayer error:', e);
            });
        } else {
            console.warn('OvenPlayer CDN gagal dimuat');
        }
    }

    // --- WebSocket untuk Chat & Reaction ---
    async function setupWatchWebSocket() {
        const token = await fetchToken();
        if (!token) return;

        const wsUrl = `${CONFIG.wsUrl}?token=${encodeURIComponent(token)}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            document.getElementById('chat-status-dot').classList.replace('bg-red-500', 'bg-emerald-500');
            document.getElementById('stream-chat-input').disabled = false;
            document.getElementById('stream-chat-btn').disabled = false;
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            
            if (data.type === 'message') {
                appendChatMessage(data.payload);
            } else if (data.type === 'reaction') {
                showFloatingReaction(data.payload.reaction);
            } else if (data.type === 'viewer_joined') {
                document.getElementById('viewer-count').textContent = data.payload.viewer_count || parseInt(document.getElementById('viewer-count').textContent) + 1;
            }
        };

        ws.onclose = () => {
            document.getElementById('chat-status-dot').classList.replace('bg-emerald-500', 'bg-red-500');
        };

        // Form chat
        const form = document.getElementById('stream-chat-form');
        const input = document.getElementById('stream-chat-input');
        
        if(form && input) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!input.value.trim()) return;
                
                sendWebSocketMessage({
                    type: 'message',
                    payload: { content: input.value, username: CONFIG.currentUser }
                });
                
                // Optimistic UI update
                appendChatMessage({ username: CONFIG.currentUser, content: input.value, is_me: true });
                input.value = '';
            });
        }
    }

    function sendWebSocketMessage(msg) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }

    function appendChatMessage(payload) {
        const container = document.getElementById('stream-chat-messages');
        const isMe = payload.is_me || payload.username === CONFIG.currentUser;
        
        const html = `
            <div class="flex flex-col animate-slide-up mb-2">
                <span class="text-[10px] font-bold ${isMe ? 'text-indigo-400' : 'text-gray-400'}">${payload.username || 'User'}</span>
                <div class="px-3 py-2 rounded-xl text-sm text-white ${isMe ? 'bg-indigo-600/50 rounded-tl-none' : 'bg-gray-800/80 rounded-tr-none'} inline-block w-fit max-w-full break-words">
                    ${escapeHTML(payload.content)}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));
    }

    function showFloatingReaction(emoji) {
        const container = document.getElementById('player-container');
        const el = document.createElement('div');
        el.className = 'absolute text-3xl z-50 pointer-events-none animate-float-up opacity-0';
        el.textContent = emoji;
        el.style.left = `${Math.random() * 80 + 10}%`; // Random horizontal position
        el.style.bottom = '10%';
        container.appendChild(el);
        
        setTimeout(() => el.remove(), 2000); // Hapus setelah animasi
    }

    return {
        init: () => console.log('StreamClient initialized'),
        fetchLiveStreams,
        fetchUpcomingSlots,
        fetchSlotDetail,
        reserveSlot,
        initWatchRoom
    };
})();
