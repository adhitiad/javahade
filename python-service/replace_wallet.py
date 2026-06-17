import os
import re

path = 'e:/java/python-service/apps/core_ui/views.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace('"core/user_wallet.html"', '"wallet/detail.html"')
new_content = new_content.replace("'core/user_wallet.html'", "'wallet/detail.html'")

new_content = new_content.replace('"core/user_topup.html"', '"wallet/topup.html"')
new_content = new_content.replace("'core/user_topup.html'", "'wallet/topup.html'")

new_content = new_content.replace('"core/creator_profile.html"', '"creator/profile.html"')
new_content = new_content.replace("'core/creator_profile.html'", "'creator/profile.html'")

new_content = new_content.replace('"core/edit_creator_profile.html"', '"creator/profile_edit.html"')
new_content = new_content.replace("'core/edit_creator_profile.html'", "'creator/profile_edit.html'")

if new_content != content:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {path}")
