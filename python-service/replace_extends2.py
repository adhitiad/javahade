import os
import re

for root, dirs, files in os.walk('e:/java/python-service/templates'):
    for file in files:
        if file.endswith('.html'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = re.sub(r'\{%\s*extends\s+[\'"]booking/base\.html[\'"]\s*%\}', "{% extends 'layouts/base.html' %}", content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated extends in {path}")
