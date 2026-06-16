from django.urls import path
from . import views

app_name = "streaming_ui"

urlpatterns = [
    path("", views.stream_list, name="list"),
    path("slot/<uuid:slot_id>/", views.stream_detail, name="detail"),
    path("watch/<uuid:stream_id>/", views.stream_watch, name="watch"),
]
