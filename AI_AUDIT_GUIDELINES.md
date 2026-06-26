# 🤖 AI Audit Guidelines untuk Sistem Javahade

Panduan ini ditujukan bagi AI Assistant, Code Analyzer, atau Security Scanner yang bertugas untuk mengidentifikasi kelemahan, celah keamanan (vulnerabilities), dan kesalahan arsitektur (design flaws) pada sistem aplikasi **Javahade**.

Sistem Javahade adalah aplikasi *microservices* terdistribusi yang terdiri dari Django (Python) sebagai API sentral (dengan arsitektur Dual-DB: PostgreSQL & MongoDB), layanan Go (Golang) untuk operasi asinkron/Real-time, dan Next.js (TypeScript) untuk Frontend.

Gunakan panduan ini sebagai *checklist* dan parameter saat Anda melakukan pemindaian (audit) terhadap repositori ini.

---

## 1. Analisis Keamanan Pembayaran & Dompet (Payment & Wallet Security)
Sebagian besar vektor serangan pada aplikasi ini berpusat di layanan Escrow, Dompet (Wallet), dan Pemesanan (Booking). AI harus selalu memverifikasi hal-hal berikut:

- [ ] **Race Conditions (Double Spend/Top-up)**: Pastikan setiap query yang melakukan mutasi saldo (increment/decrement) menggunakan `select_for_update()` untuk memblokir baris tabel (*row-level locking*) di dalam blok `transaction.atomic()`.
- [ ] **Negative Balance Validation**: Periksa apakah ada validasi aplikasi DAN `CheckConstraint` di tingkat Database (PostgreSQL) yang melindungi akun dari saldo minus jika *race condition* secara ajaib lolos.
- [ ] **Idempotency Keys**: Setiap pembuatan entri transaksi finansial (misal: `POST /api/booking`, `POST /api/topup`) wajib menggunakan `Idempotency-Key` (bisa divalidasi via Redis) atau memiliki logika penahan ganda (misal: cek pembuatan transaksi serupa dalam 5 menit terakhir) untuk menghindari *Double Charging* saat *timeout*.
- [ ] **Currency Arbitrage (Manipulasi Kurs)**: Pastikan parameter *Exchange Rate* atau jumlah pembayaran (amount) tidak pernah bersumber atau disetujui hanya dari input klien (`request.data`). Backend harus **selalu** memvalidasi jumlah pembayaran langsung dari Webhook/API eksternal.

## 2. Analisis Autentikasi & Sesi (Session & Auth)
Sistem ini menggunakan *Stateless JWT* berbasis `rest_framework_simplejwt`.

- [ ] **Token Storage**: Pastikan JWT Token tidak dikembalikan dalam format body JSON untuk disimpan di `localStorage` klien (risiko XSS). Token wajib dikirimkan melalui **HttpOnly, Secure, SameSite cookies**.
- [ ] **Token Revocation (Logout)**: Aplikasi harus menggunakan `token_blacklist` untuk melakukan pencabutan *Refresh Token*.
- [ ] **Global Invalidation**: Periksa keberadaan atribut tipe `jwt_secret_version` pada `User`. Saat password diganti, versi ini harus diinkrementasi agar semua *Access Token* di semua perangkat otomatis tidak valid.

## 3. Arsitektur Dual-Database & Logging (PostgreSQL + MongoDB)
Javahade memisahkan transaksi relasional ketat (PostgreSQL) dan data bervolume tinggi/logging (MongoDB via Djongo).

- [ ] **Database Routing**: Pastikan setiap model yang bersifat *log* atau data masif (misalnya `UserActivityLog`) dialokasikan pada `apps.mongo_app` sehingga *router* akan mengarahkannya ke MongoDB.
- [ ] **Relational Integrity**: Pastikan tidak ada `ForeignKey` yang melintasi dua database (dari model Postgres ke Mongo atau sebaliknya) karena Django tidak mendukung relasi lintas database. Gunakan referensi `CharField` ID jika diperlukan.

## 4. Keamanan Infrastruktur Real-Time & Streaming
Layanan `go-services` dan Nginx menangani lalu lintas berat.

- [ ] **Stream Key Authenticity**: *Stream Key* untuk OvenMediaEngine (OME) tidak boleh bisa ditebak (misal `host_<username>`). Harus berupa *hex string* acak (`secrets.token_hex`).
- [ ] **Goroutine Leaks**: Periksa penggunaan *Goroutine leaks* (pastikan *channel* tertutup atau ada `context.Done()` di dalam perulangan `select` pada *handler* WebSocket di `stream-service` dan `chat-service`).

## 5. Observabilitas (Observability) & Testing
Javahade menggunakan OpenTelemetry untuk *distributed tracing*.

- [ ] **Trace Context Propagation**: Pastikan setiap *microservice* Go dan backend Python menginisialisasi OpenTelemetry *tracer* sehingga *trace context* tidak terputus saat request berpindah dari Frontend -> Nginx -> Python -> Go.
- [ ] **E2E Testing (Next.js)**: Untuk perubahan alur kritikal pada sisi antarmuka, pastikan Playwright tests (di dalam folder `e2e/`) juga diperbarui.
- [ ] **Health Checks**: Setiap layanan (Python, Go, Next.js, dan DB) wajib memiliki dan mengonfigurasi endpoint `/health` agar sistem orkestrasi dapat memantau status kontainer.

---

**Cara Penggunaan Panduan (Bagi AI)**:
Saat merespons *prompt* pengujian keamanan atau arsitektur, jalankan secara spesifik `grep_search` pada `settings`, `views.py`, `models.py`, `serializers.py` dan berkas Golang yang relevan untuk memastikan kriteria dalam pedoman ini terpenuhi.
