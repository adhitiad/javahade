from django.urls import path
from .views import NotificationListView, NotificationReadView, NotificationReadAllView, UnreadCountView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("read-all/", NotificationReadAllView.as_view(), name="notification-read-all"),
    path("unread-count/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("<uuid:id>/read/", NotificationReadView.as_view(), name="notification-read"),
]
