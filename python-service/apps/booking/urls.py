"""
URL routing untuk aplikasi Booking.
Semua URL menggunakan namespace 'booking'.
"""

from django.urls import path
from django.contrib.auth import views as auth_views

from . import views

app_name = "booking"

urlpatterns = [
    # --- Autentikasi ---
    path("register/", views.register_view, name="register"),
    path("register/recovery-codes/", views.show_recovery_codes_view, name="recovery_codes"),
    path("recovery/generate/", views.generate_recovery_codes_view, name="generate_recovery_codes"),
    path("login/", views.login_view, name="login"),
    path("login/recovery/", views.login_recovery_view, name="login_recovery"),
    path("logout/", views.logout_view, name="logout"),
    
    # --- Password Reset ---
    path('password-reset/', auth_views.PasswordResetView.as_view(
        template_name='booking/password_reset_form.html',
        email_template_name='booking/password_reset_email.html',
        success_url='/booking/password-reset/done/'
    ), name='password_reset'),
    
    path('password-reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='booking/password_reset_done.html'
    ), name='password_reset_done'),
    
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='booking/password_reset_confirm.html',
        success_url='/booking/reset/done/'
    ), name='password_reset_confirm'),
    
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='booking/password_reset_complete.html'
    ), name='password_reset_complete'),
    # --- Dashboard ---
    path("", views.dashboard_view, name="dashboard"),
    path("profile/edit/", views.edit_profile_view, name="edit_profile"),
    path("settings/", views.settings_view, name="settings"),
    # --- Ruangan ---
    path("rooms/", views.room_list_view, name="rooms"),
    # --- Booking CRUD ---
    path("create/", views.booking_create_view, name="booking_create"),
    path("my-bookings/", views.my_bookings_view, name="my_bookings"),
    path("detail/<uuid:booking_id>/", views.booking_detail_view, name="booking_detail"),
    path(
        "cancel/<uuid:booking_id>/",
        views.booking_cancel_view,
        name="booking_cancel",
    ),
    # --- API Endpoints ---
    path("api/chart-data/", views.chart_data_api, name="chart_data"),
    path("api/token/", views.token_api, name="token_api"),
    
    # --- Host Booking ---
    path("host/rates/", views.manage_host_rates_view, name="manage_host_rates"),
    path("host/book/<str:username>/", views.book_host_view, name="book_host"),
    
    # --- Host Dashboard (Pesanan Masuk) ---
    path("host/bookings/", views.manage_host_bookings_view, name="host_bookings_list"),
    path("host/bookings/<uuid:booking_id>/", views.host_booking_detail_view, name="host_booking_detail"),
    path("host/bookings/<uuid:booking_id>/action/", views.host_booking_action_view, name="host_booking_action"),
    path("host/bookings/<uuid:booking_id>/noshow/", views.host_booking_noshow_view, name="host_booking_noshow"),
    path("call/<uuid:booking_id>/", views.private_call_view, name="private_call"),
    path("report-fake-location/<uuid:booking_id>/", views.client_report_fake_location_view, name="client_report_fake_location"),
    path("submit-rating/<uuid:booking_id>/", views.submit_rating_view, name="submit_rating"),
    path("client-cancel/<uuid:booking_id>/", views.client_cancel_booking_view, name="client_cancel_host_booking"),
    path("client-complete/<uuid:booking_id>/", views.client_complete_booking_view, name="client_complete_booking"),
    path("client-dispute/<uuid:booking_id>/", views.client_raise_dispute_view, name="client_raise_dispute"),
]
