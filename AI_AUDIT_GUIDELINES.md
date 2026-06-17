# 🤖 AI Audit Guidelines untuk Sistem Javahade

Panduan ini ditujukan bagi AI Assistant, Code Analyzer, atau Security Scanner yang bertugas untuk mengidentifikasi kelemahan, celah keamanan (vulnerabilities), dan kesalahan arsitektur (design flaws) pada sistem aplikasi **Javahade**.

Sistem Javahade adalah aplikasi *microservices* terdistribusi yang terdiri dari Django (Python) sebagai API sentral dan layanan Go (Golang) untuk operasi asinkron/Real-time. Terdapat integrasi pembayaran (PayPal/Crypto) serta layanan media streaming (OvenMediaEngine).

Gunakan panduan ini sebagai *checklist* dan parameter saat Anda melakukan pemindaian (audit) terhadap repositori ini.

---

## 1. Analisis Keamanan Pembayaran & Dompet (Payment & Wallet Security)
Sebagian besar vektor serangan pada aplikasi ini berpusat di layanan Escrow, Dompet (Wallet), dan Pemesanan (Booking). AI harus selalu memverifikasi hal-hal berikut:

- [ ] **Race Conditions (Double Spend/Top-up)**: Pastikan setiap query yang melakukan mutasi saldo (increment/decrement) menggunakan `select_for_update()` untuk memblokir baris tabel (*row-level locking*) di dalam blok `transaction.atomic()`.
- [ ] **Negative Balance Validation**: Periksa apakah ada validasi aplikasi DAN `CheckConstraint` di tingkat Database (misal `balance >= 0`) yang melindungi akun dari saldo minus jika *race condition* secara ajaib lolos.
- [ ] **Idempotency Keys**: Setiap pembuatan entri transaksi finansial (misal: `POST /api/booking`, `POST /api/topup`) wajib menggunakan `Idempotency-Key` (bisa divalidasi via Redis) atau memiliki logika penahan ganda (misal: cek pembuatan transaksi serupa dalam 5 menit terakhir) untuk menghindari *Double Charging* saat *timeout*.
- [ ] **Currency Arbitrage (Manipulasi Kurs)**: Pastikan parameter *Exchange Rate* atau jumlah pembayaran (amount) tidak pernah bersumber atau disetujui hanya dari input klien (`request.data`). Backend harus **selalu** memvalidasi jumlah pembayaran langsung dari Webhook/API eksternal (contoh: respons `capture` PayPal) dan menggunakan kurs server (`ExchangeRateService`).

## 2. Analisis Autentikasi & Sesi (Session & Auth)
Sistem ini menggunakan *Stateless JWT* berbasis `rest_framework_simplejwt`. Namun, JWT rentan jika disalahgunakan. AI harus memverifikasi perlindungan berlapis berikut:

- [ ] **Token Storage**: Pastikan JWT Token tidak dikembalikan dalam format body JSON untuk disimpan di `localStorage` klien (risiko XSS). Token wajib dikirimkan melalui **HttpOnly, Secure, SameSite cookies**.
- [ ] **Token Revocation (Logout)**: Aplikasi harus menggunakan `token_blacklist` untuk melakukan pencabutan *Refresh Token*.
- [ ] **Device Fingerprinting / Hijacking**: Periksa apakah *Access Token* memuat *hash fingerprint* perangkat (misal IP + User-Agent). Ini memastikan token yang dicuri tidak bisa dipakai di perangkat peretas.
- [ ] **Global Invalidation**: Periksa keberadaan atribut tipe `jwt_secret_version` pada `User`. Saat password atau peran diganti, versi ini harus diinkrementasi agar semua *Access Token* di semua perangkat otomatis tidak valid.
- [ ] **Mass Assignment**: Pastikan *endpoint* pembaruan profil (seperti `PATCH /api/users/me`) menggunakan atribut `read_only_fields` pada *serializer* untuk menghindari peretas menyuntikkan field `role` (misalnya mengubah role menjadi `admin`).

## 3. Celah Otorisasi / Akses Data (IDOR & Privacy)
Data pelanggan dan kreator sangat sensitif. AI harus menyusuri kode pada *views* dan *endpoints* untuk memeriksa otorisasi:

- [ ] **Insecure Direct Object Reference (IDOR)**: Pastikan semua *view* yang mengambil objek spesifik berdasarkan ID (misal `booking_detail_view`) **selalu** memasukkan pengecekan kepemilikan (`user=request.user` atau `host=request.user`). Jangan hanya mengandalkan `IsAuthenticated`.
- [ ] **Hard Deletes**: Pada platform dengan rekam jejak finansial (Saga Pattern), penghapusan akun (`DELETE /api/account`) tidak boleh menggunakan penghapusan baris relasional asli (`.delete()`) yang akan memicu kaskade data pembayaran. Gunakan mekanisme **Soft Delete** atau **Data Anonymization** (Scrubbing).
- [ ] **Pagination limits**: Semua *endpoint* yang mengembalikan *list* (seperti `GET /api/hosts`) harus memiliki kelas paginasi aktif untuk menghindari *Denial of Service* melalui penarikan data dalam ukuran masif (contoh 100,000 baris dalam satu *request*).

## 4. Keamanan Infrastruktur Real-Time & Streaming
Layanan `go-services` dan Nginx menangani lalu lintas berat. AI harus mengevaluasi:

- [ ] **Stream Key Authenticity**: *Stream Key* untuk OvenMediaEngine (OME) tidak boleh bisa ditebak (misal `host_<username>`). Harus berupa *hex string* acak (`secrets.token_hex`).
- [ ] **RTMP Admission Webhook**: Pastikan *endpoint* Webhook untuk validasi siaran OME di Python secara akurat memverifikasi status dan eksistensi *Stream Key* saat arah `incoming`. Tanpa ini, siapa saja bisa membajak server rtmp.
- [ ] **Out-of-Memory (OOM) Protection**: Dalam layanan yang berurusan dengan video/gambar, batas unggahan (`FILE_UPLOAD_MAX_MEMORY_SIZE`) harus tetap rendah (contoh: 2.5MB) agar Django *mem-buffer* muatan besar langsung ke *disk* (sementara), bukan menyimpannya di RAM dan menyebabkan server macet (OOM).

## 5. Pemeriksaan Go Workspace (`go.work`) & Dependency
- [ ] Periksa file `go.work`. Jika memungkinkan, batasi penggunaan fitur *replace directives* yang berlebihan pada lingkungan produksi, dan perhatikan versi *pinning* modul untuk menghindari kerusakan (*breaking changes*) jika paket `shared` dimodifikasi.
- [ ] Periksa penggunaan *Goroutine leaks* (pastikan *channel* tertutup atau ada *context.Done()* di dalam perulangan `select` pada *handler* WebSocket di `stream-service` dan `chat-service`).

---

**Cara Penggunaan Panduan (Bagi AI)**:
Saat merespons *prompt* pengujian keamanan, jalankan secara spesifik `grep_search` pada `settings`, `views.py`, `models.py`, `serializers.py` dan berkas Golang yang relevan untuk memastikan kriteria dalam pedoman ini terpenuhi.
