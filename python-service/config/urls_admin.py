from django.urls import path
from apps.accounts.views_admin import AdminKYCListView, AdminKYCDetailView, AdminBadgeListView, AdminBadgeDetailView
from apps.moderation.views_admin import AdminReportListView, AdminReportDetailView
from apps.payments.views_admin import AdminPayoutListView, AdminPayoutDetailView

urlpatterns = [
    path("kyc/", AdminKYCListView.as_view(), name="admin-kyc-list"),
    path("kyc/<uuid:pk>/", AdminKYCDetailView.as_view(), name="admin-kyc-detail"),
    
    path("badges/", AdminBadgeListView.as_view(), name="admin-badge-list"),
    path("badges/<uuid:pk>/", AdminBadgeDetailView.as_view(), name="admin-badge-detail"),

    path("reports/", AdminReportListView.as_view(), name="admin-report-list"),
    path("reports/<uuid:pk>/", AdminReportDetailView.as_view(), name="admin-report-detail"),

    path("withdrawals/", AdminPayoutListView.as_view(), name="admin-payout-list"),
    path("withdrawals/<uuid:pk>/", AdminPayoutDetailView.as_view(), name="admin-payout-detail"),
]
