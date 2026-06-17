import os

file_path = 'e:/java/go-services/chat-service/internal/ws/hub.go'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''			modURL := os.Getenv("MODERATION_API_URL")
			if modURL == "" {
				modURL = "http://python-api:8000/api/v1/moderation/check/"
			}
			resp, err := http.Post(modURL, "application/json", bytes.NewBuffer(reqBody))

			if err == nil && resp.StatusCode == http.StatusBadRequest {'''

new_code = '''			modURL := os.Getenv("MODERATION_API_URL")
			if modURL == "" {
				modURL = "http://python-api:8000/api/v1/moderation/check/"
			}
			
			// Optimasi: Gunakan Timeout 2 Detik agar WebSocket Client tidak Freeze
			client := &http.Client{Timeout: 2 * time.Second}
			resp, err := client.Post(modURL, "application/json", bytes.NewBuffer(reqBody))

			if err == nil && resp.StatusCode == http.StatusBadRequest {'''

content = content.replace(old_code, new_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated hub.go")
