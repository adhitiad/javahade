# javahade

Platform eksklusif untuk penyewaan layanan _Host_ (Kreator) secara privat dan interaksi _Live Streaming_ premium. Proyek ini adalah aplikasi full-stack yang dibangun menggunakan **Django** (berserta arsitektur Template & HTMX) untuk Backend Utama, dipadukan dengan **Go Microservices** untuk fitur _Real-Time_ (Chat, Streaming WebRTC, Booking Presences).

## Arsitektur

```text
E:\java\
├── python-service\    # Django Backend & Frontend (HTMX/Template)
│   ├── apps\          # Modul: Accounts, Booking, Content, Moderation, Payments, dll.
│   └── config\        # Konfigurasi Utama, Celery, Database
├── go-services\       # Go Microservices:
│   ├── stream-service # Streaming (OME/WebRTC via WebSocket)
│   ├── chat-service   # Real-time Chat (WebSocket Hub)
│   ├── booking-service# Booking & Presence WebSocket
│   └── shared\        # Shared package (Database, Middleware, Config)
└── nginx\             # Reverse Proxy & Static Files
```

## Teknologi Inti

| Layer     | Teknologi                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------- |
| Frontend  | **Django Template** dipadukan dengan **HTMX** untuk reaktivitas SPA tanpa Javascript rumit.        |
| API       | **Python 3.10+, Django, Django REST Framework, PostgreSQL, Redis, Celery**.                        |
| Real-time | **Go, gorilla/websocket**. (Membangun WebSocket hub dengan Redis Pub/Sub antar service).           |
| AI System | **Groq Vision API** (Verifikasi KYC KTP & Selfie otomatis) dan **OpenAI** (Moderasi Konten).       |
| Proxy     | **Nginx**                                                                                          |

## Ekosistem & Fitur Utama

- **Sistem Peran Dinamis**: Navigasi Beranda dan Dompet disesuaikan otomatis untuk peran Klien (_Fans_), _Host_, dan Admin.
- **Penyewaan Ruangan Privat (Booking)**: Klien dapat membooking Host untuk sesi privat, dengan fitur deteksi ketersediaan slot (Idempotency).
- **Live Streaming & Eksklusivitas**: Host dapat mengadakan siaran langsung WebRTC (didukung OME) secara publik maupun terbatas (_Family Only_).
- **Ekonomi & Dompet Digital (Wallet)**: Sistem keuangan multi-mata uang untuk konversi (_Exchange Rates_), Pembelian Hadiah Virtual (_Virtual Gifts_), Top-Up, dan Penarikan (_Withdrawal_) lengkap dengan _Fee/Tax System_ terintegrasi.
- **AI-Powered KYC & Moderation**: Memanfaatkan Groq Vision AI untuk mengecek kecocokan foto Selfie dan KTP secara instan, serta integrasi OpenAI untuk moderasi konten Feed otomatis.
- **Pencarian Global & Feed Kreator**: Pencarian Host dan unggahan konten (Post Feed, Stories).
- **Real-time Chat**: Obrolan instan privat antar-pengguna dengan skalabilitas Go WebSocket & Redis Pub/Sub.
- **Background Tasks**: Dikelola secara handal melalui antrean _Celery_ dan _Redis_ untuk pekerjaan berat.

## Prasyarat Lingkungan

- **Python 3.10+** (untuk `python-service`)
- **Go 1.21+** (untuk `go-services`)
- **PostgreSQL** (Database Relasional Utama)
- **Redis** (Pub/Sub, Caching, Celery Broker)

---

## Pemasangan & Panduan Menjalankan

### 1. Python Backend & Frontend Server

```bash
cd python-service
python -m venv venv

# Aktifkan Virtual Environment
source venv/bin/activate   # (Linux/Mac)
venv\Scripts\activate      # (Windows)

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

*(Opsional: Jalankan _Celery Worker_ untuk memproses *background tasks*)*
```bash
celery -A config worker -l info
```

### 2. Go Microservices

```bash
cd go-services
go mod tidy

# Menjalankan spesifik service, misal chat-service:
cd chat-service
go run cmd/server/main.go
```

### 3. Nginx Reverse Proxy

Pastikan Nginx sudah terpasang dan perbarui konfigurasinya mengacu pada file `nginx/nginx.conf` sesuai lingkungan (Local/Production) Anda.

## Panduan Konfigurasi Variabel Lingkungan

Salin file `.env.example` menjadi `.env` di direktori _root_ `python-service` dan isi kunci penting seperti API AI dan integrasi Database:

```env
# Contoh:
GROQ_API_KEY="gsk_..."
OPENAI_API_KEY="sk-..."
DATABASE_URL="postgres://kreativa:kreativa_pass@localhost:5432/kreativa_db"
REDIS_URL="redis://localhost:6379/1"
```

## Panduan Audit AI

Untuk agen AI (seperti Code Analyzer atau Security Scanner), harap mengacu pada file [AI_AUDIT_GUIDELINES.md](file:///e:/java/AI_AUDIT_GUIDELINES.md) untuk mempelajari _checklist_ celah keamanan tingkat lanjut, pedoman arsitektur anti-arbitrase, serta standar _idempotency_ yang diterapkan secara spesifik pada ekosistem Javahade ini.
