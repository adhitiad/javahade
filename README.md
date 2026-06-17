# javahade

Platform eksklusif untuk penyewaan layanan *Host* (Kreator) secara privat dan interaksi *Live Streaming* premium. Proyek ini adalah aplikasi full-stack yang terdiri dari **Frontend** (React/Vite), **Backend Python** (Django REST Framework), dan **Backend Go** (WebSocket & Streaming Services).

## Arsitektur

```
E:\java\
├── frontend\          # Web Application (React + Vite)
├── python-service\    # Django REST API (Swagger/OpenAPI)
├── go-services\       # Go Microservices:
│   ├── stream-service # Streaming (OME/WebRTC via WebSocket)
│   ├── chat-service   # Real-time Chat (WebSocket Hub)
│   ├── booking-service# Booking & Presence WebSocket
│   └── shared\        # Shared package (DB, Middleware, CORS)
└── nginx\             # Reverse Proxy & Static Files
```

## Teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend | React, Vite, CSS |
| API | Python 3.10+, Django, Django REST Framework, PostgreSQL, Redis |
| Real-time | Go, gorilla/websocket |
| Proxy | Nginx |

## Fitur Utama

- **Sistem Peran Dinamis**: Beranda (Feed), Dompet (Wallet), dan menu navigasi disesuaikan secara dinamis untuk peran Klien (*Fans*), *Host*, dan Admin.
- **Pemesanan Ruangan Privat (Booking)**: Klien dapat membooking Host untuk sesi privat.
- **Live Streaming & Eksklusivitas**: Host dapat mengadakan siaran langsung publik atau privat (*Family Only*).
- **Dompet Multi-Mata Uang**: Sistem dompet bawaan untuk mengonversi dan membelanjakan mata uang.
- **Pencarian Global**: Mencari Host dan Jadwal Live Stream dalam satu kolom pencarian yang elegan.
- **Real-time Chat**: Komunikasi instan antar pengguna menggunakan WebSocket (Go microservice).
- **Live Streaming**: Siaran langsung dengan dukungan OME/WebRTC melalui WebSocket (Go microservice).

## Prasyarat

- Node.js 18+ & npm/yarn (untuk frontend)
- Python 3.10+ (untuk python-service)
- Go 1.21+ (untuk go-services)
- PostgreSQL
- Redis

## Struktur Direktori

### Frontend (`frontend/`)
Aplikasi web client berbasis React dengan Vite sebagai build tool.

### Python Service (`python-service/`)
Backend utama yang menangani REST API, otentikasi, manajemen pengguna, pembayaran, dan integrasi database.

### Go Services (`go-services/`)
Layanan backend tambahan berbasis Go yang menangani komunikasi real-time:

- **stream-service**: Menangani streaming live dan koneksi WebSocket untuk OME/WebRTC.
- **chat-service**: Fitur pesan instan antar pengguna menggunakan WebSocket.
- **booking-service**: Sistem booking/presensi host yang berjalan secara real-time.
- **shared**: Paket bersama untuk database (PostgreSQL, Redis), middleware, dan konfigurasi CORS.

### Nginx (`nginx/`)
Konfigurasi reverse proxy untuk menggabungkan semua layanan.

## Pemasangan

### 1. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Python Backend
```bash
cd python-service
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Go Microservices
```bash
cd go-services
go mod tidy
go run go.work
```

### 4. Nginx
Pastikan Nginx sudah terpasang dan konfigurasi di `nginx/nginx.conf` sesuai lingkungan Anda.

## Konfigurasi

Salin file `.env.example` ke `.env` di setiap layanan yang memerlukan konfigurasi environment variables.

## Panduan Audit AI

Untuk agen AI (seperti Code Analyzer atau Security Scanner), harap mengacu pada file [AI_AUDIT_GUIDELINES.md](file:///e:/java/AI_AUDIT_GUIDELINES.md) untuk mempelajari *checklist* celah keamanan tingkat lanjut, pedoman arsitektur anti-arbitrase, serta standar *idempotency* yang diterapkan secara spesifik pada ekosistem Javahade ini.
