import os

# urls.py
url_path = 'e:/java/python-service/apps/core_ui/urls.py'
with open(url_path, 'r', encoding='utf-8') as f:
    urls = f.read()

new_urls = '''    # HTMX Notification Endpoints
    path("htmx/notifications/badge/", views.htmx_notification_badge, name="htmx_notification_badge"),
    path("htmx/notifications/dropdown/", views.htmx_notification_dropdown, name="htmx_notification_dropdown"),
    path("htmx/notifications/<uuid:id>/read/", views.htmx_notification_read, name="htmx_notification_read"),
]'''

urls = urls.replace(']', new_urls)
with open(url_path, 'w', encoding='utf-8') as f:
    f.write(urls)

# views.py
view_path = 'e:/java/python-service/apps/core_ui/views.py'
with open(view_path, 'r', encoding='utf-8') as f:
    views = f.read()

views_addition = '''
# -----------------------------------------------------------------------------
# HTMX Notification Views
# -----------------------------------------------------------------------------
from apps.notifications.models import Notification

@login_required
def htmx_notification_badge(request):
    """
    Mengembalikan potongan HTML untuk ikon lonceng + badge unread count.
    Dipanggil secara berkala via HTMX polling.
    """
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    return render(request, "components/_notification_badge.html", {"unread_count": unread_count})

@login_required
def htmx_notification_dropdown(request):
    """
    Mengembalikan potongan HTML daftar notifikasi saat tombol lonceng diklik.
    """
    notifications = Notification.objects.filter(user=request.user).order_by("-created_at")[:5]
    return render(request, "components/_notification_dropdown.html", {"notifications": notifications})

@login_required
def htmx_notification_read(request, id):
    """
    Menandai sebuah notifikasi telah dibaca, lalu mereturn ulang dropdown HTMX.
    """
    if request.method == "POST":
        Notification.objects.filter(id=id, user=request.user).update(is_read=True)
    notifications = Notification.objects.filter(user=request.user).order_by("-created_at")[:5]
    return render(request, "components/_notification_dropdown.html", {"notifications": notifications})
'''

with open(view_path, 'a', encoding='utf-8') as f:
    f.write(views_addition)
print("Updated core_ui urls and views")
