"""
Views Booking — Autentikasi, dashboard, CRUD booking, dan API chart.
Semua view yang membutuhkan login dilindungi dengan @login_required.
CSRF protection aktif secara default pada semua form POST.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from rest_framework_simplejwt.tokens import AccessToken

from .forms import BookingForm, LoginForm, RegisterForm
from .models import Booking, Room

# =============================================================================
# Autentikasi
# =============================================================================


def register_view(request):
    """
    Halaman registrasi user baru.
    POST: Buat user baru, redirect ke login.
    GET: Tampilkan form registrasi.
    """
    if request.user.is_authenticated:
        return redirect("booking:dashboard")

    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()

            import random

            # Generate 12 random numbers between 1 and 99
            codes = [str(random.randint(1, 99)).zfill(2) for _ in range(12)]
            user.recovery_codes = codes
            user.save(update_fields=["recovery_codes"])

            # Simpan ke session untuk ditampilkan 1 kali
            request.session["new_recovery_codes"] = codes

            messages.success(
                request,
                f"Akun berhasil dibuat! Selamat datang, {user.username}. "
                "Harap simpan kode pemulihan Anda.",
            )
            return redirect("booking:recovery_codes")
    else:
        form = RegisterForm()

    return render(request, "booking/register.html", {"form": form})


def show_recovery_codes_view(request):
    """
    Halaman untuk menampilkan kode pemulihan hanya satu kali setelah registrasi.
    """
    codes = request.session.pop("new_recovery_codes", None)
    if not codes:
        # Jika tidak ada kode di session, berarti user mencoba akses langsung, redirect ke login
        return redirect("booking:login")

    return render(request, "booking/recovery_codes.html", {"codes": codes})


from django.views.decorators.http import require_POST


@login_required
@require_POST
def generate_recovery_codes_view(request):
    """
    Membuat ulang 12 kode pemulihan. Semua kode lama akan dihanguskan.
    """
    import random

    codes = [str(random.randint(1, 99)).zfill(2) for _ in range(12)]

    user = request.user
    user.recovery_codes = codes
    user.save(update_fields=["recovery_codes"])

    request.session["new_recovery_codes"] = codes
    messages.success(
        request, "12 Kode Pemulihan baru berhasil dibuat. Kode lama Anda telah hangus."
    )
    return redirect("booking:recovery_codes")


from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', method=['POST'], block=True)
def login_view(request):
    """
    Halaman login user.
    POST: Autentikasi user, buat session, redirect ke dashboard.
    GET: Tampilkan form login.
    CSRF protection aktif secara otomatis.
    """
    if request.user.is_authenticated:
        return redirect("booking:dashboard")

    if request.method == "POST":
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"Selamat datang kembali, {user.get_username()}!")
            next_url = request.GET.get("next", "booking:dashboard")
            return redirect(next_url)
    else:
        form = LoginForm()

    return render(request, "booking/login.html", {"form": form})


@ratelimit(key='ip', rate='5/m', method=['POST'], block=True)
def login_recovery_view(request):
    """
    Halaman login menggunakan Recovery Code.
    Bypass password jika kode valid, lalu hanguskan kode tersebut.
    """
    if request.user.is_authenticated:
        return redirect("booking:dashboard")

    if request.method == "POST":
        username_or_email = request.POST.get("username", "").strip()
        code = request.POST.get("recovery_code", "").strip()

        from apps.accounts.models import User
        from django.db.models import Q

        # Cari user berdasarkan username atau email
        user = User.objects.filter(
            Q(username=username_or_email) | Q(email=username_or_email)
        ).first()

        if user and user.recovery_codes:
            if code in user.recovery_codes:
                # Kode valid! Hapus kode tersebut agar tidak bisa dipakai lagi
                user.recovery_codes.remove(code)
                user.save(update_fields=["recovery_codes"])

                # Paksa login
                login(request, user)

                messages.warning(
                    request,
                    "Anda masuk menggunakan Kode Pemulihan Darurat. "
                    "Segera perbarui password Anda di pengaturan profil!",
                )
                return redirect("booking:dashboard")

        # Jika gagal
        messages.error(request, "Username/Email atau Kode Pemulihan tidak valid.")

    return render(request, "booking/login_recovery.html")


@login_required
def logout_view(request):
    """Logout user dan redirect ke halaman login."""
    logout(request)
    messages.info(request, "Anda telah berhasil logout.")
    response = redirect("booking:login")
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


# =============================================================================
# Dashboard
# =============================================================================


@login_required
def dashboard_view(request):
    """
    Dashboard utama user.
    Menampilkan statistik booking dan chart.
    """
    user = request.user
    today = timezone.now().date()

    # Statistik dasar
    total_bookings = Booking.objects.filter(user=user).count()
    active_bookings = Booking.objects.filter(
        user=user,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
        date__gte=today,
    ).count()
    today_bookings = Booking.objects.filter(
        user=user,
        date=today,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
    ).count()
    available_rooms = Room.objects.filter(is_active=True).count()

    # Booking terbaru (5 terakhir)
    recent_bookings = Booking.objects.filter(user=user).select_related("room")[:5]

    context = {
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "today_bookings": today_bookings,
        "available_rooms": available_rooms,
        "recent_bookings": recent_bookings,
    }

    return render(request, "booking/dashboard.html", context)


# =============================================================================
# API Chart Data
# =============================================================================


@login_required
@require_GET
def chart_data_api(request):
    """
    Endpoint JSON untuk data chart.
    Mengembalikan:
    - booking_per_day: jumlah booking 7 hari terakhir
    - booking_per_room: jumlah booking per ruangan
    Dilindungi session auth (bukan API key).
    """
    user = request.user
    today = timezone.now().date()
    week_ago = today - timedelta(days=6)

    # --- Chart 1: Booking per hari (7 hari terakhir) ---
    daily_data = (
        Booking.objects.filter(
            user=user,
            date__gte=week_ago,
            date__lte=today,
        )
        .annotate(day=TruncDate("date"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    # Buat data lengkap 7 hari (termasuk hari tanpa booking)
    daily_map = {item["day"]: item["count"] for item in daily_data}
    labels_daily = []
    values_daily = []
    for i in range(7):
        d = week_ago + timedelta(days=i)
        labels_daily.append(d.strftime("%d %b"))
        values_daily.append(daily_map.get(d, 0))

    # --- Chart 2: Booking per ruangan ---
    room_data = (
        Booking.objects.filter(user=user)
        .values("room__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:8]
    )

    labels_room = [item["room__name"] for item in room_data]
    values_room = [item["count"] for item in room_data]

    return JsonResponse(
        {
            "booking_per_day": {
                "labels": labels_daily,
                "values": values_daily,
            },
            "booking_per_room": {
                "labels": labels_room,
                "values": values_room,
            },
        }
    )


# =============================================================================
# Ruangan
# =============================================================================


@login_required
def room_list_view(request):
    """Daftar ruangan yang tersedia untuk booking."""
    rooms = Room.objects.filter(is_active=True)
    return render(request, "booking/rooms.html", {"rooms": rooms})


# =============================================================================
# CRUD Booking
# =============================================================================


@login_required
def booking_create_view(request):
    """
    Buat booking baru.
    POST: Validasi form + anti-double-booking, simpan ke database.
    GET: Tampilkan form booking.
    """
    if request.method == "POST":
        form = BookingForm(request.POST)
        if form.is_valid():
            booking = form.save(commit=False)
            booking.user = request.user
            # Hitung total biaya
            booking.total_cost = booking.room.hourly_rate * booking.duration_hours
            try:
                booking.save()
                messages.success(
                    request,
                    f"Booking ruangan '{booking.room.name}' pada "
                    f"{booking.date.strftime('%d %B %Y')} berhasil dibuat!",
                )
                return redirect("booking:my_bookings")
            except Exception as e:
                messages.error(request, f"Gagal membuat booking: {e}")
    else:
        # Pre-fill room jika ada query param
        initial = {}
        room_id = request.GET.get("room")
        if room_id:
            initial["room"] = room_id
        form = BookingForm(initial=initial)

    return render(request, "booking/booking_form.html", {"form": form})


@login_required
def my_bookings_view(request):
    """Daftar semua booking milik user yang sedang login."""
    from .models import HostBooking
    from django.db.models import Q

    bookings = (
        Booking.objects.filter(user=request.user)
        .select_related("room")
        .order_by("-date", "-start_time")
    )

    client_bookings = (
        HostBooking.objects.filter(user=request.user)
        .select_related("host", "user")
        .order_by("-start_datetime")
    )

    incoming_bookings = (
        HostBooking.objects.filter(host=request.user)
        .select_related("host", "user")
        .order_by("-start_datetime")
    )

    # Filter berdasarkan status (opsional)
    status_filter = request.GET.get("status")
    if status_filter and status_filter in dict(Booking.Status.choices):
        client_bookings = client_bookings.filter(status=status_filter)
        incoming_bookings = incoming_bookings.filter(status=status_filter)

    return render(
        request,
        "booking/my_bookings.html",
        {
            "client_bookings": client_bookings,
            "incoming_bookings": incoming_bookings,
            "status_filter": status_filter,
            "status_choices": Booking.Status.choices,
        },
    )


@login_required
def booking_detail_view(request, booking_id):
    """
    Detail booking + chat widget WebSocket.
    Hanya pemilik booking yang bisa mengakses.
    """
    booking = get_object_or_404(
        Booking.objects.select_related("room", "user"),
        pk=booking_id,
        user=request.user,
    )

    # URL WebSocket chat service dari environment
    chat_ws_url = getattr(settings, "CHAT_WS_URL", "ws://localhost:8081/ws/chat")

    context = {
        "booking": booking,
        "chat_ws_url": chat_ws_url,
    }

    return render(request, "booking/booking_detail.html", context)


@login_required
@require_POST
def booking_cancel_view(request, booking_id):
    """Batalkan booking (hanya pemilik)."""
    booking = get_object_or_404(
        Booking,
        pk=booking_id,
        user=request.user,
    )

    if booking.status in [Booking.Status.PENDING, Booking.Status.CONFIRMED]:
        booking.status = Booking.Status.CANCELLED
        booking.save()
        messages.success(request, "Booking berhasil dibatalkan.")

    return redirect("booking:my_bookings")


# =============================================================================
# Host Booking (Private Session)
# =============================================================================


@login_required
def manage_host_rates_view(request):
    """
    Dashboard untuk Host mengatur daftar harga (rates) mereka.
    """
    from .models import HostBookingRate

    if request.user.role != "host":
        messages.error(request, "Hanya Host yang dapat mengakses halaman ini.")
        return redirect("core_ui:index")

    if request.method == "POST":
        # Simpan pengaturan harga
        duration_type = request.POST.get("duration_type")
        price = request.POST.get("price")
        currency = request.POST.get("currency", "IDR")
        is_active = request.POST.get("is_active") == "on"

        if duration_type and price:
            try:
                rate, created = HostBookingRate.objects.get_or_create(
                    host=request.user,
                    duration_type=duration_type,
                    defaults={
                        "price": price,
                        "currency": currency,
                        "is_active": is_active,
                    },
                )
                if not created:
                    rate.price = price
                    rate.currency = currency
                    rate.is_active = is_active
                    rate.save()
                messages.success(request, "Daftar harga berhasil diperbarui.")
            except Exception as e:
                messages.error(request, f"Gagal menyimpan harga: {e}")
        return redirect("booking:manage_host_rates")

    # Ambil semua rates milik host ini
    my_rates = HostBookingRate.objects.filter(host=request.user)
    available_durations = HostBookingRate.DurationType.choices
    available_currencies = HostBookingRate.CurrencyChoices.choices

    return render(
        request,
        "booking/host_rates.html",
        {
            "rates": my_rates,
            "available_durations": available_durations,
            "available_currencies": available_currencies,
        },
    )


@login_required
def book_host_view(request, username):
    """
    Halaman bagi User untuk mem-booking Host.
    """
    from apps.accounts.models import User, KYCDocument
    from .models import HostBookingRate, HostBooking

    # --- Pengecekan Wajib KYC bagi Klien (Fan) ---
    if request.user.role != User.Role.HOST:
        has_kyc = KYCDocument.objects.filter(
            user=request.user, status=KYCDocument.Status.APPROVED
        ).exists()

        if not has_kyc:
            messages.error(
                request,
                "Keamanan adalah prioritas. Anda diwajibkan untuk Verifikasi KTP (KYC) terlebih dahulu sebelum dapat mem-booking sesi privat dengan Host.",
            )
            # Redirect ke halaman verifikasi KYC dengan menyertakan return url (next)
            return redirect(f"/verify-kyc/?next=/host/book/{username}/")
    # ---------------------------------------------

    host_user = get_object_or_404(User, username=username, role="host")
    rates = HostBookingRate.objects.filter(host=host_user, is_active=True).order_by(
        "price"
    )

    if request.method == "POST":
        rate_id = request.POST.get("rate_id")
        start_datetime = request.POST.get("start_datetime")
        notes = request.POST.get("notes", "")

        payment_method = request.POST.get("payment_method", "wallet")
        paypal_tx = request.POST.get("paypal_transaction_id")

        if rate_id and start_datetime:
            try:
                from django.db import transaction

                rate = get_object_or_404(HostBookingRate, id=rate_id, host=host_user)
                price = rate.price
                currency = rate.currency

                with transaction.atomic():
                    # Jika menggunakan Crypto, statusnya PENDING_PAYMENT dan tidak potong saldo
                    if payment_method in ["bnb", "usdt"]:
                        booking_status = HostBooking.Status.PENDING_PAYMENT
                    else:
                        pay_currency = request.POST.get("pay_currency", currency)
                        from decimal import Decimal
                        from apps.payments.services import ExchangeRateService

                        try:
                            rate_value = ExchangeRateService.get_rate(
                                currency, pay_currency
                            )
                            exchange_rate = Decimal(str(rate_value))
                        except Exception:
                            exchange_rate = Decimal("1.0")

                        if exchange_rate <= 0:
                            raise ValueError("Kurs tidak valid.")

                        # Lock User and Host to prevent race conditions (M-12, M-13)
                        locked_user = User.objects.select_for_update().get(id=request.user.id)
                        locked_host = User.objects.select_for_update().get(id=host_user.id)

                        # Idempotency Check
                        idempotency_key = request.POST.get("idempotency_key")
                        if idempotency_key:
                            if HostBooking.objects.filter(idempotency_key=idempotency_key).exists():
                                raise ValueError("Booking already processed.")
                        else:
                            # Fallback if no idempotency key
                            from datetime import timedelta
                            from django.utils import timezone
                            recent_booking = HostBooking.objects.filter(
                                user=locked_user,
                                host=locked_host,
                                start_datetime=start_datetime,
                                created_at__gte=timezone.now() - timedelta(minutes=5),
                            ).exists()
                            if recent_booking:
                                raise ValueError(
                                    "Anda baru saja membuat pesanan untuk slot waktu ini (Idempotency Conflict)."
                                )

                        # Surge Pricing Logic
                        active_bookings_count = HostBooking.objects.filter(
                            host=locked_host,
                            status__in=[
                                HostBooking.Status.PENDING,
                                HostBooking.Status.CONFIRMED,
                            ],
                        ).count()

                        surge_multiplier = Decimal("1.0")
                        if active_bookings_count >= 2:
                            excess = active_bookings_count - 1
                            surge_increase = Decimal("0.10") * Decimal(str(excess))
                            if surge_increase > Decimal("0.50"):
                                surge_increase = Decimal("0.50")
                            surge_multiplier += surge_increase

                        final_price = (price * surge_multiplier) * exchange_rate

                        # Metode Wallet atau PayPal (yang sudah otomatis top-up wallet via JS API)
                        if (
                            pay_currency == "IDR"
                            and request.user.balance_idr < final_price
                        ):
                            raise ValueError(
                                f"Saldo IDR tidak cukup. Anda butuh IDR {final_price:.2f}."
                            )
                        elif (
                            pay_currency == "USD"
                            and request.user.balance_usd < final_price
                        ):
                            raise ValueError(
                                f"Saldo USD tidak cukup. Anda butuh USD {final_price:.2f}."
                            )
                        elif (
                            pay_currency == "SGD"
                            and request.user.balance_sgd < final_price
                        ):
                            raise ValueError(
                                f"Saldo SGD tidak cukup. Anda butuh SGD {final_price:.2f}."
                            )
                        elif (
                            pay_currency == "MYR"
                            and request.user.balance_myr < final_price
                        ):
                            raise ValueError(
                                f"Saldo MYR tidak cukup. Anda butuh MYR {final_price:.2f}."
                            )
                        elif (
                            pay_currency == "CNY"
                            and request.user.balance_cny < final_price
                        ):
                            raise ValueError(
                                f"Saldo CNY tidak cukup. Anda butuh CNY {final_price:.2f}."
                            )

                        # Potong saldo Klien (Escrow) berdasarkan mata uang yang mereka gunakan
                        if pay_currency == "IDR":
                            request.user.balance_idr -= final_price
                        elif pay_currency == "USD":
                            request.user.balance_usd -= final_price
                        elif pay_currency == "SGD":
                            request.user.balance_sgd -= final_price
                        elif pay_currency == "MYR":
                            request.user.balance_myr -= final_price
                        elif pay_currency == "CNY":
                            request.user.balance_cny -= final_price
                        request.user.save()

                        # Catat transaksi pemotongan
                        from apps.payments.models import WalletTransaction

                        WalletTransaction.objects.create(
                            user=request.user,
                            transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,  # Outgoing for booking
                            amount=final_price,
                            currency=pay_currency,
                            status=WalletTransaction.Status.COMPLETED,
                            notes=f"Pembayaran Booking Host {host_user.username} (Kurs: 1 {currency} = {exchange_rate} {pay_currency})",
                        )
                        booking_status = HostBooking.Status.PENDING

                    booking = HostBooking.objects.create(
                        user=request.user,
                        host=host_user,
                        rate=rate,
                        start_datetime=start_datetime,
                        notes=notes,
                        status=booking_status,
                    )

                    if booking_status == HostBooking.Status.PENDING:
                        # Kirim Notifikasi ke Host hanya jika sudah lunas
                        from apps.notifications.models import Notification

                        Notification.objects.create(
                            user=host_user,
                            type=Notification.NotificationType.NEW_HOST_BOOKING,
                            title="Pemesanan Privat Baru!",
                            body=f"{request.user.username} baru saja mengirim dan MEMBAYAR pesanan untuk {rate.get_duration_type_display()}. Segera konfirmasi!",
                            data={"booking_id": str(booking.id)},
                        )

                if booking_status == HostBooking.Status.PENDING_PAYMENT:
                    messages.success(
                        request,
                        f"Request booking berhasil dibuat. Silakan tunggu admin memverifikasi TXID Crypto Anda.",
                    )
                else:
                    messages.success(
                        request,
                        f"Berhasil mengirim request booking (Lunas) ke {host_user.username}!",
                    )
                return redirect("core_ui:creator_profile", username=username)
            except ValueError as ve:
                messages.error(request, str(ve))
            except Exception as e:
                messages.error(request, f"Gagal mem-booking: {e}")

    from django.conf import settings

    return render(
        request,
        "booking/host_booking_form.html",
        {
            "host": host_user,
            "rates": rates,
            "paypal_client_id": settings.PAYPAL_CLIENT_ID,
            "user_balances": {
                "IDR": float(request.user.balance_idr),
                "USD": float(request.user.balance_usd),
                "SGD": float(request.user.balance_sgd),
                "MYR": float(request.user.balance_myr),
                "CNY": float(request.user.balance_cny),
            },
        },
    )


# =============================================================================
# API Token (JWT untuk WebSocket)
# =============================================================================


@login_required
def manage_host_bookings_view(request):
    """
    Dashboard untuk Host melihat daftar pesanan privat yang masuk.
    """
    from .models import HostBooking

    if request.user.role != "host":
        messages.error(request, "Hanya Host yang dapat mengakses halaman ini.")
        return redirect("core_ui:index")

    bookings = HostBooking.objects.filter(host=request.user).order_by("-created_at")

    return render(request, "booking/host_bookings_list.html", {"bookings": bookings})


@login_required
def host_booking_detail_view(request, booking_id):
    """
    Detail Pesanan Privat & Informasi Intelejen (KYC/Umur) Klien.
    """
    from .models import HostBooking
    from apps.accounts.models import KYCDocument
    from datetime import date

    booking = get_object_or_404(HostBooking, id=booking_id, host=request.user)

    # Ambil KYC Dokumen milik Klien
    client_kyc = (
        KYCDocument.objects.filter(
            user=booking.user, status=KYCDocument.Status.APPROVED
        )
        .order_by("-submitted_at")
        .first()
    )

    # Hitung Umur
    client_age = None
    if client_kyc and client_kyc.birth_date:
        today = date.today()
        bday = client_kyc.birth_date
        client_age = (
            today.year - bday.year - ((today.month, today.day) < (bday.month, bday.day))
        )

    # Mutual Rating Data (Host melihat rating Klien)
    client_avg_rating = booking.user.get_avg_rating_as_user()
    has_accepted_booking = HostBooking.objects.filter(
        host=request.user,
        status__in=[HostBooking.Status.CONFIRMED, HostBooking.Status.COMPLETED],
    ).exists()

    return render(
        request,
        "booking/host_booking_detail.html",
        {
            "booking": booking,
            "client_kyc": client_kyc,
            "client_age": client_age,
            "client_avg_rating": client_avg_rating,
            "has_accepted_booking": has_accepted_booking,
        },
    )


@login_required
def host_booking_action_view(request, booking_id):
    """
    View untuk tombol Terima / Tolak Pesanan.
    """
    from .models import HostBooking
    from apps.notifications.models import Notification

    if request.method == "POST":
        booking = get_object_or_404(HostBooking, id=booking_id, host=request.user)
        action = request.POST.get("action")

        if action == "accept" and booking.status == HostBooking.Status.PENDING:
            meeting_location = request.POST.get("meeting_location", "").strip()

            booking.status = HostBooking.Status.CONFIRMED
            booking.meeting_location = meeting_location

            if meeting_location:
                from django.utils import timezone

                booking.location_shared_at = timezone.now()

            booking.save()  # ini otomatis menghitung validation_fee 5% karena save() diubah
            messages.success(
                request, f"Anda MENERIMA pesanan dari {booking.user.username}."
            )

            # Notif ke Klien
            Notification.objects.create(
                user=booking.user,
                type=Notification.NotificationType.BOOKING_CONFIRMED,
                title="Booking Diterima!",
                body=f"{request.user.username} telah MENERIMA pesanan privat Anda.",
            )

        elif action == "reject" and booking.status == HostBooking.Status.PENDING:
            booking.status = HostBooking.Status.CANCELLED
            booking.save()

            # Refund 100% Klien (No Escrow Resolution fix)
            client = booking.user
            from apps.payments.models import WalletTransaction
            from django.db import transaction

            with transaction.atomic():
                if booking.currency == "IDR":
                    client.balance_idr += booking.total_cost
                elif booking.currency == "USD":
                    client.balance_usd += booking.total_cost
                elif booking.currency == "SGD":
                    client.balance_sgd += booking.total_cost
                client.save()

                WalletTransaction.objects.create(
                    user=client,
                    transaction_type=WalletTransaction.TransactionType.REFUND,
                    amount=booking.total_cost,
                    currency=booking.currency,
                    status=WalletTransaction.Status.COMPLETED,
                    reference_id=str(booking.id),
                    notes=f"Refund 100%: Pesanan ditolak oleh Host @{booking.host.username}",
                )

            messages.warning(
                request,
                f"Anda MENOLAK pesanan dari {booking.user.username}. Dana Escrow telah dikembalikan.",
            )

            # Notif ke Klien
            Notification.objects.create(
                user=booking.user,
                type=Notification.NotificationType.BOOKING_CANCELLED,
                title="Booking Ditolak",
                body=f"Mohon maaf, {request.user.username} MENOLAK pesanan privat Anda. Dana telah dikembalikan ke dompet Anda.",
            )

    return redirect("booking:host_booking_detail", booking_id=booking_id)


@login_required
@require_GET
def token_api(request):
    """
    Generate JWT access token untuk koneksi WebSocket.
    Token ini akan dikirim ke Go chat-service saat connect.
    Dilindungi session auth — hanya user yang login bisa mendapatkan token.
    """
    user = request.user
    token = AccessToken.for_user(user)

    # Tambahkan custom claims yang diperlukan Go service
    token["username"] = user.username
    token["email"] = user.email

    return JsonResponse(
        {
            "access_token": str(token),
            "user_id": str(user.id),
            "username": user.username,
        }
    )


@login_required
def private_call_view(request, booking_id):
    """
    View untuk 1-on-1 WebRTC Private Call.
    Hanya bisa diakses oleh Host atau Client dari booking yang sudah CONFIRMED.
    """
    from .models import HostBooking
    from django.db.models import Q

    booking = get_object_or_404(
        HostBooking, Q(id=booking_id) & (Q(host=request.user) | Q(user=request.user))
    )

    if booking.status != HostBooking.Status.CONFIRMED:
        messages.error(
            request,
            "Sesi private call hanya bisa dimulai setelah booking dikonfirmasi.",
        )
        return redirect("booking:dashboard")

    is_host = request.user == booking.host

    return render(
        request, "booking/private_call.html", {"booking": booking, "is_host": is_host}
    )


@login_required
@require_POST
def host_booking_noshow_view(request, booking_id):
    """
    Host membatalkan pesanan karena Klien tidak datang (No-Show).
    """
    from .models import HostBooking
    from apps.payments.models import WalletTransaction
    from django.db import transaction
    from decimal import Decimal

    booking = get_object_or_404(HostBooking, id=booking_id, host=request.user)

    if booking.status != HostBooking.Status.CONFIRMED:
        messages.error(request, "Pesanan tidak dapat dibatalkan.")
        return redirect("booking:host_booking_detail", booking_id=booking_id)

    with transaction.atomic():
        booking.is_no_show_cancelled = True
        booking.status = HostBooking.Status.CANCELLED
        booking.save()  # ini akan memicu kalkulasi fee baru (25% refund, 65% host)

        # Eksekusi Refund 25% ke Klien
        refund_amount = booking.total_cost * Decimal("0.25")
        client = booking.user
        if booking.currency == "IDR":
            client.balance_idr += refund_amount
        elif booking.currency == "USD":
            client.balance_usd += refund_amount
        elif booking.currency == "SGD":
            client.balance_sgd += refund_amount
        client.save()

        WalletTransaction.objects.create(
            user=client,
            transaction_type=WalletTransaction.TransactionType.REFUND,
            amount=refund_amount,
            currency=booking.currency,
            status=WalletTransaction.Status.COMPLETED,
            reference_id=str(booking.id),
            notes="Refund 25% karena No-Show",
        )

        # Payout 65% ke Host (disimpan di wallet Host)
        host = booking.host
        if booking.currency == "IDR":
            host.balance_idr += booking.net_payout
        elif booking.currency == "USD":
            host.balance_usd += booking.net_payout
        elif booking.currency == "SGD":
            host.balance_sgd += booking.net_payout
        host.save()

        WalletTransaction.objects.create(
            user=host,
            transaction_type=WalletTransaction.TransactionType.EARNING,
            amount=booking.net_payout,
            currency=booking.currency,
            status=WalletTransaction.Status.COMPLETED,
            reference_id=str(booking.id),
            notes="Earning 65% karena Klien No-Show",
        )

    messages.success(
        request,
        "Pemesanan dibatalkan karena Klien tidak hadir. Dana kompensasi telah masuk ke dompet Anda.",
    )
    return redirect("booking:host_bookings_list")


@login_required
@require_POST
def client_complete_booking_view(request, booking_id):
    """
    Klien menyelesaikan pemesanan (Escrow dicairkan ke Host).
    """
    from .models import HostBooking
    from apps.payments.models import WalletTransaction
    from django.db import transaction

    booking = get_object_or_404(HostBooking, id=booking_id, user=request.user)
    if booking.status != HostBooking.Status.CONFIRMED:
        messages.error(
            request, "Hanya pesanan yang sudah dikonfirmasi yang bisa diselesaikan."
        )
        return redirect("booking:my_bookings")

    with transaction.atomic():
        booking.status = HostBooking.Status.COMPLETED
        booking.save()

        # Payout Escrow ke Host
        host = booking.host
        if booking.currency == "IDR":
            host.balance_idr += booking.net_payout
        elif booking.currency == "USD":
            host.balance_usd += booking.net_payout
        elif booking.currency == "SGD":
            host.balance_sgd += booking.net_payout
        host.save()

        WalletTransaction.objects.create(
            user=host,
            transaction_type=WalletTransaction.TransactionType.EARNING,
            amount=booking.net_payout,
            currency=booking.currency,
            status=WalletTransaction.Status.COMPLETED,
            reference_id=str(booking.id),
            notes=f"Earning dari penyelesaian Booking Klien @{booking.user.username}",
        )

    messages.success(request, "Pemesanan telah diselesaikan. Dana diteruskan ke Host.")
    return redirect("booking:my_bookings")


@login_required
@require_POST
def client_cancel_booking_view(request, booking_id):
    """
    Klien membatalkan pemesanan.
    - >= 24 jam sebelum: Refund 100%
    - < 24 jam sebelum: Refund 50%, Payout 50% ke Host
    """
    from .models import HostBooking
    from apps.payments.models import WalletTransaction
    from django.db import transaction
    from django.utils import timezone
    from decimal import Decimal

    booking = get_object_or_404(HostBooking, id=booking_id, user=request.user)
    if booking.status not in [HostBooking.Status.PENDING, HostBooking.Status.CONFIRMED]:
        messages.error(request, "Pesanan tidak dapat dibatalkan.")
        return redirect("booking:my_bookings")

    time_until_start = booking.start_datetime - timezone.now()

    with transaction.atomic():
        booking.status = HostBooking.Status.CANCELLED
        booking.save()

        client = booking.user
        host = booking.host

        if (
            booking.status == HostBooking.Status.PENDING
            or time_until_start.total_seconds() >= 86400
        ):
            # Belum dikonfirmasi atau dibatalkan >= 24 jam: 100% Refund
            refund_amount = booking.total_cost
            if booking.currency == "IDR":
                client.balance_idr += refund_amount
            elif booking.currency == "USD":
                client.balance_usd += refund_amount
            elif booking.currency == "SGD":
                client.balance_sgd += refund_amount
            client.save()

            WalletTransaction.objects.create(
                user=client,
                transaction_type=WalletTransaction.TransactionType.REFUND,
                amount=refund_amount,
                currency=booking.currency,
                status=WalletTransaction.Status.COMPLETED,
                reference_id=str(booking.id),
                notes="Refund 100% pembatalan pesanan (Lebih dari 24 Jam).",
            )
            messages.success(request, "Pemesanan dibatalkan. Refund 100% telah masuk.")
        else:
            # Dibatalkan < 24 Jam: 50% Refund, 50% Payout
            refund_amount = booking.total_cost * Decimal("0.50")
            host_compensation = booking.net_payout * Decimal("0.50")

            if booking.currency == "IDR":
                client.balance_idr += refund_amount
                host.balance_idr += host_compensation
            elif booking.currency == "USD":
                client.balance_usd += refund_amount
                host.balance_usd += host_compensation
            elif booking.currency == "SGD":
                client.balance_sgd += refund_amount
                host.balance_sgd += host_compensation

            client.save()
            host.save()

            WalletTransaction.objects.create(
                user=client,
                transaction_type=WalletTransaction.TransactionType.REFUND,
                amount=refund_amount,
                currency=booking.currency,
                status=WalletTransaction.Status.COMPLETED,
                reference_id=str(booking.id),
                notes="Refund 50% pembatalan pesanan (Kurang dari 24 Jam).",
            )
            WalletTransaction.objects.create(
                user=host,
                transaction_type=WalletTransaction.TransactionType.EARNING,
                amount=host_compensation,
                currency=booking.currency,
                status=WalletTransaction.Status.COMPLETED,
                reference_id=str(booking.id),
                notes=f"Kompensasi 50% atas pembatalan mendadak oleh Klien @{client.username}",
            )
            messages.warning(
                request,
                "Pemesanan dibatalkan kurang dari 24 jam. Penalti 50% diberlakukan.",
            )

    return redirect("booking:my_bookings")


@login_required
@require_POST
def client_raise_dispute_view(request, booking_id):
    """
    Mengajukan sengketa untuk membekukan escrow jika ada masalah.
    """
    from .models import HostBooking, HostBookingDispute

    booking = get_object_or_404(HostBooking, id=booking_id)
    if request.user not in [booking.user, booking.host]:
        messages.error(request, "Anda tidak memiliki akses.")
        return redirect("booking:dashboard")

    reason = request.POST.get("reason", "").strip()
    evidence_url = request.POST.get("evidence_url", "").strip()

    if not reason:
        messages.error(request, "Alasan sengketa wajib diisi.")
        return redirect(
            "booking:my_bookings"
            if request.user == booking.user
            else "booking:host_bookings_list"
        )

    if booking.status in [HostBooking.Status.COMPLETED, HostBooking.Status.CANCELLED]:
        messages.error(
            request,
            "Pemesanan yang sudah selesai/dibatalkan tidak dapat disengketakan.",
        )
        return redirect(
            "booking:my_bookings"
            if request.user == booking.user
            else "booking:host_bookings_list"
        )

    booking.status = HostBooking.Status.DISPUTED
    booking.save()

    HostBookingDispute.objects.create(
        booking=booking,
        raised_by=request.user,
        reason=reason,
        evidence_url=evidence_url,
    )

    messages.success(
        request,
        "Sengketa telah didaftarkan. Dana Escrow dibekukan hingga ada keputusan admin.",
    )
    return redirect(
        "booking:my_bookings"
        if request.user == booking.user
        else "booking:host_bookings_list"
    )


@login_required
@require_POST
def client_report_fake_location_view(request, booking_id):
    """
    Klien melaporkan bahwa lokasi yang diberikan Host palsu.
    Memicu sistem penalti otomatis.
    """
    from .models import HostBooking
    from apps.payments.models import Payout
    from django.utils import timezone
    from datetime import timedelta
    from django.db import transaction
    from decimal import Decimal

    booking = get_object_or_404(HostBooking, id=booking_id, user=request.user)
    host = booking.host

    if not booking.meeting_location:
        messages.error(request, "Host belum membagikan lokasi offline.")
        return redirect("booking:my_bookings")

    with transaction.atomic():
        host.fake_location_strikes += 1

        if host.fake_location_strikes == 1:
            # First strike: Ban 127 days
            host.booking_banned_until = timezone.now() + timedelta(days=127)
            messages.success(
                request,
                f"Laporan diterima. Host @{host.username} telah dikenakan penalti larangan booking selama 127 hari.",
            )

        elif host.fake_location_strikes >= 2:
            # Second strike: Permanent ban and 20% auto-withdraw
            host.is_active = False  # Banned
            host.booking_banned_until = timezone.now() + timedelta(
                days=3650
            )  # 10 years

            # Tarik otomatis 20% saldo IDR ke bank terdaftar, hanguskan 80%
            withdraw_amount = host.balance_idr * Decimal("0.20")
            if withdraw_amount > 0:
                Payout.objects.create(
                    creator=host,
                    amount=withdraw_amount,
                    currency="IDR",
                    method=Payout.Method.BANK_TRANSFER,
                    status=Payout.Status.PENDING,
                    bank_details={"note": "Auto-withdraw (20%) due to permanent ban"},
                )
            # Kosongkan saldo
            host.balance_idr = Decimal("0.00")
            host.balance_usd = Decimal("0.00")
            host.balance_sgd = Decimal("0.00")

            messages.success(
                request,
                f"Laporan diterima. Host @{host.username} telah melakukan pelanggaran ke-2 dan akunnya diblokir permanen.",
            )

        host.save()

    return redirect("booking:my_bookings")


@login_required
@require_POST
def submit_rating_view(request, booking_id):
    """
    Kirim rating untuk pesanan. (User menilai Host atau sebaliknya).
    Hanya bisa dilakukan jika status pesanan COMPLETED.
    """
    from .models import HostBooking, BookingRating

    booking = get_object_or_404(HostBooking, id=booking_id)

    if booking.status != HostBooking.Status.COMPLETED:
        messages.error(
            request,
            "Rating hanya dapat diberikan setelah pesanan berstatus Selesai (COMPLETED).",
        )
        # redirect back to previous page
        return redirect(request.META.get("HTTP_REFERER", "core_ui:index"))

    # Validasi Hak Akses
    is_client = request.user == booking.user
    is_host = request.user == booking.host

    if not (is_client or is_host):
        messages.error(request, "Anda tidak memiliki akses ke pesanan ini.")
        return redirect("core_ui:index")

    rating_val = request.POST.get("rating")
    try:
        rating_val = int(rating_val)
        if rating_val < 1 or rating_val > 5:
            raise ValueError
    except (TypeError, ValueError):
        messages.error(request, "Nilai rating tidak valid. Harus antara 1 hingga 5.")
        return redirect(request.META.get("HTTP_REFERER", "core_ui:index"))

    # Get or Create BookingRating
    rating_obj, created = BookingRating.objects.get_or_create(booking=booking)

    if is_client:
        if rating_obj.user_rating_of_host is not None:
            messages.warning(request, "Anda sudah memberikan rating untuk Host ini.")
        else:
            rating_obj.user_rating_of_host = rating_val
            rating_obj.save()
            messages.success(
                request, "Rating berhasil dikirim! Terima kasih atas partisipasi Anda."
            )
    elif is_host:
        if rating_obj.host_rating_of_user is not None:
            messages.warning(request, "Anda sudah memberikan rating untuk Klien ini.")
        else:
            rating_obj.host_rating_of_user = rating_val
            rating_obj.save()
            messages.success(request, "Rating berhasil dikirim ke Klien secara anonim.")

    return redirect(request.META.get("HTTP_REFERER", "core_ui:index"))


@login_required
@require_POST
def client_cancel_host_booking_view(request, booking_id):
    """
    Klien membatalkan pesanan yang sudah CONFIRMED (gagal sepakat).
    Distribusi: 85% User, 10% Host, 5% Admin.
    """
    from .models import HostBooking
    from django.db import transaction
    from decimal import Decimal

    booking = get_object_or_404(HostBooking, id=booking_id, user=request.user)

    if booking.status != HostBooking.Status.CONFIRMED:
        messages.error(
            request,
            "Hanya pesanan berstatus CONFIRMED yang dapat dibatalkan dengan skema ini.",
        )
        return redirect("booking:my_bookings")

    price = booking.total_cost
    user_refund = price * Decimal("0.85")
    host_earning = price * Decimal("0.10")
    admin_fee = price * Decimal("0.05")

    with transaction.atomic():
        booking.status = HostBooking.Status.CANCELLED
        booking.save()  # Note: HostBooking.save() might do refund if we programmed it before.
        # Wait, if we programmed HostBooking.save() to do refunds, we need to bypass it or handle it here.
        # Let's check HostBooking.save() logic.
        # I should just update the balances directly and add wallet transactions.
        # Actually, in the previous session, we handled cancellations differently?
        # I will update the user balances here directly and create transactions.

        user = booking.user
        host = booking.host

        # User gets 85% back
        user.balance_idr += user_refund
        user.save()

        # Host gets 10%
        host.balance_idr += host_earning
        host.save()

        # Create Ledger
        from apps.payments.models import WalletTransaction

        WalletTransaction.objects.create(
            user=user,
            transaction_type=WalletTransaction.TransactionType.REFUND,
            amount=user_refund,
            currency="IDR",
            status=WalletTransaction.Status.COMPLETED,
            notes=f"Refund Batal (85%) untuk Booking {booking.id}",
        )
        WalletTransaction.objects.create(
            user=host,
            transaction_type=WalletTransaction.TransactionType.EARNING,
            amount=host_earning,
            currency="IDR",
            status=WalletTransaction.Status.COMPLETED,
            notes=f"Kompensasi Batal (10%) dari Booking {booking.id}",
        )

    messages.success(
        request,
        f"Pesanan dibatalkan. Dana sebesar 85% (IDR {user_refund}) telah dikembalikan ke dompet Anda.",
    )
    return redirect("booking:my_bookings")


@login_required
@require_POST
def client_reschedule_host_booking_view(request, booking_id):
    """
    Klien mengubah jadwal pesanan.
    Dikenakan biaya tambahan 1.56% dari total harga. (1.16% untuk host, 0.4% admin).
    """
    from .models import HostBooking
    from django.db import transaction
    from decimal import Decimal
    from datetime import datetime
    from django.utils.timezone import make_aware

    booking = get_object_or_404(HostBooking, id=booking_id, user=request.user)

    if booking.status not in [HostBooking.Status.PENDING, HostBooking.Status.CONFIRMED]:
        messages.error(request, "Pesanan tidak dapat di-reschedule.")
        return redirect("booking:my_bookings")

    if booking.reschedule_count >= 2:
        messages.error(
            request,
            "Batas maksimal Ubah Jadwal (2 kali) telah tercapai untuk pesanan ini.",
        )
        return redirect("booking:my_bookings")

    new_date = request.POST.get("new_date")
    new_time = request.POST.get("new_time")

    if not new_date or not new_time:
        messages.error(request, "Tanggal dan waktu baru harus diisi.")
        return redirect("booking:my_bookings")

    try:
        new_datetime_str = f"{new_date} {new_time}"
        new_start_datetime = make_aware(
            datetime.strptime(new_datetime_str, "%Y-%m-%d %H:%M")
        )
    except ValueError:
        messages.error(request, "Format tanggal/waktu tidak valid.")
        return redirect("booking:my_bookings")

    price = booking.total_cost

    # Cek Elite Fan (Subscription aktif)
    from apps.subscriptions.models import Subscription

    is_elite = Subscription.objects.filter(
        subscriber=request.user, tier__creator=booking.host, status="active"
    ).exists()

    if is_elite:
        reschedule_fee = Decimal("0.00")
        host_share = Decimal("0.00")
    else:
        reschedule_fee = price * Decimal("0.0156")  # 1.56%
        host_share = price * Decimal("0.0116")  # 1.16%

    with transaction.atomic():
        if reschedule_fee > 0 and request.user.balance_idr < reschedule_fee:
            messages.error(
                request,
                f"Saldo IDR tidak cukup untuk biaya Reschedule sebesar IDR {reschedule_fee}.",
            )
            return redirect("booking:my_bookings")

        if reschedule_fee > 0:
            request.user.balance_idr -= reschedule_fee
            request.user.save()

            booking.host.balance_idr += host_share
            booking.host.save()

            from apps.payments.models import WalletTransaction

            WalletTransaction.objects.create(
                user=request.user,
                transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
                amount=reschedule_fee,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes=f"Biaya Reschedule (1.56%) Booking {booking.id}",
            )

            # Hanya log pendapatan Host jika ada potongan
            if host_share > 0:
                WalletTransaction.objects.create(
                    user=booking.host,
                    transaction_type=WalletTransaction.TransactionType.EARNING,
                    amount=host_share,
                    currency="IDR",
                    status=WalletTransaction.Status.COMPLETED,
                    notes=f"Kompensasi Reschedule dari Booking {booking.id}",
                )

        # Update Jadwal & Count
        booking.start_datetime = new_start_datetime
        booking.reschedule_count += 1
        booking.save()

    msg = "Jadwal berhasil diubah."
    if is_elite:
        msg = "Jadwal berhasil diubah (GRATIS karena Anda adalah Klien Elite 👑)."
    else:
        msg += f" Biaya reschedule IDR {reschedule_fee} telah dipotong."

    messages.success(request, msg)
    return redirect("booking:my_bookings")
