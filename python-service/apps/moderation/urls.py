from django.urls import path
from .views import ReportCreateView, ReportListView
from .views import ModerationCheckView

urlpatterns = [
    path("reports/", ReportListView.as_view(), name="report-list"),
    path("reports/create/", ReportCreateView.as_view(), name="report-create"),
    path("check/", ModerationCheckView.as_view(), name="moderation-check"),
]
