# Payment Service

Microservice Golang (Fiber) untuk menangani sistem pembayaran 18+ platform Javahade.
Mendukung gateway Verotel, Segpay, NETbilling, eLotPay (crypto), dan Paxum untuk payout.
Sistem ini menggunakan *double-entry accounting* untuk mencatat ledger serta menyimulasikan perhitungan *rolling reserve* (menahan 10% saldo untuk keperluan chargeback / refund).

## Stack
- Golang 1.21
- Fiber v2
- PostgreSQL (pgxpool)
- Redis

## Instalasi
1. Salin `.env.example` ke `.env`
2. Sesuaikan `DATABASE_URL` (contoh: port 6543 untuk Supabase pooler)
3. Jalankan `go run cmd/api/main.go`

## Cara Kerja Ledger (Double-Entry)
Ketika webhook pembayaran berhasil diterima:
1. Saldo dipotong 10% untuk reserve (disimpan di `locked_balance`).
2. Sisanya (90%) masuk ke `balance` wallet user.
3. Catatan ledger dibuat dengan akun `system_gateway` (Debit), `user_wallet_available` (Credit), dan `user_wallet_reserve` (Credit).

## Curl Examples

### Create Intent (Minta URL Pembayaran)
```bash
curl -X POST http://localhost:3000/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500,
    "currency": "USD",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "provider_preference": "segpay"
  }'
```

### Cek Saldo User
```bash
curl http://localhost:3000/v1/balance/123e4567-e89b-12d3-a456-426614174000
```

### Simulasi Webhook Segpay
```bash
curl -X POST http://localhost:3000/webhook/segpay \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "action=Auth&trantype=ref-12345&currencycode=USD&amount=15.00"
```

### Simulasi Payout Talent
```bash
curl -X POST http://localhost:3000/v1/payout \
  -H "Content-Type: application/json" \
  -d '{
    "talent_id": "talent-987",
    "amount": 5000
  }'
```
