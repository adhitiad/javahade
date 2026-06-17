import os

view_path = 'e:/java/python-service/apps/core_ui/views.py'
with open(view_path, 'r', encoding='utf-8') as f:
    views = f.read()

old_index = '''from django.core.paginator import Paginator
from apps.content.models import Post, Story, Like

def index_view(request):
    """
    Rute utama (Root URL).
    Jika user sudah login -> render Beranda (Feed).
    Jika guest (belum login) -> render Landing Page premium.
    """
    if request.user.is_authenticated:
        stories = Story.objects.all()[:10]'''

new_index = '''from django.core.paginator import Paginator
from django.core.cache import cache
from apps.content.models import Post, Story, Like

def index_view(request):
    """
    Rute utama (Root URL).
    Jika user sudah login -> render Beranda (Feed).
    Jika guest (belum login) -> render Landing Page premium.
    """
    if request.user.is_authenticated:
        # Optimasi Backend: Cache query Story selama 60 detik (mengurangi beban DB)
        stories = cache.get("active_stories")
        if stories is None:
            stories = list(Story.objects.all()[:10])
            cache.set("active_stories", stories, 60)'''

views = views.replace(old_index, new_index)

with open(view_path, 'w', encoding='utf-8') as f:
    f.write(views)

print("Updated core_ui views.py with Redis cache")
