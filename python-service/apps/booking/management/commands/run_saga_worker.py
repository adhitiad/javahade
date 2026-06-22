import json
import logging
import time
from decimal import Decimal

import redis
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.booking.models import HostBooking

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Menjalankan Redis Stream Consumer untuk memproses Saga Pattern (Booking & Payment)'

    def handle(self, *args, **kwargs):
        # Konfigurasi Redis
        redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        # socket_timeout harus lebih besar dari block time (5000ms = 5s) pada xreadgroup
        r = redis.from_url(redis_url, decode_responses=True, socket_timeout=10)

        stream_name = 'saga:booking_events'
        group_name = 'python_payment_service'
        consumer_name = 'worker_1'

        # Buat Consumer Group jika belum ada
        try:
            r.xgroup_create(stream_name, group_name, id='0', mkstream=True)
            self.stdout.write(self.style.SUCCESS(f"Consumer Group '{group_name}' dibuat."))
        except redis.exceptions.ResponseError as e:
            if "BUSYGROUP Consumer Group name already exists" not in str(e):
                self.stdout.write(self.style.ERROR(f"Redis Error: {e}"))
            else:
                self.stdout.write(self.style.WARNING(f"Consumer Group '{group_name}' sudah ada."))

        self.stdout.write(self.style.SUCCESS('Mulai mendengarkan antrean Saga Pattern...'))

        while True:
            try:
                # XREADGROUP block=0 berarti menunggu pesan baru tanpa batas waktu
                # Count=1 memproses satu per satu demi keamanan transaksi
                messages = r.xreadgroup(group_name, consumer_name, {stream_name: '>'}, count=1, block=5000)

                for stream, msg_list in messages:
                    for msg_id, msg_data in msg_list:
                        event_type = msg_data.get('event')
                        payload_str = msg_data.get('payload', '{}')
                        
                        try:
                            payload = json.loads(payload_str)
                            self.process_event(r, stream_name, msg_id, event_type, payload)
                        except Exception as e:
                            logger.error(f"Gagal memproses event {msg_id}: {e}")
                            
            except Exception as e:
                logger.error(f"Redis Consumer Error: {e}")
                time.sleep(2) # Hindari loop cepat jika redis mati

    def process_event(self, r, stream, msg_id, event_type, payload):
        """Memproses event dari Go dan membalas status pembayarannya."""
        if event_type == 'booking.created':
            booking_id = payload.get('booking_id')
            user_id = payload.get('user_id')
            amount = Decimal(str(payload.get('amount', '0')))
            currency = payload.get('currency', 'IDR')
            
            logger.info(f"Menerima Booking {booking_id} dari User {user_id}. Mencoba memotong {amount} {currency}...")

            success, reason = self.deduct_balance(user_id, amount, currency, booking_id)

            # Buat balasan Event
            reply_event = 'payment.success' if success else 'payment.failed'
            reply_payload = {
                'booking_id': booking_id,
                'user_id': user_id,
                'reason': reason
            }
            
            # Publish ke Redis Stream
            r.xadd(stream, {
                'event': reply_event,
                'payload': json.dumps(reply_payload)
            })
            
            logger.info(f"Membalas ke Go: {reply_event} untuk Booking {booking_id}")

        elif event_type == 'booking.completed':
            booking_id = payload.get('booking_id')
            host_id = payload.get('host_id')
            amount = Decimal(str(payload.get('amount', '0')))
            currency = payload.get('currency', 'IDR')
            
            logger.info(f"Menerima Booking Completed {booking_id}. Mencairkan Escrow ke Host {host_id}...")
            
            success, reason = self.release_escrow(host_id, amount, currency, booking_id)
            if success:
                logger.info(f"Escrow dicairkan untuk Booking {booking_id}")
            else:
                logger.error(f"Gagal mencairkan Escrow untuk Booking {booking_id}: {reason}")

        # Acknowledge (Tandai pesan selesai diproses agar dihapus dari PEL)
        r.xack(stream, 'python_payment_service', msg_id)

    def deduct_balance(self, user_id, amount, currency, booking_id):
        """Menggunakan Database Lock (select_for_update) untuk mencegah Race Condition"""
        from apps.payments.models import WalletTransaction
        
        try:
            with transaction.atomic():
                # Kunci baris user ini agar transaksi lain tidak bisa memotong saldo secara bersamaan
                user = User.objects.select_for_update().get(id=user_id)

                # Validasi Saldo
                if currency == 'IDR' and user.balance_idr >= amount:
                    user.balance_idr -= amount
                elif currency == 'USD' and user.balance_usd >= amount:
                    user.balance_usd -= amount
                elif currency == 'SGD' and user.balance_sgd >= amount:
                    user.balance_sgd -= amount
                elif currency == 'MYR' and user.balance_myr >= amount:
                    user.balance_myr -= amount
                elif currency == 'CNY' and user.balance_cny >= amount:
                    user.balance_cny -= amount
                else:
                    return False, f"Saldo {currency} tidak cukup."

                user.save()

                # Catat mutasi wallet (ESCROW)
                WalletTransaction.objects.create(
                    user=user,
                    transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
                    amount=amount,
                    currency=currency,
                    status=WalletTransaction.Status.ESCROW,
                    notes=f"Pembayaran Booking Ditahan (Escrow) #{booking_id}"
                )

                return True, "Pembayaran berhasil masuk ke Escrow."
        except User.DoesNotExist:
            return False, "Pengguna tidak ditemukan."
        except Exception as e:
            return False, f"Error sistem: {str(e)}"

    def release_escrow(self, host_id, amount, currency, booking_id):
        """Mencairkan dana Escrow ke Host dengan potongan Platform Fee 10%"""
        from apps.payments.models import WalletTransaction
        
        try:
            with transaction.atomic():
                host = User.objects.select_for_update().get(id=host_id)
                
                # Potong 10% untuk Platform
                platform_fee = amount * Decimal('0.10')
                net_amount = amount - platform_fee
                
                # Tambah Saldo Host
                if currency == 'IDR': host.balance_idr += net_amount
                elif currency == 'USD': host.balance_usd += net_amount
                elif currency == 'SGD': host.balance_sgd += net_amount
                elif currency == 'MYR': host.balance_myr += net_amount
                elif currency == 'CNY': host.balance_cny += net_amount
                else: return False, f"Currency {currency} tidak didukung."
                
                host.save()
                
                # Catat pemasukan Host
                WalletTransaction.objects.create(
                    user=host,
                    transaction_type=WalletTransaction.TransactionType.EARNING,
                    amount=net_amount,
                    currency=currency,
                    status=WalletTransaction.Status.COMPLETED,
                    notes=f"Pencairan Escrow Booking #{booking_id} (Fee: {platform_fee})"
                )
                
                # Update status transaksi klien yang sebelumnya Escrow menjadi Completed
                # Ini mengasumsikan ada referensi, kita ambil yang notes-nya cocok
                client_tx = WalletTransaction.objects.filter(
                    status=WalletTransaction.Status.ESCROW,
                    notes__contains=str(booking_id)
                ).first()
                if client_tx:
                    client_tx.status = WalletTransaction.Status.COMPLETED
                    client_tx.save()
                    
                return True, "Dana berhasil dicairkan."
        except User.DoesNotExist:
            return False, "Host tidak ditemukan."
        except Exception as e:
            return False, f"Error pencairan: {str(e)}"
