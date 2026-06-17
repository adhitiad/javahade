import os

with open('e:/java/python-service/templates/layouts/base.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

head_lines = lines[4:176]
with open('e:/java/python-service/templates/includes/_head.html', 'w', encoding='utf-8') as f:
    f.writelines(head_lines)

navbar_lines = lines[225:399]
with open('e:/java/python-service/templates/includes/_navbar.html', 'w', encoding='utf-8') as f:
    f.writelines(navbar_lines)

mobile_menu_lines = lines[401:464]
with open('e:/java/python-service/templates/includes/_mobile_menu.html', 'w', encoding='utf-8') as f:
    f.writelines(mobile_menu_lines)

new_base = []
for i, line in enumerate(lines):
    if i == 4:
        new_base.append('    {% include "includes/_head.html" %}\n')
    elif 4 < i < 176:
        pass
    elif i == 225:
        new_base.append('      {% include "includes/_navbar.html" %}\n')
    elif 225 < i < 399:
        pass
    elif i == 401:
        new_base.append('      {% include "includes/_mobile_menu.html" %}\n')
    elif 401 < i < 464:
        pass
    else:
        new_base.append(line)

with open('e:/java/python-service/templates/layouts/base.html', 'w', encoding='utf-8') as f:
    f.writelines(new_base)
