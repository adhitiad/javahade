import os
import re

path = 'e:/java/python-service/apps/booking/views.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace('"booking/register.html"', '"accounts/register.html"')
new_content = new_content.replace('"booking/login.html"', '"accounts/login.html"')
new_content = new_content.replace('"booking/recovery_codes.html"', '"accounts/recovery_codes.html"')
new_content = new_content.replace('"booking/login_recovery.html"', '"accounts/login_recovery.html"')

if new_content != content:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {path}")
