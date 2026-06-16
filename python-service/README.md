# javahade

Platform eksklusif untuk penyewaan layanan *Host* (Kreator) secara privat dan interaksi *Live Streaming* premium. Proyek ini dibangun menggunakan **Python** dan kerangka kerja **Django**.

## Fitur Utama
- **Sistem Peran Dinamis**: Beranda (Feed), Dompet (Wallet), dan menu navigasi disesuaikan secara dinamis untuk peran Klien (*Fans*), *Host*, dan Admin.
- **Pemesanan Ruangan Privat (Booking)**: Klien dapat membooking Host untuk sesi privat.
- **Live Streaming & Eksklusivitas**: Host dapat mengadakan siaran langsung publik atau privat (*Family Only*).
- **Dompet Multi-Mata Uang**: Sistem dompet bawaan untuk mengonversi dan membelanjakan mata uang.
- **Pencarian Global**: Mencari Host dan Jadwal Live Stream dalam satu kolom pencarian yang elegan.

## Prasyarat
- Python 3.10+
- PostgreSQL
- Redis

## Pemasangan
1. Salin repositori ini (*clone*).
2. Buat _virtual environment_:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Untuk Linux/Mac
   venv\Scripts\activate     # Untuk Windows
   ```
3. Pasang dependensi:
   ```bash
   pip install -r requirements.txt
   ```
4. Jalankan migrasi basis data:
   ```bash
   python manage.py migrate
   ```
5. Mulai server pengembangan:
   ```bash
   python manage.py runserver
   ```
