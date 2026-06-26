#!/bin/bash
# backup_db.sh

# PostgreSQL Backup
pg_dump -h postgres_server_ip -U javahade_user -Fc javahade_db > /backup/postgres/javahade_$(date +%Y%m%d).dump

# MongoDB Backup
mongodump --host mongo_server_ip --username mongo_admin --password mongo_secret --db javahade_mongo --out /backup/mongo/

# Upload to S3
aws s3 sync /backup/ s3://javahade-backups/$(date +%Y%m%d)/
