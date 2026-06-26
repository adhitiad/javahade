import psycopg
import os

def test_postgres():
    try:
        conn = psycopg.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            database=os.getenv("POSTGRES_DB", "javahade_db"),
            user=os.getenv("POSTGRES_USER", "javahade_user"),
            password=os.getenv("POSTGRES_PASSWORD", "secret_password"),
            # sslmode="require" # Uncomment if SSL is configured and required
        )
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        print("Successfully connected to PostgreSQL!")
        print("Version:", cursor.fetchone())
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Failed to connect to PostgreSQL: {e}")

if __name__ == "__main__":
    test_postgres()
