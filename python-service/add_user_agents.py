import os

file_path = 'e:/java/python-service/requirements.txt'
with open(file_path, 'a', encoding='utf-8') as f:
    f.write('user-agents==2.2.0\n')

print("Added user-agents to requirements.txt")
