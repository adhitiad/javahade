# javahade

Platform eksklusif untuk penyewaan layanan _Host_ (Kreator) secara privat dan interaksi _Live Streaming_ premium. Proyek ini adalah aplikasi full-stack yang dibangun menggunakan **Next.js 16 (App Router)** untuk Frontend, **Django REST Framework** untuk Backend Utama, dipadukan dengan **Go Microservices** untuk fitur _Real-Time_ (Chat, Streaming WebRTC, Booking Presences).

## Arsitektur

```text
E:\java\
├── python-service\    # Django Backend API (Dual-DB: PostgreSQL + MongoDB)
│   ├── apps\          # Modul: Accounts, Booking, Content, Moderation, Payments, Mongo App, dll.
│   └── config\        # Konfigurasi Utama, Celery, Database Router
├── go-services\       # Go Microservices:
│   ├── stream-service # Streaming (OME/WebRTC via WebSocket)
│   ├── chat-service   # Real-time Chat (WebSocket Hub)
│   ├── booking-service# Booking & Presence WebSocket
│   ├── payment-service# Integrasi Gateway Pembayaran (Verotel, Segpay, Paxum, dll)
│   └── shared\        # Shared package (Logger, Telemetry, Database)
├── web\               # Next.js 16 App Router Frontend (Bun, TypeScript, Zustand, Tailwind)
├── nginx\             # Reverse Proxy & Static Files
└── scripts\           # Skrip Operasional (Backup DB, Testing Koneksi)
```

## Teknologi Inti

| Layer          | Teknologi                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Frontend       | **Next.js 16 (App Router)**, **TypeScript (Strict Mode)**, **Zustand**, **Tailwind CSS**, **shadcn/ui**, **Playwright**. |
| API            | **Python 3.10+, Django, Django REST Framework, PostgreSQL, MongoDB (Djongo), Redis, Celery**.      |
| Real-time      | **Go, gorilla/websocket**. (Membangun WebSocket hub dengan Redis Pub/Sub antar service).           |
| Payments       | **Go Payment Microservice** (Verotel, Segpay, NETbilling, ELotPay, Paxum).                         |
| Observability  | **OpenTelemetry**, **Jaeger** (Distributed Tracing), **Prometheus & Grafana** (Monitoring).        |
| AI System      | **Groq Vision API** (Verifikasi KYC otomatis) dan **OpenAI** (Moderasi Konten).                    |
| Deploy         | **Docker & Docker Compose** (Modular Deployment), **Nginx** (Reverse Proxy).                       |

## Ekosistem & Fitur Utama

- **Sistem Peran Dinamis**: Navigasi Beranda dan Dompet disesuaikan otomatis untuk peran Klien (_Fans_), _Host_, dan Admin.
- **Penyewaan Ruangan Privat (Booking)**: Klien dapat membooking Host untuk sesi privat, dengan fitur deteksi ketersediaan slot (Idempotency).
- **Live Streaming & Eksklusivitas**: Host dapat mengadakan siaran langsung WebRTC (didukung OME) secara publik maupun terbatas (_Family Only_).
- **Ekonomi & Dompet Digital (Wallet)**: Sistem keuangan multi-mata uang untuk konversi (_Exchange Rates_), Pembelian Hadiah Virtual (_Virtual Gifts_), Top-Up, dan Penarikan (_Withdrawal_).
- **Integrasi Adult Billing & Gateway Global**: Didukung langsung oleh payment gateway tier-1 untuk *deposit*, dan **Paxum** khusus untuk rute *payout/withdraw* kreator secara otomatis.
- **AI-Powered KYC & Moderation**: Memanfaatkan Groq Vision AI untuk mengecek kecocokan foto Selfie dan KTP secara instan, serta integrasi OpenAI untuk moderasi konten Feed otomatis.
- **Observabilitas Terpusat**: Pelacakan aktivitas mikroservis (Go) dan Monolitik (Django) terintegrasi menjadi satu *Trace ID* di **Jaeger** menggunakan standar *OpenTelemetry*.
- **Pemisahan Database (Dual-DB)**: Transaksi kritikal menggunakan relasi *PostgreSQL*, sementara *logging* aktivitas sistematis dimasukkan ke *MongoDB*.

## Prasyarat Lingkungan

- **Bun** (Runtime wajib untuk frontend `web`)
- **Python 3.10+** (untuk `python-service`)
- **Go 1.21+** (untuk `go-services`)
- **Docker & Docker Compose** (Sangat direkomendasikan untuk orkestrasi penuh)

---

## Pemasangan & Panduan Menjalankan

Javahade menggunakan pendekatan arsitektur terpisah. Sangat disarankan menggunakan Docker Compose yang telah dimodularisasi:

### 1. Menjalankan Infrastruktur Database & Monitoring

```bash
# Server A (PostgreSQL)
docker-compose -f docker-compose.postgres.yml up -d

# Server B (MongoDB)
docker-compose -f docker-compose.mongo.yml up -d

# Monitoring (Opsional)
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Menjalankan Application Server

Jika menjalankan *backend* via Docker (Mencakup Python API, Web Frontend, dan Redis):
```bash
docker-compose -f docker-compose.app.yml up -d --build
```

### Alternatif: Pengembangan Lokal Tanpa Docker (Native)

#### Python Backend API Server
```bash
cd python-service
python -m venv venv
source venv/bin/activate   # (Linux/Mac) atau venv\Scripts\activate (Windows)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Go Microservices
```bash
cd go-services/shared
go mod tidy
cd ../chat-service
go run main.go
```

#### Next.js Frontend Server
```bash
cd web
bun install
bun run dev
```

## Panduan Konfigurasi Variabel Lingkungan

Salin file `.env.example` menjadi `.env` di direktori _root_ aplikasi dan isi kunci penting seperti API AI dan integrasi Database.

```env
# Contoh:
GROQ_API_KEY="gsk_..."
OPENAI_API_KEY="sk-..."
POSTGRES_DB="javahade_db"
POSTGRES_USER="javahade_user"
POSTGRES_PASSWORD="secret_password"
MONGO_DATABASE="javahade_mongo"
# dan lain-lain sesuai docker-compose env.
```

## Operasional & Backup

Skrip operasional untuk melakukan pencadangan otomatis (Postgres & Mongo) dan mengunggahnya ke AWS S3 dapat ditemukan di folder `scripts/`:
```bash
chmod +x scripts/backup_db.sh
./scripts/backup_db.sh
```

## Panduan Audit AI

Untuk agen AI (seperti Code Analyzer atau Security Scanner), harap mengacu pada file `AI_AUDIT_GUIDELINES.md` untuk mempelajari _checklist_ celah keamanan tingkat lanjut, pedoman arsitektur anti-arbitrase, serta standar _idempotency_ yang diterapkan secara spesifik pada ekosistem Javahade ini.
