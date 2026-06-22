import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.core.cache import cache
try:
    cache.set('test', 1)
    print('Cache works')
except Exception as e:
    print('Error:', e)
