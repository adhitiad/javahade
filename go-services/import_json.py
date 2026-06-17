import os

file_path = 'e:/java/go-services/booking-service/internal/service/booking.go'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if '"encoding/json"' not in content:
    content = content.replace('"context"', '"context"\n\t"encoding/json"')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
