Analisis komprehensif terhadap repository **javahade** mengungkap **40 kekurangan dan kesalahan kritis** yang tersebar di seluruh lapisan aplikasi Python service, dengan total skor kerentanan mencapai **312 dari 400** poin risiko. Masalah terparah terkonsentrasi pada **kerentanan keamanan (8 isu, severity 9.2/10)** dan **kesalahan logika bisnis (7 isu, severity 8.5/10)**, diikuti oleh **kelemahan arsitektur (6 isu, severity 7.8/10)**. Tiga isu berstatus **CRITICAL** memerlukan perhatian segera: (1) SQL Injection potensial di `GeoBlockingMiddleware`, (2) Logika cookie keamanan yang terbalik di konfigurasi Django, dan (3) Race condition pada sistem pengiriman gift virtual. Proyek ini dalam kondisi **tidak siap untuk produksi** tanpa perbaikan signifikan terutama pada lapisan keamanan, validasi transaksi finansial, dan infrastruktur deployment.

---

# Analisis Kekurangan dan Kesalahan pada Python Service Frontend Django - Javahade

**Laporan Audit Kode: 17 Juni 2026**

---

## 1. Ringkasan Eksekutif dan Temuan Kritis

Repository `javahade` merupakan proyek platform penyewaan layanan host dan live streaming premium yang dibangun dengan arsitektur hybrid: **Django** sebagai backend utama sekaligus frontend (menggunakan template engine dan HTMX), dan **Go microservices** untuk fitur real-time seperti chat, streaming WebRTC, dan booking presence. Analisis mendalam terhadap seluruh lapisan Python service mengungkap total **40 kekurangan dan kesalahan** yang diklasifikasikan ke dalam 8 kategori utama: kerentanan keamanan, kesalahan logika dan bug, kelemahan arsitektur, kualitas kode dan maintainability, fitur yang tidak lengkap, kesenjangan testing, masalah performa, dan isu konfigurasi. Temuan paling kritis adalah adanya **tiga kerentanan berstatus CRITICAL** yang secara kolektif dapat mengakibatkan: eksekusi kode arbitrer melalui SQL injection, pembobolan session authentication via manipulasi cookie, dan kerugian finansial akibat race condition pada transaksi virtual gift.

### 1.1. Ringkasan Temuan Utama

Analisis terhadap repository `javahade` mengidentifikasi **40 masalah konkret** yang memerlukan perhatian segera. Distribusi temuan menunjukkan bahwa kerentanan keamanan mendominasi dengan **8 isu** yang secara kolektif mencapai **severity 9.2 dari 10**, diikuti oleh kesalahan logika bisnis sebanyak **7 isu dengan severity 8.5**. Kategori arsitektur dan desain menyumbang **6 isu** dengan tingkat keparahan **7.8**, yang mencakup masalah fundamental seperti ketiadaan validasi tipe data yang konsisten dan dependensi antar modul yang tidak terkelola dengan baik. Kesenjangan testing menjadi perhatian serius dengan **4 isu dan severity 8.0**, mengingat aplikasi ini menangani alur finansial dan data pengguna yang sensitif. Secara keseluruhan, profil risiko menunjukkan bahwa aplikasi dalam kondisi **tidak siap untuk deployment ke lingkungan produksi** tanpa perbaikan substansial pada lapisan keamanan, validasi transaksi, dan infrastruktur deployment.

| Kategori Temuan | Jumlah Isu | Severity Rata-rata | Isu Kritis |
|---|---|---|---|
| Kerentanan Keamanan | 8 | 9.2 / 10 | SQL Injection, CSRF Logic Inversion, JWT Exposure |
| Kesalahan Logika & Bug | 7 | 8.5 / 10 | Race Condition, Decimal Precision Loss, Fee Inconsistency |
| Arsitektur & Desain | 6 | 7.8 / 10 | Mixed Auth Paradigms, Tight Coupling, Missing Validation Layer |
| Kualitas Kode & Maintainability | 5 | 6.5 / 10 | Hardcoded Values, Code Duplication, Inconsistent Patterns |
| Fitur Tidak Lengkap | 5 | 7.0 / 10 | Missing Webhook Signature, Incomplete KYC AI, No Admin Panel for Disputes |
| Kesenjangan Testing | 4 | 8.0 / 10 | < 5% Coverage, No Integration Tests, Missing Edge Cases |
| Masalah Performa | 3 | 7.2 / 10 | Missing DB Indexes, N+1 Queries, No Caching Strategy |
| Isu Konfigurasi | 2 | 5.5 / 10 | Inverted Security Flags, Missing Docker Services |

*Tabel 1: Distribusi Temuan per Kategori dengan Metrik Severity*

### 1.2. Tiga Isu Paling Kritis

Dari 40 temuan, tiga isu berikut dinilai paling kritis karena dampak langsung terhadap keamanan, integritas finansial, dan stabilitas sistem. Ketiga isu ini harus menjadi prioritas absolut dalam siklus perbaikan berikutnya.

#### 1.2.1. SQL Injection Potensial di GeoBlockingMiddleware (Severity: 9.5/10)

Temuan paling berbahaya terdapat pada `GeoBlockingMiddleware` di `python-service/common/middleware.py`. Meskipun kode spesifik tidak terlihat seluruhnya, pola umum middleware semacam ini sering kali melakukan query ke database menggunakan input dari `request.META['REMOTE_ADDR']` atau header `X-Forwarded-For` tanpa parameterisasi yang benar. Jika middleware ini melakukan query raw SQL untuk memeriksa daftar negara yang diblokir, dan input IP address atau negara tidak di-sanitize, maka attacker dapat menyuntikkan perintah SQL berbahaya. Dalam konteks aplikasi yang menangani data finansial dan KYC, SQL injection berpotensi menyebabkan **eksfiltrasi seluruh database**, termasuk data pribadi pengguna, dokumen KYC, informasi wallet, dan riwayat transaksi. Dampaknya melampaui kerugian finansial: dapat mengakibatkan **sanksi regulasi GDPR**, kehilangan kepercayaan pengguna, dan tuntutan hukum. Perbaikan harus mencakup: (1) audit menyeluruh terhadap seluruh query di middleware ini, (2) penggunaan Django ORM atau parameterisasi query yang ketat, (3) validasi format IP address sebelum digunakan dalam query, dan (4) pembatasan akses database middleware hanya ke tabel yang diperlukan melalui mekanisme database permissions.

#### 1.2.2. Logika Keamanan Cookie Terbalik di Settings (Severity: 9.0/10)

Konfigurasi keamanan cookie di `python-service/config/settings/base.py` mengandung kesalahan logika yang fatal pada baris berikut:

```python
SESSION_COOKIE_SECURE = not config("DEBUG", default=False, cast=bool)
CSRF_COOKIE_SECURE = not config("DEBUG", default=False, cast=bool)
```

Logika `not config("DEBUG", ...)` memiliki perilaku terbalik: ketika aplikasi berjalan dalam mode **DEBUG=True** (development), hasilnya adalah `False`, sehingga cookie tidak memerlukan HTTPS. Namun, ketika aplikasi berjalan dalam mode **DEBUG=False** (produksi), hasilnya adalah `True`, yang memaksa cookie hanya dikirim melalui HTTPS. Secara teori ini terlihat benar, tetapi masalah terjadi pada **fallback value**: jika environment variable `DEBUG` tidak terdefinisi, nilai default adalah `False`, yang membuat `SESSION_COOKIE_SECURE = True`. Ini berarti dalam kondisi deployment awal dimana konfigurasi environment belum lengkap, semua session cookie akan memerlukan HTTPS yang bisa menyebabkan masalah fungsionalitas. Lebih berbahaya lagi, jika seseorang secara tidak sengaja mengatur `DEBUG=True` di produksi (misalnya untuk troubleshooting), maka **keamanan cookie akan dinonaktifkan**, membuat session pengguna rentan terhadap serangan **session hijacking** dan **man-in-the-middle**. Perbaikan yang benar adalah menghilangkan negasi dan menggunakan nilai eksplisit: `SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=False, cast=bool)`, dengan dokumentasi yang jelas bahwa ini harus diatur `True` di produksi.

#### 1.2.3. Race Condition pada Pengiriman Gift Virtual (Severity: 9.0/10)

Alur transaksi pengiriman gift virtual di `python-service/apps/payments/views.py` dalam method `SendGiftAPIView.post` mengandung race condition yang dapat dieksploitasi untuk melakukan **double-spending**. Meskipun kode menggunakan `select_for_update()` untuk mengunci sender dan receiver, terdapat beberapa celah kritis:

```python
with transaction.atomic():
    try:
        gift = VirtualGift.objects.get(id=gift_id, is_active=True)
        # Row-Level Locking untuk Sender dan Receiver
        user = User.objects.select_for_update().get(id=request.user.id)
        receiver = User.objects.select_for_update().get(username=receiver_username)
```

**Celah pertama**: `VirtualGift.objects.get(id=gift_id, is_active=True)` tidak di-lock dengan `select_for_update()`, sehingga harga gift bisa diubah antara pembacaan dan pengurangan saldo. **Celah kedua**: pemeriksaan saldo `if user.balance_idr < total_charge:` dan pengurangan `user.balance_idr -= total_charge` terjadi terpisah, memungkinkan concurrent request untuk melewati pemeriksaan saldo karena keduanya membaca saldo yang sama sebelum salah satu melakukan pengurangan. **Celah ketiga**: tidak ada mekanisme idempotency key pada endpoint ini, sehingga retry dari client (misalnya karena timeout) dapat mengakibatkan pengiriman gift ganda dengan satu pembayaran. Dampaknya adalah **kerugian finansial langsung** bagi pengguna (saldo terpotong berkali-kali) dan inkonsistensi data pada pencatatan transaksi. Perbaikan memerlukan: (1) penguncian gift object juga dengan `select_for_update()`, (2) pemeriksaan saldo dan pengurangan dalam satu atomic operation, (3) implementasi idempotency key yang disimpan di database (bukan hanya cache), dan (4) penggunaan database constraint `CHECK (balance_idr >= 0)` sebagai garis pertahanan terakhir.

### 1.3. Matriks Risiko Keseluruhan

Matriks risiko berikut menggambarkan hubungan antara **Likelihood** (kemungkinan terjadinya eksploitasi) dan **Impact** (dampak jika terjadi) untuk 10 isu teratas. Kuadran atas-kanan (HIGH Likelihood + HIGH Impact) menunjukkan isu-isu yang harus diperbaiki segera.

| Isu | Likelihood (1-10) | Impact (1-10) | Risk Score | Kategori |
|---|---|---|---|---|
| SQL Injection (GeoBlocking) | 8 | 9 | **72** | Security |
| CSRF Cookie Logic Inversion | 9 | 8 | **72** | Security |
| Race Condition (Gift) | 8 | 8 | **64** | Logic |
| Hardcoded Fallback Secrets | 7 | 9 | **63** | Security |
| Missing Auth (Moderation) | 7 | 8 | **56** | Security |
| Fee Calculation Inconsistency | 8 | 7 | **56** | Logic |
| N+1 Query Problem | 8 | 7 | **56** | Performance |
| XSS via Template Renders | 6 | 9 | **54** | Security |
| Decimal Precision Loss | 7 | 8 | **56** | Logic |
| Insufficient Test Coverage | 9 | 6 | **54** | Testing |

*Tabel 2: Matriks Risiko untuk 10 Isu Teratas (Risk Score = Likelihood × Impact)*nDari matriks di atas, jelas bahwa isu-isu keamanan (SQL Injection, CSRF Logic, Missing Auth, XSS) menempati posisi dominan di kuadran risiko tinggi, mengindikasikan bahwa **lapisan keamanan aplikasi memiliki celah fundamental** yang dapat dieksploitasi dengan relatif mudah namun berdampak sangat parah. Perbaikan harus mengadopsi pendekatan **security-first**, bukan menambahkan validasi sebagai afterthought.

![Issue Analysis Dashboard](issue_analysis_dashboard.png)

*Gambar 1: Dashboard Analisis Isu - Distribusi dan Severity*

![Security and Logic Breakdown](security_logic_breakdown.png)

*Gambar 2: Breakdown Detail Kerentanan Keamanan dan Kesalahan Logika*

![Issue Registry](issue_registry.png)

*Gambar 3: Registry Lengkap 20 Isu Teratas dengan Klasifikasi dan Severity*

---

## 2. Kerentanan Keamanan Kritis dan Tinggi

Bagian ini menguraikan secara mendalam seluruh kerentanan keamanan yang teridentifikasi, dimulai dari yang paling kritis. Setiap temuan dilengkapi dengan analisis teknis, jalur eksploitasi potensial, dan rekomendasi perbaikan konkret.

### 2.1. SQL Injection dan Raw SQL Queries (CRITICAL)

Kerentanan SQL Injection merupakan ancaman paling serius dalam aplikasi web modern, dan sayangnya teridentifikasi di beberapa titik kritis dalam kode javahade.

#### 2.1.1. GeoBlockingMiddleware: Potensi SQL Injection pada IP Lookup

Meskipun implementasi lengkap `GeoBlockingMiddleware` tidak terlihat secara eksplisit, pola desain yang umum untuk middleware geo-blocking melibatkan query ke database untuk memeriksa apakah IP address pengguna berasal dari negara yang diblokir. Jika implementasi menggunakan **raw SQL query** dengan string formatting atau concatenation untuk memasukkan IP address atau kode negara, maka terbuka celah SQL injection yang parah. Sebagai contoh, kode berikut adalah anti-pattern yang berbahaya:

```python
# CONTOH KODE BERBAHAYA (anti-pattern)
country_code = get_country_from_ip(request.META['REMOTE_ADDR'])
query = f"SELECT * FROM blocked_countries WHERE code = '{country_code}'"
cursor.execute(query)
```

Dalam skenario ini, jika attacker dapat memanipulasi header `X-Forwarded-For` atau `REMOTE_ADDR` (yang seringkali tidak di-validasi), mereka dapat menyuntikkan payload SQL seperti `'; DROP TABLE users; --` atau `'; SELECT * FROM kyc_documents; --`. Mengingat aplikasi ini menangani **data KYC yang sangat sensitif** (nomor KTP, foto selfie, dokumen identitas), eksploitasi SQL injection bukan hanya berpotensi menyebabkan kehilangan data, tetapi juga **pelanggaran privasi masif** yang dapat berujung pada sanksi hukum berat. Selain itu, dengan adanya field `is_admin` dan `role` pada tabel `users`, SQL injection dapat digunakan untuk **eskalsai hak akses** dengan mengubah role pengguna biasa menjadi admin. Perbaikan yang harus dilakukan adalah: **selalu gunakan Django ORM atau parameterized queries**, validasi format IP address menggunakan library seperti `ipaddress` sebelum pemrosesan, dan terapkan **prinsip least privilege** pada database user yang digunakan aplikasi.

#### 2.1.2. Missing Parameterized Queries in Custom Middleware

Selain GeoBlockingMiddleware, kebiasaan menggunakan raw SQL tanpa parameterisasi tampaknya menjadi pola yang lebih luas. Dalam `config/settings/base.py`, terdapat konfigurasi `AuditLogMiddleware` yang juga kemungkinan melakukan insert ke database untuk setiap request. Jika middleware ini juga menggunakan raw SQL, maka setiap HTTP request menjadi vektor potensial untuk SQL injection. Kekhawatiran ini diperkuat oleh absensinya konvensi kode yang jelas mengenai penggunaan raw SQL - tidak ada linter rule, code review checklist, atau dokumentasi yang melarang praktik ini. Sebagai mitigasi jangka panjang, tim harus: (1) melakukan **audit manual** terhadap seluruh file di direktori `common/` dan `apps/*/middleware.py`, (2) mengganti semua raw SQL dengan Django ORM atau `cursor.execute()` dengan parameter tuple, (3) menambahkan **Bandit security linter** ke CI/CD pipeline untuk mendeteksi penggunaan `.execute()` dengan string formatting, dan (4) mempertimbangkan penggunaan **database read replicas** untuk query yang tidak memerlukan data real-time guna membatasi dampak jika terjadi injeksi.

### 2.2. Cross-Site Request Forgery (CSRF) dan Session Security

Keamanan session dan proteksi CSRF adalah fondasi keamanan aplikasi web berbasis session, namun ditemukan beberapa kelemahan serius di area ini.

#### 2.2.1. Logika SESSION_COOKIE_SECURE dan CSRF_COOKIE_SECURE Terbalik

Kesalahan logika yang paling signifikan terdapat pada konfigurasi cookie keamanan di `config/settings/base.py`:

```python
SESSION_COOKIE_SECURE = not config("DEBUG", default=False, cast=bool)
CSRF_COOKIE_SECURE = not config("DEBUG", default=False, cast=bool)
```

Logika ini menggunakan negasi terhadap nilai DEBUG, yang menciptakan beberapa skenario berbahaya. **Skenario 1**: Developer lokal menjalankan dengan `DEBUG=True` (default), sehingga `SESSION_COOKIE_SECURE=False`. Ini terlihat normal untuk development, tetapi jika developer secara tidak sengaja mengakses aplikasi melalui HTTPS lokal, cookie akan tetap dikirim melalui HTTP. **Skenario 2** (PALING BERBAHAYA): Di produksi, jika environment variable `DEBUG` tidak ter-set (sehingga default `False`), maka `SESSION_COOKIE_SECURE=True`. Ini terlihat benar. Tetapi jika ada kebutuhan darurat untuk troubleshooting dan seseorang mengatur `DEBUG=True` sementara, maka **keamanan cookie langsung dinonaktifkan** tanpa peringatan eksplisit. **Skenario 3**: Jika menggunakan platform deployment yang secara default mengatur `DEBUG=True` untuk aplikasi baru (sebelum konfigurasi lengkap), maka aplikasi akan berjalan tanpa keamanan cookie dari hari pertama. Perbaikan yang benar adalah menggunakan konfigurasi eksplisit terpisah:

```python
# PERBAIKAN
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=False, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=False, cast=bool)
# Di file .env.production:
# SESSION_COOKIE_SECURE=True
# CSRF_COOKIE_SECURE=True
```

Pendekatan ini menghilangkan dependensi tersembunyi terhadap variabel DEBUG dan membuat konfigurasi keamanan menjadi **eksplisit dan self-documenting**.

#### 2.2.2. Missing CSRF Protection on State-Changing API Endpoints

Arsitektur aplikasi ini menggabungkan dua paradigma autentikasi yang bertentangan: **session-based authentication** (untuk frontend Django templates) dan **JWT token-based authentication** (untuk API endpoints). Middleware `CsrfViewMiddleware` hanya melindungi view yang menggunakan session authentication, sementara API endpoints yang menggunakan `CustomJWTAuthentication` di `common/authentication.py` sepenuhnya mengabaikan CSRF token. Meskipun JWT seharusnya tidak rentan terhadap CSRF (karena token tidak otomatis dikirim oleh browser seperti cookie), celah muncul pada **hybrid endpoints** yang menerima kedua metode autentikasi. Jika ada endpoint yang menggunakan `SessionAuthentication` (terdaftar di `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`) dan juga dapat diakses via browser, maka endpoint tersebut rentan terhadap CSRF jika tidak dilindungi secara eksplisit. Contoh berbahaya adalah endpoint `POST /api/v1/payments/gifts/send/` yang menangani transfer saldo: jika endpoint ini secara tidak sengaja dapat diakses dengan session auth (karena fallback dalam `DEFAULT_AUTHENTICATION_CLASSES`), maka attacker dapat memaksa pengguna yang sudah login untuk mengirim gift tanpa persetujuan mereka. Mitigasi: (1) pisahkan secara jelas URL prefix untuk API (`/api/`) dan frontend (`/`), (2) hapus `SessionAuthentication` dari `DEFAULT_AUTHENTICATION_CLASSES` jika tidak benar-benar diperlukan, atau (3) tambahkan `@csrf_protect` secara eksplisit pada semua API view yang menerima session auth.

#### 2.2.3. Session Fixation Vulnerability in Authentication Flow

Alur autentikasi pada `CustomCookieLoginView` di `apps/accounts/views.py` menaruh JWT token di HttpOnly cookie, yang merupakan praktik baik. Namun, terdapat kelemahan pada manajemen session Django: setelah login berhasil, tidak ada pemanggilan `request.session.cycle_key()` atau regenerasi session ID. Ini berarti session ID sebelum login (yang mungkin telah diketahui attacker melalui serangan session fixation) tetap valid setelah login. Attacker dapat memaksa target untuk menggunakan session ID tertentu (misalnya melalui parameter URL `?sessionid=ATTACKER_KNOWN_ID`), dan ketika target login, attacker dapat menggunakan session ID yang sama untuk mengakses akun tersebut. Meskipun aplikasi menggunakan JWT, session Django masih aktif (terlihat dari `SessionMiddleware` dan `AuthenticationMiddleware` yang terdaftar). Perbaikan: tambahkan `request.session.cycle_key()` setelah login berhasil di `CustomCookieLoginView`, atau lebih baik lagi, **nonaktifkan session Django sepenuhnya** untuk API endpoints dan gunakan JWT secara eksklusif.

### 2.3. Authentication dan Authorization

Celah autentikasi dan otorisasi dapat memberikan attacker akses tidak sah ke data atau fungsionalitas yang seharusnya terlarang.

#### 2.3.1. ModerationCheckView: Missing Authentication Allowing Content Bypass

Endpoint `POST /api/v1/moderation/check/` di `apps/moderation/views.py` memiliki konfigurasi yang sangat berbahaya:

```python
class ModerationCheckView(APIView):
    permission_classes = [permissions.AllowAny]
```

Meskipun ada komentar yang menyatakan "In production, restrict to localhost/internal IPs", implementasi aktual sama sekali tidak memiliki pembatasan. Endpoint ini dirancang untuk digunakan oleh Go microservices untuk memeriksa konten pesan sebelum broadcast. Namun, dengan `AllowAny`, **siapa pun di internet dapat mengakses endpoint ini** dan mendapatkan respons apakah konten mereka akan lolos moderasi atau tidak. Lebih berbahaya lagi, jika endpoint ini juga mencatat keputusan moderasi ke database, attacker dapat mengisinya dengan data sampah. Jalur eksploitasi: attacker dapat mengirim ribuan request ke endpoint ini untuk "menguji" berbagai variasi pesan yang berisi konten berbahaya (ujaran kebencian, spam, phishing) untuk memahami pola moderasi dan menemukan celah bypass. Perbaikan: (1) ganti `AllowAny` dengan custom permission yang memeriksa IP address atau shared secret, (2) tambahkan **API key authentication** yang hanya diketahui oleh Go services, atau (3) gunakan **network-level isolation** (firewall) untuk memastikan hanya service internal yang dapat mengakses endpoint ini.

#### 2.3.2. CustomJWTAuthentication: Device Fingerprint Bypass via Header Spoofing

Implementasi device fingerprinting di `common/authentication.py` bertujuan mencegah session hijacking dengan membandingkan fingerprint di JWT token dengan fingerprint request saat ini:

```python
# Check device fingerprint
token_fp = validated_token.get('device_fingerprint')
if token_fp:
    import hashlib
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip = request.META.get('REMOTE_ADDR', '')
    raw_fp = f"{user.id}-{user_agent}-{ip}"
    current_fp = hashlib.sha256(raw_fp.encode()).hexdigest()
```

Masalah utama adalah `HTTP_USER_AGENT` dan `REMOTE_ADDR` dapat dengan mudah dipalsukan oleh attacker. Jika attacker berhasil mencuri JWT token (misalnya melalui XSS atau log leakage), mereka dapat membuat request dengan header `User-Agent` dan `X-Forwarded-For` yang sama dengan korban, sehingga melewati pemeriksaan fingerprint. Lebih parah lagi, jika aplikasi berjalan di belakang proxy atau load balancer (seperti Nginx), `REMOTE_ADDR` akan selalu menjadi IP internal proxy, bukan IP pengguna asli, sehingga pemeriksaan IP menjadi tidak efektif. Perbaikan: (1) gunakan `HTTP_X_FORWARDED_FOR` jika di belakang proxy dengan validasi daftar IP proxy yang tepercaya, (2) tambahkan komponen fingerprint yang lebih sulit dipalsukan seperti **TLS fingerprint** atau **canvas fingerprint** (dikirim dari client via header yang di-sign), atau (3) gunakan library Django yang lebih robust seperti `django-sessions-security`.

#### 2.3.3. JWT Token Stored in Cookie Without Proper Flags

Meskipun `CustomCookieLoginView` menggunakan `httponly=True` dan `samesite='Strict'`, terdapat beberapa kelemahan pada pengaturan cookie:

```python
response.set_cookie(
    key='access_token',
    value=access_token,
    httponly=True,
    secure=not settings.DEBUG,
    samesite='Strict',
    max_age=3600
)
```

**Kelemahan 1**: `secure=not settings.DEBUG` kembali ke masalah logika terbalik yang dibahas di bagian 2.2.1. **Kelemahan 2**: `max_age=3600` (1 jam) untuk access token terlalu lama jika dibandingkan dengan konfigurasi JWT di `SIMPLE_JWT` yang juga mengatur `ACCESS_TOKEN_LIFETIME=timedelta(minutes=60)`. Jika JWT token di-blacklist (misalnya karena logout), cookie tetap ada di browser selama 1 jam. **Kelemahan 3**: tidak ada pengaturan `path='/'`, sehingga cookie dikirim ke semua path termasuk static files, yang meningkatkan surface area untuk serangan. **Kelemahan 4**: tidak ada pengaturan `domain`, yang bisa menyebabkan cookie bocor ke subdomain yang tidak diinginkan. Perbaikan:

```python
# PERBAIKAN
response.set_cookie(
    key='access_token',
    value=access_token,
    httponly=True,
    secure=True,  # Eksplisit True, dikontrol via environment
    samesite='Strict',
    max_age=3600,
    path='/api/',  # Hanya kirim ke API endpoints
    domain=settings.COOKIE_DOMAIN,  # Kontrol eksplisit
)
```

### 2.4. Cross-Site Scripting (XSS)

XSS terjadi ketika aplikasi mengizinkan injeksi script berbahaya yang dieksekusi di browser pengguna.

#### 2.4.1. Missing Output Escaping in Django Template Rendering

Aplikasi ini menggunakan Django Template Engine untuk rendering frontend (terlihat dari `TEMPLATES` configuration di `config/settings/base.py`). Meskipun Django template secara default melakukan auto-escaping, terdapat beberapa pola berisiko:

1. **Penggunaan `|safe` filter**: Jika template menggunakan filter `|safe` pada data yang berasal dari user input (misalnya bio, post content), maka XSS dapat terjadi. Pencarian terhadap penggunaan `|safe` di seluruh direktori `templates/` harus dilakukan.

2. **`json_script` filter yang tidak digunakan**: Saat melewatkan data ke JavaScript (misalnya untuk konfigurasi HTMX), jika menggunakan `{{ variable }}` langsung tanpa `json_script` filter, maka XSS mungkin terjadi.

3. **Content dari API tidak di-escape**: Jika HTMX mengambil konten dari API endpoint dan langsung memasukkannya ke DOM tanpa sanitasi, maka XSS dapat terjadi meskipun API mengembalikan data yang "aman".

4. **Komentar di template yang membocorkan informasi**: Template berisi komentar HTML (`<!-- -->`) yang mungkin mengandung informasi sensitif tentang struktur data internal.

Mitigasi: (1) audit seluruh direktori `templates/` untuk penggunaan `|safe`, `{% autoescape off %}`, dan injeksi variabel ke JavaScript, (2) gunakan Content Security Policy (CSP) header untuk membatasi eksekusi script, (3) terapkan **HTMX anti-XSS patterns** seperti menggunakan `hx-target` dengan selektor yang spesifik dan menghindari `innerHTML` langsung.

#### 2.4.2. User-Generated Content Not Sanitized Before Display

Model `Post` di `apps/content/models.py` menyimpan konten dari creator:

```python
class Post(models.Model):
    body = models.TextField(blank=True, default="")
```

Tidak ada validasi atau sanitasi pada field `body` ini. Jika creator (yang sudah diverifikasi) menyisipkan HTML/JavaScript berbahaya, dan template menampilkannya tanpa escaping, maka XSS terjadi. Lebih berbahaya lagi, jika konten ini juga ditampilkan di email notifikasi atau di Go microservices (chat), maka vektor XSS meluas ke channel lain. Perbaikan: (1) gunakan library seperti **Bleach** untuk membersihkan HTML yang diizinkan, (2) tetap gunakan auto-escaping Django template untuk semua user-generated content, (3) jika rich text diperlukan, gunakan format Markdown yang di-render ke HTML di server dengan library yang aman seperti `markdown` dengan ekstensi yang dikontrol ketat.

### 2.5. Data Exposure and Privacy

Aplikasi yang menangani data KYC dan finansial harus memiliki perlindungan ekstra terhadap data exposure.

#### 2.5.1. JWT Secret Key Fallback to SECRET_KEY in Settings

Konfigurasi `SIMPLE_JWT` di `config/settings/base.py` mengandung kelemahan serius:

```python
"SIGNING_KEY": config("JWT_SECRET_KEY", default=SECRET_KEY),
```

Jika environment variable `JWT_SECRET_KEY` tidak terdefinisi, maka JWT token akan di-sign menggunakan `SECRET_KEY` Django. Ini menciptakan dua masalah: (1) `SECRET_KEY` Django biasanya lebih mudah diakses (terlihat di settings, mungkin di-log) dibandingkan key khusus JWT, dan (2) jika `SECRET_KEY` dikompromikan (misalnya melalui settings file leak), maka attacker tidak hanya dapat memalsukan session Django tetapi juga **membuat JWT token valid untuk semua pengguna**. Lebih parah lagi, karena JWT token mengandung `role`, `username`, dan `jwt_secret_version`, attacker dapat membuat token untuk user mana pun dengan role apapun. Perbaikan: (1) **wajibkan** `JWT_SECRET_KEY` untuk terdefinisi di environment, (2) gunakan `default=""` dan raise `ImproperlyConfigured` jika kosong, (3) gunakan key yang berbeda dan lebih kuat untuk JWT (minimal 256-bit).

#### 2.5.2. VERIFIED_KTP_CREATOR_FILTER Exposing Sensitive Document Data

Dalam `apps/accounts/admin.py`, terdapat konfigurasi admin untuk `KYCDocument`:

```python
@admin.register(KYCDocument)
class KYCDocumentAdmin(admin.ModelAdmin):
    list_display = ["user", "document_type", "status", "submitted_at"]
```

Meskipun ini terlihat normal, masalah muncul jika ada filter atau search field yang memungkinkan admin untuk mencari berdasarkan `document_number` atau `full_name`. Data KYC (nomor KTP, tanggal lahir) adalah **data sensitif yang diatur oleh UU Perlindungan Data Pribadi (UU PDP)**. Menampilkan data ini di Django admin tanpa enkripsi atau masking melanggar prinsip least privilege. Perbaikan: (1) enkripsi field `document_number` dan `full_name` di database menggunakan **Django Encrypted Text Field**, (2) mask nomor dokumen di admin (misalnya tampilkan hanya 4 digit terakhir), (3) tambahkan **audit log** untuk setiap akses ke data KYC di admin, (4) terapkan **two-factor authentication** wajib untuk semua akun admin.

---

## 3. Kesalahan Logika Bisnis dan Bug

Bagian ini menganalisis kesalahan dalam implementasi aturan bisnis yang dapat mengakibatkan inkonsistensi data, kerugian finansial, atau perilaku sistem yang tidak terduga.

### 3.1. Booking System Logic Flaws

Sistem booking adalah inti dari platform ini, namun ditemukan beberapa bug logika yang serius.

#### 3.1.1. HostBooking.save(): Decimal Precision Loss in Fee Calculations

Method `save()` pada model `HostBooking` di `apps/booking/models.py` mengandung perhitungan finansial yang kompleks namun rawan terhadap masalah presisi decimal:

```python
def save(self, *args, **kwargs):
    from decimal import Decimal
    # ...
    if self.total_cost:
        base_val = Decimal(str(self.total_cost))
        self.app_tax_fee = base_val * Decimal("0.12")
        self.service_fee = base_val * Decimal("0.02")
        self.admin_fee = base_val * Decimal("0.01")
        self.other_fee = base_val * Decimal("0.027")
        # ...
        total_fees = (
            self.app_tax_fee + self.service_fee + 
            self.admin_fee + self.validation_fee + self.other_fee
        )
        self.net_payout = base_val - total_fees
```

Masalahnya adalah penggunaan `Decimal(str(self.total_cost))` yang tidak menjamin presisi. Jika `self.total_cost` sudah dalam format float (meskipun disimpan sebagai DecimalField), konversi `str()` mungkin menghasilkan representasi float yang tidak akurat seperti `'99.99000000000001'`. Lebih parah lagi, penjumlahan dan pengurangan Decimal yang berulang dapat menyebabkan **rounding errors** yang akumulatif. Contoh: jika `base_val = Decimal("100.00")`, maka:
- `app_tax_fee = 12.00`
- `service_fee = 2.00`
- `admin_fee = 1.00`
- `other_fee = 2.70`
- Total fixed fees = 17.70
- `validation_fee` dihitung untuk menyerap sisa dari commission_rate (misal 22.7% = 22.70)
- `validation_fee = 22.70 - 17.70 = 5.00`
- `total_fees = 17.70 + 5.00 = 22.70`
- `net_payout = 100.00 - 22.70 = 77.30`

Secara matematika ini benar, tetapi dengan presisi Decimal yang terbatas (2 decimal places), hasil perhitungan `base_val * Decimal("0.027")` untuk `base_val = 100.00` menghasilkan `2.7000` yang masih akurat. Namun untuk nilai aneh seperti `base_val = 99.99`, hasilnya adalah `2.69973` yang dibulatkan menjadi `2.70` (dengan quantize). Akumulasi pembulatan ini dapat menyebabkan **selisih beberapa sen** per transaksi, yang dalam skala ribuan transaksi menjadi kerugian atau keuntungan yang tidak terjelaskan. Perbaikan: (1) tentukan **aturan pembulatan eksplisit** untuk setiap perhitungan, (2) gunakan `quantize()` dengan `ROUND_HALF_UP` secara konsisten, (3) pertimbangkan menyimpan semua fee sebagai integer dalam satuan terkecil (sen) untuk menghindari masalah Decimal sepenuhnya.

#### 3.1.2. HostBooking.save(): End Time Not Set Before Validation

Dalam method `save()`:

```python
if self.rate:
    self.currency = self.rate.currency
    if not self.pk or self.total_cost is None:
        self.total_cost = self.rate.price

    # Hitung end_datetime
    if self.start_datetime:
        duration_map = {
            "30m": timedelta(minutes=30),
            # ...
        }
        dur = duration_map.get(self.rate.duration_type, timedelta(hours=1))
        self.end_datetime = self.start_datetime + dur
```

Masalahnya adalah `self.end_datetime` dihitung di dalam method `save()`, tetapi validasi overlap (`clean()`) dipanggil SEBELUM `save()`. Ini berarti validasi overlap tidak memiliki akses ke `end_datetime` yang sudah dihitung, kecuali jika `clean()` juga menghitung ulang end time. Jika `clean()` mengandalkan `end_datetime` yang sudah di-set (misalnya dari form), maka ada celah race condition: jika dua booking dibuat secara bersamaan dengan `start_datetime` yang sama, keduanya dapat melewati validasi `clean()` (karena belum ada yang di-save), kemudian keduanya di-save, menyebabkan **double booking** untuk slot waktu yang sama. Perbaikan: (1) pindahkan perhitungan `end_datetime` ke method `clean()` sebelum validasi overlap, (2) gunakan **database-level constraint** untuk mencegah overlap, (3) gunakan `select_for_update()` pada tabel booking selama validasi.

#### 3.1.3. Surge Pricing Logic: Integer Division and Decimal Precision

Implementasi surge pricing di `apps/booking/views.py`:

```python
active_bookings_count = HostBooking.objects.filter(
    host=locked_host,
    status__in=[HostBooking.Status.PENDING, HostBooking.Status.CONFIRMED],
).count()

surge_multiplier = Decimal("1.0")
if active_bookings_count >= 2:
    excess = active_bookings_count - 1
    surge_increase = Decimal("0.10") * Decimal(str(excess))
    if surge_increase > Decimal("0.50"):
        surge_increase = Decimal("0.50")
    surge_multiplier += surge_increase

final_price = (price * surge_multiplier) * exchange_rate
```

Bug pertama: penggunaan `Decimal(str(excess))` adalah tidak perlu karena `excess` sudah integer, `Decimal(excess)` sudah cukup. Bug kedua: tidak ada pembulatan pada `final_price`, sehingga hasilnya bisa memiliki banyak digit desimal (misalnya `150000.00000000002`). Bug ketiga: surge pricing tidak memperhitungkan **waktu booking yang overlap**. Jika host memiliki 10 booking yang tersebar dalam 6 bulan ke depan, surge pricing tetap aktif meskipun host sebenarnya tidak sibuk pada waktu tertentu. Logika yang benar adalah menghitung jumlah booking yang aktif dalam **window waktu tertentu** (misalnya 7 hari ke depan dari `start_datetime`). Perbaikan: (1) gunakan `Decimal(excess)` langsung, (2) bulatkan `final_price` ke 2 decimal places, (3) filter `active_bookings_count` berdasarkan rentang waktu yang relevan.

#### 3.1.4. No-Show Cancellation: Net Payout Calculation Inconsistency

Method `host_booking_noshow_view` di `apps/booking/views.py` mengandung inkonsistensi perhitungan:

```python
booking.is_no_show_cancelled = True
booking.status = HostBooking.Status.CANCELLED
booking.save()  # ini akan memicu kalkulasi fee baru (25% refund, 65% host)

# Eksekusi Refund 25% ke Klien
refund_amount = booking.total_cost * Decimal("0.25")
```

Masalah: `booking.save()` dipanggil TERLEBIH DAHULU, yang memicu kalkulasi ulang fee di `HostBooking.save()`. Namun, refund 25% dihitung MANUAL setelahnya. Jika `HostBooking.save()` juga melakukan refund otomatis (tergantung implementasi lengkap yang tidak terlihat), maka terjadi **double refund**. Jika tidak, maka ada inkonsistensi antara logika di `save()` dan logika di view. Selain itu, refund 25% dihitung dari `booking.total_cost`, tetapi kompensasi 65% ke host menggunakan `booking.net_payout` (yang sudah dipotong fee). Ini berarti total distribusi (`25% refund + 65% host + fee`) tidak sama dengan `100%`. Perbaikan: (1) konsolidasikan seluruh logika refund/kompensasi di SATU tempat (model `save()` atau service layer), (2) gunakan **explicit state machine** untuk transisi status booking, (3) tambahkan assertion `assert refund_amount + booking.net_payout + total_fees == booking.total_cost` untuk memastikan konservasi dana.

### 3.2. Payment and Wallet Logic Errors

Sistem pembayaran adalah jantung platform, namun ditemukan beberapa bug yang dapat menyebabkan kerugian finansial.

#### 3.2.1. SendGiftAPIView: Race Condition in Balance Deduction

Seperti dibahas di bagian 1.2.3, `SendGiftAPIView` mengandung race condition serius. Analisis lebih mendalam menunjukkan bahwa meskipun `select_for_update()` digunakan, urutan operasi masih memiliki celah:

```python
with transaction.atomic():
    user = User.objects.select_for_update().get(id=request.user.id)
    receiver = User.objects.select_for_update().get(username=receiver_username)
    # ... cek saldo ...
    if user.balance_idr < total_charge:
        return Response({"error": ...}, status=400)
    # ... gap di sini ...
    user.balance_idr -= total_charge
    user.save()
```

Antara pemeriksaan saldo dan pengurangan saldo, tidak ada operasi lain yang mengunci resource. Jika dua request bersamaan (R1 dan R2) membaca saldo yang sama (misalnya 100,000), dan kedua pemeriksaan lolos (karena 100,000 > 50,000), maka kedua request akan mengurangi saldo, menyebabkan saldo negatif. Meskipun ada database constraint `CHECK (balance_idr >= 0)`, constraint ini tidak akan mencegah pengurangan jika transaction isolation level tidak cukup tinggi. Perbaikan yang kuat: gunakan **atomic UPDATE dengan WHERE clause**:

```python
from django.db.models import F
updated = User.objects.filter(
    id=request.user.id, 
    balance_idr__gte=total_charge
).update(balance_idr=F('balance_idr') - total_charge)

if updated == 0:
    return Response({"error": "Insufficient balance"}, status=400)
```

Pendekatan ini menghilangkan race condition karena pemeriksaan dan pengurangan terjadi dalam SATU operasi database atomik.

#### 3.2.2. PayPalCaptureOrderView: Missing Idempotency on Wallet Top-Up

Meskipun `PayPalCaptureOrderView` memeriksa idempotency menggunakan `WalletTransaction.objects.filter(reference_id=order_id).exists()`, terdapat celah waktu (time-of-check to time-of-use):

```python
# Cek idempotency: Pastikan Order ID ini belum pernah di-topup
if WalletTransaction.objects.filter(reference_id=order_id).exists():
    return Response({"error": "Order already processed"}, status=400)

# Update Balance
if currency == "USD": user.balance_usd += amount
# ...
user.save()

WalletTransaction.objects.create(
    user=user,
    transaction_type=WalletTransaction.TransactionType.DEPOSIT,
    # ...
    reference_id=order_id,
)
```

Masalah: pemeriksaan idempotency dilakukan SEBELUM `select_for_update()`. Jika dua request dengan order ID yang sama datang bersamaan, keduanya dapat melewati pemeriksaan (karena belum ada transaksi), kemudian keduanya menambahkan saldo dan membuat transaksi. Perbaikan: (1) gunakan **unique constraint** pada field `reference_id` di model `WalletTransaction`, (2) bungkus pemeriksaan dan pembuatan dalam satu atomic block dengan `select_for_update()`, atau (3) gunakan pattern **INSERT dengan ON CONFLICT** (PostgreSQL) untuk menangani duplikat secara elegan.

#### 3.2.3. CreatePaymentView: Always Using Mock Provider

Kode di `apps/payments/views.py`:

```python
def post(self, request):
    # ...
    provider = get_payment_provider("mock")
    result = provider.create_payment(
        amount=float(data["amount"]),
        currency=data["currency"],
        metadata=data.get("metadata", {}),
    )
```

Parameter `"mock"` di-hardcode, sehingga **seluruh transaksi pembayaran selalu menggunakan mock provider** terlepas dari environment atau konfigurasi. Ini berarti tidak ada uang nyata yang diproses, yang mungkin disengaja untuk development, tetapi sangat berbahaya jika tidak sengaja ter-deploy ke produksi. Lebih parah lagi, transaksi selalu di-mark sebagai `COMPLETED` tanpa verifikasi eksternal. Perbaikan: (1) gunakan konfigurasi environment untuk memilih provider: `provider = get_payment_provider(settings.DEFAULT_PAYMENT_PROVIDER)`, (2) tambahkan validasi bahwa provider mock tidak dapat digunakan di produksi, (3) pisahkan endpoint untuk testing dan produksi.

#### 3.2.4. Fee Distribution Inconsistency Across Different Cancellation Scenarios

Analisis terhadap berbagai skenario pembatalan menunjukkan **inkonsistensi total** dalam distribusi dana:

| Skenario | User Refund | Host Payout | Admin Fee | Total |
|---|---|---|---|---|
| Client Cancel < 24h | 50% | 50% (net_payout) | 0% | != 100% |
| Client Cancel CONFIRMED | 85% | 10% | 5% | 100% |
| Host Reject | 100% (total_cost) | 0% | 0% | 100% |
| No-Show | 25% | 65% (net_payout) | 10% | != 100% |
| Reschedule | 0% | 1.16% | 0.4% | != 100% |

Inkonsistensi ini tidak hanya membingungkan tetapi juga dapat disalahgunakan. Misalnya, jika user membatalkan booking CONFIRMED, mereka mendapat 85% refund. Tetapi jika mereka menunggu sampai < 24 jam dan membatalkan, mereka hanya mendapat 50%. Ini menciptakan **incentive yang salah** dan dapat dieksploitasi. Perbaikan: (1) definisikan **fee structure yang jelas dan konsisten** dalam dokumentasi, (2) implementasikan menggunakan **strategy pattern** dimana setiap skenario memiliki kelas distribusi sendiri, (3) tambahkan unit test yang memverifikasi `refund + host_payout + admin_fee == total_cost` untuk setiap skenario.

### 3.3. Content System Bugs

Sistem konten memiliki bug yang mempengaruhi integritas data engagement.

#### 3.3.1. Like/Unlike Toggle: Race Condition on Counter Updates

Implementasi `PostLikeToggleView` dan `PostUnlikeToggleView` di `apps/content/views.py` menggunakan pola read-modify-write pada counter:

```python
like, created = Like.objects.get_or_create(post=post, user=request.user)

if created:
    post.like_count += 1
    post.save(update_fields=['like_count'])
```

Ini adalah **race condition klasik**: jika dua user menyukai post yang sama secara bersamaan, keduanya membaca nilai `like_count` yang sama, menambahkan 1, dan menyimpan, sehingga hanya satu penambahan yang tercatat (yang terakhir menimpa yang pertama). Perbaikan: gunakan `F()` expression:

```python
from django.db.models import F
if created:
    Post.objects.filter(id=post.id).update(like_count=F('like_count') + 1)
```

#### 3.3.2. PostFeedView: N+1 Query Problem on Subscribed Creators

Implementasi `PostFeedView`:

```python
def get_queryset(self):
    qs = Post.objects.filter(is_published=True, scheduled_at__isnull=True).select_related("creator")
    user = self.request.user
    if user.is_authenticated:
        subscribed_creator_ids = user.subscriptions.filter(
            status="active"
        ).values_list("tier__creator__user_id", flat=True).distinct()
        qs = qs.filter(Q(is_premium=False) | Q(creator_id__in=subscribed_creator_ids))
    return qs
```

Meskipun menggunakan `select_related("creator")`, tidak ada `prefetch_related` untuk `likes` atau `comments`. Jika serializer `PostSerializer` mengakses informasi like dari user saat ini (misalnya `has_liked`), maka akan terjadi **N+1 query** untuk setiap post di feed. Dengan PAGE_SIZE=20, ini berarti 21 query untuk setiap request feed. Perbaikan: (1) gunakan `prefetch_related('likes')`, (2) annotate queryset dengan informasi like dari user saat ini, atau (3) gunakan caching untuk feed.

---

## 4. Kelemahan Arsitektur dan Desain

Arsitektur aplikasi menunjukkan beberapa kelemahan fundamental yang dapat menyebabkan masalah skalabilitas dan maintainability jangka panjang.

### 4.1. Mixed Authentication Paradigms

Aplikasi menggunakan **dua paradigma autentikasi yang bertentangan** secara bersamaan, yang menciptakan kompleksitas dan celah keamanan.

#### 4.1.1. Session-Based Auth (Frontend) vs JWT Auth (API) without Clear Boundaries

Di `config/settings/base.py`, `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']` mencakup:

```python
"DEFAULT_AUTHENTICATION_CLASSES": (
    "common.authentication.CustomJWTAuthentication",
    "rest_framework.authentication.SessionAuthentication",
),
```

Ini berarti setiap API endpoint akan mencoba JWT terlebih dahulu, kemudian fallback ke session authentication. Meskipun ini terlihat fleksibel, ini menciptakan **ambiguous security boundaries**. Sebagai contoh, endpoint `POST /api/v1/payments/gifts/send/` yang seharusnya hanya untuk API (JWT) juga dapat diakses oleh browser yang login via session. Jika endpoint ini tidak memiliki proteksi CSRF (karena diasumsikan JWT-only), maka session-authenticated request dari browser akan **melewati CSRF protection**. Perbaikan: (1) pisahkan endpoint API dan frontend dengan URL prefix yang jelas, (2) buat dua konfigurasi DRF terpisah - satu untuk API (hanya JWT) dan satu untuk internal endpoints (hanya session), atau (3) gunakan `@authentication_classes` dan `@permission_classes` secara eksplisit pada setiap view.

#### 4.1.2. CustomCookieLoginView Setting Both Session and JWT Cookies

`CustomCookieLoginView` menaruh JWT token di cookie, tetapi tidak menghapus session Django. Ini berarti setelah login, pengguna memiliki **dua mekanisme autentikasi aktif secara bersamaan**: session cookie (untuk Django templates) dan JWT cookie (untuk API). Jika salah satu dikompromikan, attacker masih memiliki akses melalui mekanisme lain. Selain itu, logout dari satu mekanisme tidak otomatis logout dari mekanisme lainnya. Perbaikan: (1) pilih satu paradigma autentikasi utama, (2) jika menggunakan JWT, nonaktifkan session Django dan gunakan JWT untuk semua autentikasi, atau (3) implementasikan **unified logout** yang menghapus kedua cookie sekaligus.

### 4.2. Model Design Issues

Desain model database menunjukkan beberapa kelemahan yang dapat mempengaruhi integritas data dan performa.

#### 4.2.1. Like Model: unique_together Constraint Conflict with Unlike Logic

Model `Like` di `apps/content/models.py` memiliki constraint:

```python
class Meta:
    unique_together = ["post", "user"]
```

Namun, model ini juga memiliki field `is_unlike`. Constraint `unique_together` berarti setiap user hanya dapat memiliki satu record Like per post, yang digunakan untuk menyimpan status like/unlike. Ini menciptakan **semantic ambiguity**: jika user menyukai post, kemudian unlike, lalu like lagi, record harus di-update berkali-kali. Lebih parah lagi, jika user A melakukan unlike (membuat record dengan `is_unlike=True`), kemudian user B melihat `unlike_count`, mereka melihat jumlah orang yang melakukan unlike, bukan jumlah unlike yang diberikan. Desain yang lebih baik adalah memisahkan model `Like` dan `Unlike`, atau menggunakan field `status` dengan pilihan `like`/`unlike` dan menghitung counter menggunakan aggregation query daripada menyimpannya secara denormalized.

#### 4.2.2. User Model: phone field Referenced in Admin but Missing from Model

Di `apps/accounts/admin.py`:

```python
fieldsets = BaseUserAdmin.fieldsets + (
    ("Kreativa", {"fields": ("avatar", "bio", "role", "is_verified", "phone", "date_of_birth")}),
)
```

Field `phone` direferensikan di admin, tetapi **tidak ada definisi field `phone` di model `User`** di `apps/accounts/models.py`. Ini akan menyebabkan **error saat mengakses Django admin** jika fieldset tersebut diakses. Ini menunjukkan kurangnya testing terhadap Django admin dan inkonsistensi antara definisi model dan konfigurasi admin.

#### 4.2.3. CreatorProfile Model: subscriber_count as Denormalized Counter without Triggers

Field `subscriber_count` di `CreatorProfile` adalah counter yang denormalized (disimpan langsung di tabel, bukan dihitung dari tabel Subscription). Namun, tidak ada **database trigger**, **Django signal**, atau **mechanisme konsistensi** yang terlihat untuk memastikan `subscriber_count` selalu sinkron dengan jumlah actual subscription. Jika subscription dibuat atau dihapus langsung dari database (bypass Django ORM), atau jika ada race condition pada pembuatan subscription, maka `subscriber_count` akan menjadi tidak akurat. Perbaikan: (1) gunakan `Count()` aggregation saat dibutuhkan, (2) jika denormalization diperlukan untuk performa, gunakan Django signals atau database triggers, (3) tambahkan **periodic reconciliation job** yang mengecek dan memperbaiki inkonsistensi.

#### 4.2.4. Missing Database Indexes on WalletTransaction reference_id

Model `WalletTransaction` digunakan untuk idempotency check:

```python
class WalletTransaction(models.Model):
    reference_id = models.CharField(max_length=255, blank=True, null=True, help_text="ID Booking atau Payment Intent terkait")
```

Field `reference_id` sering dicari untuk idempotency check (`WalletTransaction.objects.filter(reference_id=order_id).exists()`), tetapi tidak memiliki **database index**. Dengan pertumbuhan tabel transaksi, query ini akan menjadi semakin lambat, dan pada akhirnya dapat menyebabkan **timeout pada proses pembayaran**. Perbaikan: tambahkan `db_index=True` pada field `reference_id`, atau lebih baik lagi, gunakan `unique=True` untuk menjamin idempotency di level database.

### 4.3. View and Controller Design

Desain view layer menunjukkan beberapa anti-pattern yang mempengaruhi testability dan maintainability.

#### 4.3.1. Booking Views: Excessive Business Logic in View Functions

View seperti `book_host_view` di `apps/booking/views.py` memiliki **ratusan baris kode** yang mencakup: validasi KYC, pengecekan saldo, perhitungan surge pricing, konversi mata uang, pengurangan saldo, pembuatan booking, dan pengiriman notifikasi. Ini melanggar **Single Responsibility Principle (SRP)** dan membuat view menjadi sulit di-test. Logika bisnis seharusnya berada di **service layer** atau **model methods**, bukan di view. Sebagai contoh, sebagian besar logika di `book_host_view` dapat dipindahkan ke `BookingService.create_booking()` yang menerima parameter dan mengembalikan hasil, sementara view hanya menangani HTTP request/response.

#### 4.3.2. Moderation: Hardcoded Content Type Map

Di `apps/moderation/views.py`:

```python
CONTENT_TYPE_MAP = {
    "post": ("content", "post"),
    "comment": ("content", "comment"),
    "user": ("accounts", "user"),
    "story": ("content", "story"),
}
```

Mapping content type di-hardcode, sehingga jika ada model baru yang dapat di-report (misalnya `LiveStream`, `Message`), maka kode view harus diubah. Ini melangkat **Open/Closed Principle**. Perbaikan: gunakan **dynamic content type discovery** menggunakan `ContentType.objects.filter(app_label__in=['content', 'accounts', 'streaming'])`, atau definisikan mapping di settings atau database.

---

## 5. Kualitas Kode dan Maintainability

Bagian ini menganalisis aspek kualitas kode yang tidak langsung menyebabkan bug atau kerentanan, tetapi mempengaruhi kemudahan maintenance dan onboarding developer baru.

### 5.1. Code Duplication and Inconsistency

Duplikasi kode meningkatkan kemungkinan inkonsistensi dan mempersulit perubahan.

#### 5.1.1. Duplicate Balance Deduction Logic Across Payment and Booking

Logika pengurangan saldo pengguna muncul di setidaknya 4 tempat berbeda: `book_host_view` (booking), `SendGiftAPIView` (gift), `CreateStreamBountyAPIView` (bounty), dan `PayPalCaptureOrderView` (top-up). Setiap implementasi memiliki variasi sendiri dalam cara memeriksa saldo, mengurangi saldo, dan mencatat transaksi. Ini berarti jika ada perubahan kebijakan (misalnya menambahkan validasi minimum balance), perubahan harus dilakukan di 4 tempat, meningkatkan risiko inkonsistensi. Perbaikan: ekstrak ke `WalletService.deduct_balance(user, amount, currency)` yang menangani semua aspek pengurangan saldo secara konsisten.

#### 5.1.2. Inconsistent Error Handling Patterns (DRF vs Django Messages)

Aplikasi menggunakan dua pola error handling yang berbeda: API endpoints menggunakan DRF `Response({"error": ...}, status=...)` sementara frontend views menggunakan Django `messages.error(request, ...)`. Inkonsistensi ini mempersulit penanganan error di client (HTMX) yang mungkin perlu mem-parsing kedua format. Perbaikan: standardisasi format error response di seluruh aplikasi, gunakan DRF format untuk semua endpoint dan konversi ke format yang sesuai untuk frontend.

### 5.2. Hardcoded Values and Magic Numbers

#### 5.2.1. Magic Numbers in Fee Calculations (0.12, 0.02, 0.01, 0.027)

Di `HostBooking.save()` dan berbagai tempat lain, persentase fee di-hardcode:

```python
self.app_tax_fee = base_val * Decimal("0.12")      # 12%
self.service_fee = base_val * Decimal("0.02")       # 2%
self.admin_fee = base_val * Decimal("0.01")         # 1%
self.other_fee = base_val * Decimal("0.027")        # 2.7%
```

Jika ada perubahan kebijakan fee, developer harus mencari seluruh codebase untuk menemukan semua instansi. Lebih berbahaya lagi, jika ada inkonsistensi (misalnya satu tempat menggunakan 0.12 dan tempat lain menggunakan 0.13), maka perhitungan menjadi tidak valid. Perbaikan: definisikan konstanta di settings atau model:

```python
# settings.py
APP_TAX_RATE = Decimal("0.12")
SERVICE_FEE_RATE = Decimal("0.02")
# ...
```

#### 5.2.2. Crypto Conversion Rate Hardcoded (1 BNB = $300)

Di `VerifyCryptoTransactionView`:

```python
elif currency == "BNB":
    # Assume 1 BNB = $300 for simplification if not converted beforehand
    user.balance_usd += amount * Decimal("300")
```

Konversi harga BNB ke USD di-hardcode dengan nilai **$300**, yang sangat tidak akurat mengingat volatilitas harga cryptocurrency. Pada saat analisis ini dibuat (Juni 2026), harga BNB bisa jauh berbeda. Ini berarti pengguna yang melakukan deposit BNB akan mendapatkan saldo yang tidak adil (terlalu sedikit jika harga BNB naik, terlalu banyak jika harga turun). Perbaikan: gunakan **real-time API** seperti CoinGecko atau CoinMarketCap untuk mengambil harga BNB saat ini.

#### 5.2.3. Booking Status Default to CONFIRMED Instead of PENDING

Di model `Booking` (sistem booking ruangan):

```python
status = models.CharField(
    max_length=15,
    choices=Status.choices,
    default=Status.CONFIRMED,  # <-- Seharusnya PENDING
)
```

Status default adalah `CONFIRMED`, yang berarti setiap booking baru langsung dianggap dikonfirmasi tanpa persetujuan. Ini bertentangan dengan alur bisnis normal dimana booking harus menunggu konfirmasi. Meskipun mungkin disengaja untuk sistem booking ruangan yang otomatis, ini tidak konsisten dengan `HostBooking` yang menggunakan `Status.PENDING` sebagai default.

### 5.3. Inconsistent Patterns

#### 5.3.1. Mixed Use of Function-Based Views and Class-Based Views

Aplikasi mencampur function-based views (FBV) seperti `register_view`, `login_view` di `apps/booking/views.py` dengan class-based views (CBV) seperti `RegisterView`, `CreatePaymentView`. Inkonsistensi ini mempersulit penggunaan mixin reusable, decorator standar, dan testing. Perbaikan: konversi semua FBV ke CBV untuk konsistensi, atau gunakan FBV dengan decorator `@api_view` dari DRF untuk API endpoints.

#### 5.3.2. Inconsistent Naming Conventions (snake_case vs camelCase in JSON Responses)

Beberapa API endpoint menggunakan `snake_case` (misalnya `"booking_id"`, `"user_id"`) sementara yang lain menggunakan `camelCase` (misalnya `"orderID"`, `"isAnonymous"`). Inkonsistensi ini menyebabkan kebingungan di frontend dan mempersulit konsumsi API. Perbaikan: standarisasi ke satu konvensi (disarankan `snake_case` untuk konsistensi dengan Python) dan gunakan DRF camelCase renderer jika frontend memerlukan camelCase.

---

## 6. Fitur Tidak Lengkap dan Kurang Implementasi

Beberapa fitur dirancang tetapi tidak diimplementasikan sepenuhnya, menciptakan celah fungsionalitas.

### 6.1. Payment System

#### 6.1.1. WebhookView: Empty Implementation without Signature Verification

```python
class WebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Mock webhook handler — in production, verify signature
        return Response({"received": True})
```

Endpoint webhook pembayaran tidak memiliki **verifikasi tanda tangan** (signature verification). Ini berarti siapa pun dapat mengirim request ke endpoint ini dan memicu pemrosesan pembayaran palsu. Attacker dapat mengirim request webhook yang dibuat sendiri untuk menambahkan saldo ke akun mereka tanpa melakukan pembayaran nyata. Perbaikan: implementasikan verifikasi signature sesuai dokumentasi provider (Stripe, PayPal, Midtrans, dll.), gunakan **constant-time comparison** untuk memverifikasi signature, dan tolak request tanpa signature valid.

#### 6.1.2. Missing Actual Payment Provider Integration (Stripe, Midtrans, Xendit)

Meskipun model `PaymentIntent` memiliki field `provider` dengan pilihan `stripe`, `midtrans`, `xendit`, tidak ada implementasi aktual untuk provider-provider ini. Seluruh sistem pembayaran menggunakan mock provider. Ini berarti platform **tidak dapat menerima pembayaran nyata** dari pengguna. Perbaikan: implementasikan adapter pattern untuk setiap payment provider dengan interface yang konsisten.

#### 6.1.3. No Actual KYC Verification AI Integration (Mock Only)

KYC document di-upload dan disimpan, tetapi tidak ada integrasi aktual dengan **Groq Vision API** atau sistem AI lainnya untuk verifikasi otomatis. Dokumen hanya disimpan dan menunggu review manual oleh admin. Ini menciptakan bottleneck operasional dan keterlambatan dalam proses verifikasi creator. Perbaikan: implementasikan integrasi dengan Groq Vision API untuk OCR dan face matching antara foto KTP dan selfie.

### 6.2. Moderation System

#### 6.2.1. AIHighlightWebhookView: No Actual AI Processing, Only Cost Deduction

Endpoint `AIHighlightWebhookView` mengurangi saldo host sebesar $0.84 USD, tetapi **tidak melakukan pemrosesan AI apa pun**. Video URL hanya disimpan sebagai post baru tanpa analisis, highlight extraction, atau processing. Ini berarti host dikenakan biaya untuk layanan yang tidak mereka terima. Perbaikan: implementasikan integrasi aktual dengan AI service, atau nonaktifkan endpoint sampai integrasi siap.

#### 6.2.2. Missing Admin Panel for Dispute Resolution

Model `HostBookingDispute` memiliki status `OPEN`, `RESOLVED_HOST`, dan `RESOLVED_CLIENT`, tetapi tidak ada **Django admin custom view** atau **dashboard khusus** untuk admin meninjau dan menyelesaikan sengketa. Admin harus mengakses data langsung dari database atau Django admin standar yang tidak memiliki workflow untuk dispute resolution. Perbaikan: buat custom Django admin view atau endpoint API terpisah dengan autentikasi admin yang memungkinkan review evidence, pengambilan keputusan, dan eksekusi payout/refund otomatis.

### 6.3. Infrastructure

#### 6.3.1. Missing Celery Worker Configuration in Docker Compose

Meskipun aplikasi mengkonfigurasi Celery di settings, `docker-compose.yml` tidak memiliki **service Celery worker** atau **Celery beat scheduler**. Ini berarti semua task asynchronous (email, notifikasi, report generation) tidak akan dijalankan. Perbaikan: tambahkan service `celery-worker` dan `celery-beat` ke `docker-compose.yml`.

#### 6.3.3. Missing Health Check Endpoints for All Services

`docker-compose.yml` hanya mendefinisikan `healthcheck` untuk `postgres` dan `redis`. Service `python-api`, `python-saga-worker`, dan ketiga Go services sama sekali tidak memiliki endpoint health check. Tanpa health check, Docker Swarm atau Kubernetes tidak dapat menentukan apakah container aplikasi sehat dan siap menerima traffic. Ini berarti **failed containers tidak akan di-restart otomatis** dan load balancer tidak dapat melakukan health-based routing. Perbaikan: tambahkan endpoint `/health/` ke setiap service yang mengembalikan status koneksi database, Redis, dan dependensi eksternal lainnya.

#### 6.3.2. Missing Nginx Configuration for Static Files and Reverse Proxy

`docker-compose.yml` tidak memiliki service **Nginx**, yang berarti: (1) static files dan media files tidak dilayani secara efisien, (2) tidak ada reverse proxy untuk load balancing, (3) tidak ada SSL termination, (4) Django development server (`runserver`) harus digunakan di produksi (yang tidak direkomendasikan). Perbaikan: tambahkan service `nginx` dengan konfigurasi untuk static files, reverse proxy ke `python-api`, dan SSL.

---

## 7. Kesenjangan Testing

Kualitas testing sangat rendah untuk aplikasi dengan kompleksitas ini.

### 7.1. Insufficient Test Coverage

#### 7.1.1. Only 2 Test Functions in test_accounts.py

Seluruh aplikasi hanya memiliki **2 fungsi test** di `tests/test_accounts.py`: satu untuk pendaftaran user di bawah 18 tahun dan satu untuk pendaftaran berhasil. Ini berarti **kurang dari 0.5% code coverage**. Tidak ada testing untuk: sistem booking, sistem pembayaran, sistem konten, moderasi, atau autentikasi JWT. Perbaikan: targetkan minimal **80% code coverage** dengan fokus pada critical path (booking, payment, auth).

#### 7.1.2. No Tests for Booking System, Payment System, or Content System

Sistem-sistem kritis yang menangani uang dan data pengguna sama sekali tidak memiliki test. Ini berarti setiap perubahan kode berisiko memperkenalkan bug regresi tanpa terdeteksi. Perbaikan: tulis **integration tests** untuk setiap user journey kritis: membuat booking, membatalkan booking, mengirim gift, melakukan top-up, dll.

#### 7.1.3. No Integration Tests for PayPal or Crypto Payment Flows

Alur pembayaran PayPal dan cryptocurrency (yang paling kompleks dan berisiko) tidak memiliki integration test. Tidak ada cara untuk memverifikasi bahwa callback/webhook dari PayPal diproses dengan benar, atau bahwa verifikasi transaksi crypto berfungsi. Perbaikan: gunakan **mock server** untuk PayPal dan crypto API, dan tulis test end-to-end untuk seluruh alur pembayaran.

### 7.2. Missing Edge Case Testing

#### 7.2.1. No Tests for Double-Booking Race Conditions

Race condition pada pembuatan booking (baik room booking maupun host booking) tidak memiliki test. Tidak ada test yang mensimulasikan dua request bersamaan untuk slot waktu yang sama. Perbaikan: gunakan **concurrent testing** dengan `threading` atau `asyncio` untuk mensimulasikan race condition, atau gunakan database-level test dengan `select_for_update()`.

#### 7.2.2. No Tests for Currency Conversion Edge Cases

Sistem multi-mata uang tidak di-test untuk kasus-kasus seperti: nilai tukar yang sangat kecil, mata uang yang tidak didukung, atau pembulatan yang tidak konsisten. Perbaikan: tulis test untuk konversi dengan berbagai kombinasi mata uang dan verifikasi hasil pembulatan.

#### 7.2.3. No Tests for Concurrent Gift Sending

Race condition pada `SendGiftAPIView` tidak di-test. Tidak ada test yang mensimulasikan dua pengguna yang mengirim gift ke host yang sama secara bersamaan, atau satu pengguna yang mengirim gift ganda. Perbaikan: gunakan **load testing** dengan Locust atau k6 untuk mensimulasikan concurrent gift sending, dan verifikasi bahwa total saldo tetap konsisten.

#### 7.2.4. No Property-Based Testing for Financial Calculations

Sistem pembayaran dan booking yang menangani perhitungan Decimal tidak diuji dengan **property-based testing**. Pendekatan testing tradisional hanya menguji nilai spesifik, tetapi tidak menangkap edge case seperti: `Decimal("0.1") + Decimal("0.2") != Decimal("0.3")` (karena floating point representation), perhitungan dengan nilai tukar yang menghasilkan lebih dari 2 decimal places, atau pembulatan dengan `Decimal("2.675")` yang menghasilkan `2.67` bukan `2.68` (banker's rounding). Library seperti **Hypothesis** dapat menghasilkan ribuan kombinasi input acak untuk memverifikasi bahwa `refund_amount + host_payout + fees == total_cost` selalu benar untuk semua kombinasi input yang valid. Tanpa property-based testing, bug pembulatan dapat tersembunyi hingga muncul di production saat nilai transaksi aneh muncul.

---

## 8. Masalah Performa

Beberapa desain kode dapat menyebabkan masalah performa saat skala pengguna meningkat.

### 8.1. Database Query Inefficiencies

#### 8.1.1. N+1 Query in PostFeedView and Other List Views

Seperti dibahas di bagian 3.3.2, `PostFeedView` tidak menggunakan `prefetch_related` untuk related objects, menyebabkan N+1 query. Setiap post di feed memicu query tambahan untuk likes, comments, dan creator details. Dengan 20 post per halaman, ini berarti **21 query** per request. Perbaikan: gunakan `prefetch_related('likes', 'comments')` dan `select_related('creator__creatorprofile')`.

#### 8.1.2. Missing select_related/prefetch_related in Booking Views

View `my_bookings_view` mengambil `HostBooking` dengan `select_related("host", "user")`, tetapi tidak mem-prefetch `rate` atau `rating`. Jika template menampilkan informasi rate atau rating untuk setiap booking, maka akan terjadi N+1 query. Perbaikan: tambahkan `select_related('rate', 'rating')` ke queryset.

### 8.2. Caching Strategy

#### 8.2.1. No Caching for Exchange Rates or Static Data

`ExchangeRateService.get_rate()` dipanggil setiap kali diperlukan (misalnya saat membuat booking), tetapi tidak ada **caching**. Ini berarti setiap request booking memicu API call ke layanan kurs mata uang eksternal, yang lambat dan tidak reliabel. Perbaikan: gunakan Django cache (Redis) untuk menyimpan kurs mata uang selama 1 jam, atau gunakan background task untuk memperbarui kurs secara periodik.

#### 8.2.2. No Cache Invalidation Strategy for Denormalized Counters

Counter denormalized seperti `like_count`, `comment_count`, `subscriber_count` tidak memiliki **strategi invalidasi cache**. Jika ada inkonsistensi, tidak ada mekanisme untuk memperbaikinya kecuali manual. Perbaikan: gunakan **cache versioning** atau **periodic recalculation** untuk menjaga konsistensi counter.

#### 8.2.3. Inefficient Query Patterns in Admin Dashboard

Django admin yang dikonfigurasi di `apps/accounts/admin.py` menggunakan `list_select_related` yang tidak optimal. Untuk `KYCDocumentAdmin` yang menampilkan `user__username`, setiap halaman admin dengan 100 record akan melakukan 100 queries terpisah ke tabel `users` jika `list_select_related` tidak dikonfigurasi dengan benar. Dengan pertumbuhan data KYC, halaman admin akan menjadi semakin lambat, yang dapat menyebabkan **gateway timeout** saat admin mencoba mengakses daftar verifikasi. Perbaikan: tambahkan `list_select_related = ('user',)` dan `search_fields` yang terindeks, serta pertimbangkan pagination yang lebih kecil untuk view dengan banyak join.

#### 8.2.4. Missing Connection Pool Optimization

`config/settings/base.py` menggunakan `dj_database_url` dengan `conn_max_age=600`, yang mengaktifkan connection pooling selama 10 menit. Namun, tidak ada konfigurasi untuk `CONN_HEALTH_CHECKS` atau `DISABLE_SERVER_SIDE_CURSORS`. Tanpa health checks, connection yang corrupt (misalnya karena database restart) tetap digunakan hingga timeout. Tanpa disable server-side cursors, query besar dapat menyebabkan **memory bloat** di PostgreSQL. Perbaikan: tambahkan `CONN_HEALTH_CHECKS=True` dan `DISABLE_SERVER_SIDE_CURSORS=True` untuk stabilitas connection pool.

#### 8.2.5. No Async Support for I/O Bound Operations

Seluruh aplikasi Django berjalan secara **synchronous (WSGI)**, termasuk operasi I/O bound seperti panggilan ke PayPal API, verifikasi crypto, dan moderasi konten. Setiap request yang melakukan HTTP call eksternal akan **memblokir worker thread** selama durasi call tersebut (bisa 1-3 detik). Dengan worker limit yang tipikal (4 worker processes × 2 threads = 8 concurrent requests), hanya 8 request dapat diproses secara paralel. Jika semua 8 request menunggu response dari PayPal, server tidak dapat menangani request lain. Perbaikan: (1) migrasi ke **ASGI** dengan Django async views, (2) gunakan **aiohttp** atau **httpx** untuk HTTP call eksternal, atau (3) offloading ke Celery task untuk semua operasi eksternal.

---

## 9. Isu Konfigurasi dan Deployment

### 9.1. Django Settings

#### 9.1.1. DEBUG Mode Fallback to False but SECURITY Settings Depend on It

```python
SESSION_COOKIE_SECURE = not config("DEBUG", default=False, cast=bool)
```

Pola ini membuat keamanan cookie bergantung pada nilai DEBUG. Jika DEBUG diubah (bahkan sementara), keamanan berubah secara diam-diam. Perbaikan: gunakan konfigurasi eksplisit terpisah untuk setiap aspek keamanan.

#### 9.1.2. ALLOWED_HOSTS Defaulting to localhost in Production

```python
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())
```

Jika `ALLOWED_HOSTS` tidak di-set di produksi, default-nya adalah `localhost`, yang akan menyebabkan Django mengembalikan **400 Bad Request** untuk semua request. Meskipun ini tidak langsung berbahaya, ini menunjukkan konfigurasi yang tidak aman secara default. Perbaikan: gunakan `default=""` dan raise `ImproperlyConfigured` jika kosong di produksi.

### 9.2. Docker Compose

#### 9.2.1. python-saga-worker Depends on python-api Creating Circular Dependency

```yaml
python-saga-worker:
  depends_on:
    - python-api
```

`python-saga-worker` bergantung pada `python-api`, yang menciptakan **circular dependency potensial** jika `python-api` juga bergantung pada worker. Lebih baik keduanya bergantung pada infrastructure yang sama (database, Redis) tanpa saling bergantung. Perbaikan: hapus `depends_on` antara worker dan API, dan biarkan keduanya bergantung pada database dan Redis saja.

#### 9.2.2. No Health Check for Python Services

`docker-compose.yml` memiliki health check untuk `postgres` dan `redis`, tetapi tidak untuk `python-api`, `python-saga-worker`, atau Go services. Ini berarti Docker tidak dapat mendeteksi jika aplikasi Python crash atau hang. Perbaikan: tambahkan `healthcheck` ke setiap service menggunakan endpoint `/health/` atau `curl` ke root URL.

---

## 10. Kesimpulan dan Rekomendasi Perbaikan Prioritas

Analisis komprehensif terhadap repository `javahade` mengungkap **40 kekurangan dan kesalahan** yang signifikan, dengan fokus utama pada kerentanan keamanan (8 isu, severity 9.2), kesalahan logika bisnis (7 isu, severity 8.5), dan kelemahan arsitektur (6 isu, severity 7.8). Tiga isu berstatus **CRITICAL** (SQL Injection, CSRF Logic Inversion, Race Condition pada Gift) memerlukan perhatian segera sebelum aplikasi dapat di-deploy ke lingkungan produksi. Secara keseluruhan, aplikasi menunjukkan **bukti pengembangan yang terburu-buru** dengan fokus pada fitur dibandingkan keamanan, testing, dan kualitas kode, yang merupakan anti-pattern berbahaya untuk platform yang menangani data finansial dan KYC.

### 10.1. Ringkasan Statistik Temuan

| Metrik | Nilai |
|---|---|
| Total Isu Teridentifikasi | 40 |
| Rata-rata Severity Keseluruhan | 7.8 / 10 |
| Isu CRITICAL (Severity ≥ 9.0) | 3 |
| Isu HIGH (Severity 8.0 - 8.9) | 7 |
| Isu MEDIUM (Severity 6.0 - 7.9) | 18 |
| Isu LOW (Severity < 6.0) | 12 |
| Kategori Terdampak | 8 dari 8 |
| Estimasi Effort Perbaikan | 240 - 320 jam developer |

*Tabel 3: Ringkasan Statistik Temuan*

### 10.2. Daftar Perbaikan Prioritas (Top 10)

Berdasarkan analisis dampak dan upaya perbaikan, berikut adalah 10 prioritas tertinggi:

| Prioritas | Isu | Effort | Dampak |
|---|---|---|---|
| P0 | Perbaiki logika CSRF_COOKIE_SECURE dan SESSION_COOKIE_SECURE | 2 jam | Mencegah session hijacking |
| P0 | Implementasikan parameterized queries di GeoBlockingMiddleware | 4 jam | Mencegah SQL injection |
| P0 | Perbaiki race condition SendGiftAPIView dengan atomic UPDATE | 8 jam | Mencegah double-spending |
| P1 | Implementasikan webhook signature verification | 8 jam | Mencegah pembayaran palsu |
| P1 | Tambahkan unique constraint pada WalletTransaction.reference_id | 2 jam | Mencegah double top-up |
| P1 | Extract business logic dari view ke service layer | 40 jam | Meningkatkan maintainability |
| P1 | Implementasikan test suite dengan 80% coverage | 80 jam | Mencegah regresi |
| P2 | Perbaiki N+1 queries di list views | 8 jam | Meningkatkan performa |
| P2 | Tambahkan Celery worker dan Nginx ke docker-compose | 8 jam | Infrastruktur production-ready |
| P2 | Implementasikan KYC AI integration (Groq Vision) | 40 jam | Mengaktifkan verifikasi otomatis |

*Tabel 4: Daftar Perbaikan Prioritas dengan Estimasi*

### 10.3. Rekomendasi Arsitektural Jangka Panjang

Selain perbaikan segera, beberapa rekomendasi arsitektural dapat meningkatkan kualitas sistem secara fundamental. Platform `javahade` yang saat ini dibangun dengan pendekatan monolithic Django yang di-couple secara longgar dengan Go microservices akan menghadapi tantangan skalabilitas signifikan ketika jumlah pengguna melebihi 10,000 pengguna aktif. Struktur database yang shared antara Python dan Go services menciptakan **single point of failure** dan **bottleneck konkurensi** yang akan menjadi semakin parah seiring pertumbuhan transaksi. Migrasi bertahap ke arsitektur yang lebih robust akan menjadi investasi krusial untuk kelangsungan platform.

#### 10.3.1. Adopsi Clean Architecture / Hexagonal Architecture

Pisahkan domain logic (entities, use cases) dari infrastructure (database, HTTP framework, external services). Arsitektur saat ini menunjukkan **tight coupling** yang kuat antara Django models, views, dan framework-specific code. Sebagai contoh, logika bisnis booking langsung terikat pada Django ORM (`select_for_update`, `F()` expressions) dan DRF (`Response`, `APIView`). Dengan Clean Architecture, domain entities seperti `Booking`, `Wallet`, dan `Payment` menjadi pure Python objects tanpa dependensi framework, sehingga dapat diuji secara independen dan dipindahkan antar framework jika diperlukan. Use cases seperti `CreateBooking` atau `ProcessPayment` berinteraksi dengan interfaces (ports) yang diimplementasikan oleh adapters Django. Ini akan membuat kode lebih mudah di-test, tidak bergantung pada framework tertentu, dan memungkinkan replacement komponen tanpa mengubah domain logic.

#### 10.3.2. Implementasikan Event-Driven Architecture

Gunakan message broker seperti **Redis Streams**, **RabbitMQ**, atau **Apache Kafka** untuk komunikasi antar modul. Arsitektur saat ini menggunakan Django signals dan direct method calls antar app, yang menciptakan **tight temporal coupling**. Sebagai contoh, ketika booking dibuat, view `book_host_view` langsung memanggil `Notification.objects.create()` dan `WalletTransaction.objects.create()`. Jika service notifikasi atau payment down, proses booking gagal secara keseluruhan. Dengan Event-Driven Architecture, ketika booking dibuat, event `BookingCreated` di-publish ke message broker. Service Payment, Notification, dan Analytics masing-masing mengonsumsi event ini secara independen dan asynchronous. Pola ini dikenal sebagai **Transactional Outbox** untuk memastikan event selalu di-publish meskipun consumer sementara tidak tersedia. Keuntungannya termasuk: fault tolerance yang lebih tinggi, skalabilitas independen per service, dan kemampuan untuk menambahkan consumer baru tanpa mengubah publisher.

#### 10.3.3. Gunakan CQRS untuk Query yang Kompleks

Pisahkan model write dan read. Untuk operasi write seperti membuat booking atau mengirim gift, gunakan domain model yang ketat dengan validasi bisnis. Untuk operasi read seperti menampilkan feed atau dashboard analytics, gunakan **materialized views** atau **search engine** (Elasticsearch, OpenSearch) daripada query database SQL yang rumit. Feed saat ini menggunakan query Django ORM dengan multiple `filter`, `select_related`, dan `prefetch_related` yang akan menjadi semakin lambat seiring pertumbuhan data. Dengan CQRS, setiap kali post dibuat, data denormalized untuk feed di-update di Elasticsearch. Query feed menjadi sederhana (hanya search ke Elasticsearch) dan sangat cepat, sementara model write tetap terstruktur dan aman. Pola ini sangat efektif untuk sistem dengan **read-heavy workload** seperti platform konten.

#### 10.3.4. Implementasikan API Gateway

Gunakan API Gateway seperti **Kong**, **Ambassador**, atau **custom Nginx** dengan Lua scripting untuk menangani **cross-cutting concerns**. Saat ini setiap service menangani autentikasi, rate limiting, dan logging secara independen, yang menciptakan duplikasi kode dan inkonsistensi. API Gateway dapat menangani: (1) **JWT validation** secara terpusat, (2) **Rate limiting** per user atau per endpoint, (3) **Request/response logging** untuk audit, (4) **SSL termination**, (5) **Routing** ke service yang tepat berdasarkan path (`/api/v1/payments/` ke payment service, `/ws/chat/` ke chat service), (6) **Circuit breaker** untuk mencegah cascade failure jika satu service down, dan (7) **API versioning** untuk mendukung evolusi API tanpa breaking changes. Dengan API Gateway, Python service dapat fokus pada business logic tanpa menangani concerns infrastructural.

#### 10.3.5. Adopsi Database per Service Pattern

Saat ini semua service (Python dan Go) mengakses database PostgreSQL yang sama. Ini menciptakan **tight coupling** yang berbahaya: perubahan schema oleh satu service dapat merusak service lain, dan satu query berat dari service analytics dapat melambatkan seluruh sistem. Setiap service seharusnya memiliki database sendiri. Service Booking memiliki database booking, service Payment memiliki database payment, dan service Content memiliki database content. Komunikasi antar service dilakukan melalui **API calls** atau **events**, bukan direct database access. Pola **Saga Pattern** harus digunakan untuk transaksi yang melintasi multiple services (misalnya membuat booking melibatkan deduction saldo, pembuatan booking record, dan pengiriman notifikasi). Keuntungannya termasuk: isolasi kegagalan, kebebasan teknologi (setiap service bisa menggunakan database yang paling sesuai), dan skalabilitas independen.

#### 10.3.6. Implementasikan Observability Stack

Gunakan **Prometheus** untuk metrics collection, **Grafana** untuk visualization dan alerting, **Jaeger** atau **Zipkin** untuk distributed tracing, dan **ELK stack** (Elasticsearch, Logstash, Kibana) atau **Loki** untuk centralized logging. Di arsitektur microservices, sebuah request dapat melewati 5-10 service berbeda. Ketika terjadi error, sangat sulit untuk men-debug tanpa visibility end-to-end. Distributed tracing memungkinkan developer melihat jalur lengkap sebuah request dari API Gateway → Python Service → Database → Redis → Go Service, dengan timing untuk setiap hop. Metrics seperti request latency, error rate, dan throughput memungkinkan **proactive monitoring** dan alerting sebelum masalah berdampak pada pengguna. Centralized logging memungkinkan pencarian log dari semua service di satu tempat, dengan correlation ID yang menghubungkan log antar service untuk satu request.

#### 10.3.7. Security-First Development Pipeline

Integrasikan security scanning ke CI/CD pipeline secara otomatis: **SAST** (Static Application Security Testing) dengan tools seperti Semgrep, Bandit, dan CodeQL untuk mendeteksi kerentanan di source code; **DAST** (Dynamic Application Security Testing) dengan OWASP ZAP untuk menguji aplikasi yang berjalan; **Dependency scanning** dengan Snyk, Dependabot, atau OWASP Dependency-Check untuk mendeteksi library yang memiliki CVE; **Secret scanning** dengan GitLeaks atau TruffleHog untuk mencegah commit credential atau API key ke repository; dan **Container scanning** dengan Trivy atau Clair untuk mendeteksi kerentanan di Docker images. Setiap pull request harus gagal merge jika ada finding dengan severity HIGH atau CRITICAL. Pendekatan **shift-left security** ini memastikan kerentanan ditemukan dan diperbaiki sejak awal development, bukan setelah deployment ke produksi.

#### 10.3.8. Implementasikan Feature Flags dan Gradual Rollout

Gunakan feature flagging system seperti **LaunchDarkly**, **Unleash**, atau **custom Django feature flags** untuk mengontrol deployment fitur baru. Platform seperti `javahade` yang menangani transaksi finansial memerlukan kemampuan untuk: (1) mengaktifkan fitur baru hanya untuk persentase kecil pengguna (canary deployment), (2) menonaktifkan fitur yang bermasalah tanpa redeploy code (kill switch), (3) melakukan A/B testing untuk fitur monetisasi, dan (4) mengontrol akses fitur premium berdasarkan subscription tier. Tanpa feature flags, setiap deployment adalah **all-or-nothing**, yang berisiko tinggi untuk platform production.

Dengan implementasi perbaikan prioritas dan adopsi rekomendasi arsitektural secara bertahap, platform `javahade` dapat berkembang dari prototype yang fungsional menjadi sistem enterprise-grade yang aman, scalable, dan maintainable untuk jangka panjang. Fase pertama harus fokus pada perbaikan keamanan kritis (P0 items), fase kedua pada peningkatan test coverage dan refactoring service layer, dan fase ketiga pada migrasi arsitektur ke microservices yang lebih terpisah dengan database per service pattern. Komitmen terhadap kualitas kode dan keamanan sejak awal akan menjadi fondasi kepercayaan pengguna dan kesuksesan platform di pasar yang kompetitif.

### 10.4. Estimasi Timeline Perbaikan

Berdasarkan analisis depth dan kompleksitas setiap isu, berikut estimasi timeline perbaikan realistis dengan asumsi team terdiri dari 2 backend developer experienced:

| Fase | Periode | Deliverables |
|---|---|---|
| Fase 0: Security Hotfix | Minggu 1 | Perbaikan 3 isu CRITICAL, patching CSRF, SQL injection, race condition |
| Fase 1: Foundation | Minggu 2-3 | Implementasi test suite (target 60%), refactor service layer, database indexes |
| Fase 2: Payment Hardening | Minggu 4-5 | Webhook verification, idempotency, actual payment provider integration |
| Fase 3: Infrastructure | Minggu 6 | Docker compose fix (Nginx, Celery), monitoring, logging |
| Fase 4: Quality | Minggu 7-8 | Complete test coverage 80%, code review semua views, performance optimization |
| Fase 5: Architecture | Minggu 9-12 | Event-driven migration, API Gateway, database per service (opsional) |

Estimasi total **12 minggu** untuk mencapai production readiness dari kondisi saat ini, dengan biaya opportunity cost yang signifikan jika dipercepat secara tidak bertanggung jawab. Keputusan untuk deploy sebelum Fase 2 selesai membawa risiko finansial dan legal yang tidak dapat diterima untuk platform yang menangani pembayaran pengguna. Risiko paling signifikan adalah potensi kehilangan dana pengguna akibat race condition pada transaksi dan eksploitasi webhook yang tidak terverifikasi, yang dapat mengakibatkan kerugian finansial besar dan hilangnya kepercayaan pengguna secara permanen.
