import psycopg
import getpass

def main():
    print("=== Setup PostgreSQL Kreativa ===")
    password = getpass.getpass("Masukkan kata sandi untuk akun 'postgres' Anda: ")
    
    try:
        # Hubungkan ke server PostgreSQL bawaan (database postgres)
        conn = psycopg.connect(
            dbname="postgres",
            user="postgres",
            password=password,
            host="127.0.0.1",
            port=5432,
            autocommit=True  # Wajib True untuk membuat database dan role
        )
        print("\n[OK] Berhasil terhubung ke PostgreSQL!")
        
        with conn.cursor() as cur:
            # Buat user kreativa
            print("Membuat akun 'kreativa'...")
            try:
                cur.execute("CREATE USER kreativa WITH PASSWORD 'kreativa_pass';")
                print("  [OK] Akun berhasil dibuat.")
            except psycopg.errors.DuplicateObject:
                print("  [INFO] Akun 'kreativa' sudah ada.")
                
            # Konfigurasi user
            cur.execute("ALTER ROLE kreativa SET client_encoding TO 'utf8';")
            cur.execute("ALTER ROLE kreativa SET default_transaction_isolation TO 'read committed';")
            cur.execute("ALTER ROLE kreativa SET timezone TO 'UTC';")
            
            # Buat database
            print("Membuat database 'kreativa_db'...")
            try:
                cur.execute("CREATE DATABASE kreativa_db OWNER kreativa;")
                print("  [OK] Database berhasil dibuat.")
            except psycopg.errors.DuplicateDatabase:
                print("  [INFO] Database 'kreativa_db' sudah ada.")
                
        conn.close()
        print("\n=== SETUP DATABASE SELESAI ===")
        print("Sekarang Anda bisa menjalankan kembali skrip setup.ps1!")
        
    except psycopg.OperationalError as e:
        print("\n[ERROR] Gagal terhubung! Pastikan PostgreSQL berjalan dan kata sandi yang Anda masukkan BENAR.")
        print("Detail Error:", e)

if __name__ == "__main__":
    main()
