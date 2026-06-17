import os

file_path = 'e:/java/go-services/chat-service/internal/ws/hub.go'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''			client := &http.Client{Timeout: 2 * time.Second}
			resp, err := client.Post(modURL, "application/json", bytes.NewBuffer(reqBody))'''

new_code = '''			httpClient := &http.Client{Timeout: 2 * time.Second}
			resp, err := httpClient.Post(modURL, "application/json", bytes.NewBuffer(reqBody))'''

content = content.replace(old_code, new_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed shadowing in hub.go")
