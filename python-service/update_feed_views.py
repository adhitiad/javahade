import os
import re

view_path = 'e:/java/python-service/apps/core_ui/views.py'
with open(view_path, 'r', encoding='utf-8') as f:
    views = f.read()

old_index = '''def index_view(request):
    """
    Rute utama (Root URL).
    Jika user sudah login -> render Beranda (Feed).
    Jika guest (belum login) -> render Landing Page premium.
    """
    if request.user.is_authenticated:
        return render(request, "core/feed.html")
    else:
        return render(request, "core/landing.html")'''

new_index = '''from django.core.paginator import Paginator
from apps.content.models import Post, Story, Like

def index_view(request):
    """
    Rute utama (Root URL).
    Jika user sudah login -> render Beranda (Feed).
    Jika guest (belum login) -> render Landing Page premium.
    """
    if request.user.is_authenticated:
        stories = Story.objects.all()[:10]
        
        post_list = Post.objects.filter(is_published=True).select_related('creator')
        paginator = Paginator(post_list, 5)
        page_obj = paginator.get_page(1)
        
        liked_post_ids = Like.objects.filter(user=request.user, is_unlike=False).values_list('post_id', flat=True)

        return render(request, "core/feed.html", {
            "stories": stories,
            "posts": page_obj,
            "liked_post_ids": liked_post_ids
        })
    else:
        return render(request, "core/landing.html")'''

views = views.replace(old_index, new_index)

views_addition = '''
# -----------------------------------------------------------------------------
# HTMX Feed & Interactive Views
# -----------------------------------------------------------------------------
@login_required
def htmx_feed_posts(request):
    """
    Mengembalikan potongan HTML daftar postingan untuk infinite scroll HTMX.
    """
    page_number = request.GET.get('page', 2)
    post_list = Post.objects.filter(is_published=True).select_related('creator')
    paginator = Paginator(post_list, 5)
    page_obj = paginator.get_page(page_number)
    
    liked_post_ids = Like.objects.filter(user=request.user, is_unlike=False).values_list('post_id', flat=True)
    
    return render(request, "components/_feed_posts.html", {
        "posts": page_obj,
        "liked_post_ids": liked_post_ids
    })

@login_required
def htmx_like_post(request, post_id):
    """
    Menandai/mencabut Like pada postingan via HTMX. Mengembalikan tombol Like partial.
    """
    if request.method == "POST":
        post = Post.objects.get(id=post_id)
        like, created = Like.objects.get_or_create(user=request.user, post=post)
        
        if not created:
            # Toggle Like
            if like.is_unlike:
                like.is_unlike = False
                like.save()
                post.like_count += 1
                post.save(update_fields=['like_count'])
            else:
                like.is_unlike = True
                like.save()
                post.like_count = max(0, post.like_count - 1)
                post.save(update_fields=['like_count'])
        else:
            # Newly created like
            post.like_count += 1
            post.save(update_fields=['like_count'])
            
        is_liked = not like.is_unlike
        return render(request, "components/_post_like_button.html", {
            "post": post,
            "is_liked": is_liked
        })
'''

with open(view_path, 'w', encoding='utf-8') as f:
    f.write(views + views_addition)

print("Updated core_ui views.py")
