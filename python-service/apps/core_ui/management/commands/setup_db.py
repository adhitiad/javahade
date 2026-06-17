import psycopg
import getpass
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Setup PostgreSQL Kreativa'

    def handle(self, *args, **kwargs):
        self.stdout.write("=== Setup PostgreSQL Kreativa ===")
        password = getpass.getpass("Masukkan kata sandi untuk akun 'postgres' Anda: ")
        
        try:
            conn = psycopg.connect(
                dbname="postgres",
                user="postgres",
                password=password,
                host="127.0.0.1",
                port=5432,
                autocommit=True
            )
            self.stdout.write(self.style.SUCCESS("\n[OK] Berhasil terhubung ke PostgreSQL!"))
            
            with conn.cursor() as cur:
                self.stdout.write("Membuat akun 'kreativa'...")
                try:
                    cur.execute("CREATE USER kreativa WITH PASSWORD 'kreativa_pass';")
                    self.stdout.write(self.style.SUCCESS("  [OK] Akun berhasil dibuat."))
                except psycopg.errors.DuplicateObject:
                    self.stdout.write(self.style.WARNING("  [INFO] Akun 'kreativa' sudah ada."))
                    
                cur.execute("ALTER ROLE kreativa SET client_encoding TO 'utf8';")
                cur.execute("ALTER ROLE kreativa SET default_transaction_isolation TO 'read committed';")
                cur.execute("ALTER ROLE kreativa SET timezone TO 'UTC';")
                
                self.stdout.write("Membuat database 'kreativa_db'...")
                try:
                    cur.execute("CREATE DATABASE kreativa_db OWNER kreativa;")
                    self.stdout.write(self.style.SUCCESS("  [OK] Database berhasil dibuat."))
                except psycopg.errors.DuplicateDatabase:
                    self.stdout.write(self.style.WARNING("  [INFO] Database 'kreativa_db' sudah ada."))
                    
            conn.close()
            self.stdout.write(self.style.SUCCESS("\n=== SETUP DATABASE SELESAI ==="))
            
        except psycopg.OperationalError as e:
            self.stdout.write(self.style.ERROR("\n[ERROR] Gagal terhubung! Pastikan PostgreSQL berjalan dan kata sandi benar."))
            self.stdout.write(self.style.ERROR(f"Detail Error: {e}"))
