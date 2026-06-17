import os

path = 'e:/java/python-service/templates/streaming/watch.html'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

video_player_lines = lines[10:80]
sticker_modal_lines = lines[80:165]
live_chat_lines = lines[165:192]
script_lines = lines[194:]

os.makedirs('e:/java/python-service/templates/components', exist_ok=True)

with open('e:/java/python-service/templates/components/_watch_video_player.html', 'w', encoding='utf-8') as f:
    f.writelines(video_player_lines)

with open('e:/java/python-service/templates/components/_watch_sticker_modal.html', 'w', encoding='utf-8') as f:
    f.writelines(sticker_modal_lines)

with open('e:/java/python-service/templates/components/_watch_live_chat.html', 'w', encoding='utf-8') as f:
    f.writelines(live_chat_lines)

with open('e:/java/python-service/templates/components/_watch_scripts.html', 'w', encoding='utf-8') as f:
    f.writelines(script_lines)

new_watch = lines[:10]
new_watch.append('        {% include "components/_watch_video_player.html" %}\n')
new_watch.append('        {% include "components/_watch_sticker_modal.html" %}\n')
new_watch.append('        {% include "components/_watch_live_chat.html" %}\n')
new_watch.append(lines[192])
new_watch.append(lines[193])
new_watch.append('{% include "components/_watch_scripts.html" %}\n')

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_watch)
print("Extracted components successfully.")
