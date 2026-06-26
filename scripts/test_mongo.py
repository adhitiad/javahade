# pyrefly: ignore [missing-import]
from pymongo import MongoClient
import os

def test_mongo():
    try:
        host = os.getenv("MONGO_HOST", "localhost")
        port = os.getenv("MONGO_PORT", "27017")
        user = os.getenv("MONGO_ROOT_USERNAME", "mongo_admin")
        password = os.getenv("MONGO_ROOT_PASSWORD", "mongo_secret")
        
        uri = f"mongodb://{user}:{password}@{host}:{port}/?authSource=admin"
        
        client = MongoClient(
            uri,
            # ssl=True,
            # ssl_certfile='/path/to/mongo-client.pem',
            # ssl_ca_certs='/path/to/ca.pem'
        )
        
        # Ping test
        client.admin.command('ping')
        print("Successfully connected to MongoDB!")
        
        db = client[os.getenv("MONGO_DATABASE", "javahade_mongo")]
        print("Collections in database:", db.list_collection_names())
        
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

if __name__ == "__main__":
    test_mongo()
