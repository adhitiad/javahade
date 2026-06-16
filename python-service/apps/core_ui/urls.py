from django.urls import path
from . import views

app_name = "core_ui"

urlpatterns = [
    path("", views.index_view, name="index"),
    path("become-host/", views.become_host_view, name="become_host"),
    path("search/", views.global_search_view, name="search"),
    path("family/", views.family_portal_view, name="family_portal"),
    path("family/<uuid:family_id>/", views.family_detail_view, name="family_detail"),
    path("verify-kyc/", views.verify_kyc_view, name="verify_kyc"),
    path("host/tiers/", views.manage_subscription_tiers_view, name="manage_tiers"),
    path("host/edit/", views.edit_creator_profile_view, name="edit_creator_profile"),
    path("wallet/", views.user_wallet_view, name="user_wallet"),
    path("wallet/action/", views.user_wallet_action_view, name="user_wallet_action"),
    path("wallet/topup/", views.user_topup_view, name="user_topup"),
    path("wallet/convert/", views.user_wallet_convert_view, name="user_wallet_convert"),
    path("wallet/topup/action/", views.user_topup_action_view, name="user_topup_action"),
    path("admin-dashboard/", views.admin_dashboard_view, name="admin_dashboard"),
    path("admin-dashboard/withdraw/<str:tx_id>/action/", views.admin_withdraw_action_view, name="admin_withdraw_action"),
    path("admin-dashboard/kyc/<uuid:kyc_id>/action/", views.admin_kyc_action_view, name="admin_kyc_action"),
    path("admin-dashboard/report/<uuid:report_id>/action/", views.admin_report_action_view, name="admin_report_action"),
    path("creator/<str:username>/", views.creator_profile_view, name="creator_profile"),
    path("chat/", views.chat_inbox_view, name="chat_inbox"),
    path("chat/<str:username>/", views.chat_detail_view, name="chat_detail"),
    # Static Pages
    path("about/", views.about_view, name="about"),
    path("help/", views.help_view, name="help"),
    path("privacy/", views.privacy_view, name="privacy"),
    path("terms/", views.terms_view, name="terms"),
    path("buy-rating-package/", views.buy_rating_package_view, name="buy_rating_package"),
]
