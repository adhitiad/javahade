import os

for root, dirs, files in os.walk('e:/java/python-service/templates'):
    for file in files:
        if file.endswith('.html'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            new_content = content.replace("{% extends 'booking/base.html' %}", "{% extends 'layouts/base.html' %}")
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated extends in {path}")
