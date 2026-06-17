from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.contrib.postgres.search import SearchVector
from django_ratelimit.decorators import ratelimit
from apps.accounts.models import CreatorProfile, User
from apps.subscriptions.models import Subscription, SubscriptionTier
from apps.family.models import FamilyGroup, FamilyMember

def index_view(request):
    """
    Rute utama (Root URL).
    Jika user sudah login -> render Beranda (Feed).
    Jika guest (belum login) -> render Landing Page premium.
    """
    if request.user.is_authenticated:
        return render(request, "core/feed.html")
    else:
        return render(request, "core/landing.html")

@login_required
def become_host_view(request):
    """View untuk mendaftar menjadi Host/Creator"""
    from apps.accounts.models import KYCDocument
    from apps.accounts.services.kyc_ai import verify_kyc_with_groq  # type: ignore
    
    error_message = None

    if request.method == "POST":
        # 1. Validasi Gender (Hanya Perempuan)
        if request.user.gender != User.Gender.FEMALE:
            error_message = "Pendaftaran Ditolak: Hanya pengguna berjenis kelamin Perempuan yang diizinkan menjadi Host."
            return render(request, "core/become_host.html", {"error_message": error_message})

        display_name = request.POST.get("display_name")
        category = request.POST.get("category", "other")
        document_number = request.POST.get("document_number", "")
        full_name = request.POST.get("full_name", "")
        birth_date = request.POST.get("birth_date", "")
        kyc_file = request.FILES.get("kyc_document")
        selfie_file = request.FILES.get("selfie_file")
        portfolio_photos = request.FILES.getlist("portfolio_photos")
        
        if len(portfolio_photos) < 3:
            error_message = "Anda diwajibkan mengunggah minimal 3 foto portfolio bebas untuk verifikasi profil."
            return render(request, "core/become_host.html", {"error_message": error_message})
            
        if display_name and kyc_file and selfie_file and document_number and full_name and birth_date:
            # Upgrade user role (tapi profile is_approved = False menunggu KYC)
            request.user.role = User.Role.HOST
            request.user.save()
            
            profile, _ = CreatorProfile.objects.get_or_create(
                user=request.user,
                defaults={"display_name": display_name, "category": category, "is_approved": False}
            )
            
            # Save 3 portfolio photos
            from apps.accounts.models import CreatorPhoto
            for photo_file in portfolio_photos:
                CreatorPhoto.objects.create(profile=profile, image=photo_file)
                
            # Create 4 default subscription tiers for the host
            for i in range(1, 5):
                SubscriptionTier.objects.get_or_create(
                    creator=request.user,
                    name=f"Tier {i}",
                    defaults={
                        "price": 0.00 if i == 1 else i * 10.00,
                        "description": f"Keuntungan langganan tingkat {i}.",
                        "sort_order": i
                    }
                )
            
            # 2. Upload KYC Document
            kyc_doc = KYCDocument.objects.create(
                user=request.user,
                full_name=full_name,
                birth_date=birth_date,
                document_type=KYCDocument.DocumentType.ID_CARD,
                document_number=document_number,
                document_file=kyc_file,
                selfie_file=selfie_file,
                status=KYCDocument.Status.PENDING
            )
            
            # 3. Kirim ke AI (Groq) untuk Verifikasi
            verify_kyc_with_groq(kyc_doc.id)
            
            return redirect("core_ui:index")
            
    return render(request, "core/become_host.html", {"error_message": error_message})

@login_required
def verify_kyc_view(request):
    """View untuk User Biasa (Klien) mengunggah KYC agar bisa mem-booking Host"""
    from apps.accounts.models import KYCDocument
    from apps.accounts.services.kyc_ai import verify_kyc_with_groq  # type: ignore

    # Jika sudah punya KYC yang approved atau pending
    existing_kyc = KYCDocument.objects.filter(user=request.user).order_by('-submitted_at').first()
    if existing_kyc and existing_kyc.status in [KYCDocument.Status.APPROVED, KYCDocument.Status.PENDING]:
        messages.info(request, f"Status KYC Anda saat ini: {existing_kyc.get_status_display()}")  # type: ignore
        return redirect("core_ui:index")

    if request.method == "POST":
        document_number = request.POST.get("document_number", "")
        full_name = request.POST.get("full_name", "")
        birth_date = request.POST.get("birth_date", "")
        kyc_file = request.FILES.get("kyc_document")
        selfie_file = request.FILES.get("selfie_file")
        
        if kyc_file and selfie_file and document_number and full_name and birth_date:
            kyc_doc = KYCDocument.objects.create(
                user=request.user,
                full_name=full_name,
                birth_date=birth_date,
                document_type=KYCDocument.DocumentType.ID_CARD,
                document_number=document_number,
                document_file=kyc_file,
                selfie_file=selfie_file,
                status=KYCDocument.Status.PENDING
            )
            # Kirim ke AI Groq
            verify_kyc_with_groq(kyc_doc.id)
            messages.success(request, "Dokumen KYC berhasil dikirim dan sedang diproses oleh AI kami!")
            
            # Kembali ke halaman sebelumnya jika ada parameter 'next'
            next_url = request.GET.get('next')
            if next_url:
                return redirect(next_url)
            return redirect("core_ui:index")

    return render(request, "core/verify_kyc.html")

@login_required
def edit_creator_profile_view(request):
    """View untuk mengedit profil Host/Creator"""
    if not request.user.is_creator:
        messages.error(request, "Hanya Host yang dapat mengedit profil kreator.")
        return redirect("core_ui:index")
        
    profile = request.user.creator_profile
    
    if request.method == "POST":
        profile.display_name = request.POST.get("display_name", profile.display_name)
        profile.category = request.POST.get("category", profile.category)
        profile.subscription_price = request.POST.get("subscription_price", profile.subscription_price)
        profile.website = request.POST.get("website", profile.website)
        profile.subscription_rules = request.POST.get("subscription_rules", profile.subscription_rules)
        
        commission_rate = request.POST.get("platform_commission_rate")
        if commission_rate:
            from decimal import Decimal
            try:
                rate = Decimal(commission_rate)
                if 20 <= rate <= 50:
                    profile.platform_commission_rate = rate
                else:
                    messages.warning(request, "Komisi platform harus antara 20% hingga 50%.")
            except:
                pass
        
        if "cover_image" in request.FILES:
            profile.cover_image = request.FILES["cover_image"]
            
        profile.save()
        messages.success(request, "Profil berhasil diperbarui!")
        return redirect("core_ui:creator_profile", username=request.user.username)
        
    from apps.accounts.models import CreatorProfile
    return render(request, "creator/profile_edit.html", {
        "profile": profile,
        "categories": CreatorProfile.Category.choices
    })

def creator_profile_view(request, username):
    """View untuk melihat profil kreator dan Subscribe"""
    creator_user = get_object_or_404(User, username=username, role=User.Role.HOST)
    profile = get_object_or_404(CreatorProfile, user=creator_user)
    tiers = SubscriptionTier.objects.filter(creator=creator_user, is_active=True).order_by('sort_order')
    is_subscribed = Subscription.objects.filter(subscriber=request.user, tier__creator=creator_user, status='active').exists()
    
    # Ambil galeri portfolio publik host
    from apps.accounts.models import CreatorPhoto
    portfolio_photos = CreatorPhoto.objects.filter(profile=profile)
    
    # Rating System (VIP/Premium)
    avg_rating = creator_user.get_avg_rating_as_host()
    has_rating_package = False
    if request.user.is_authenticated and hasattr(request.user, 'rating_access'):
        has_rating_package = request.user.rating_access.is_active
    
    if request.method == "POST" and "subscribe" in request.POST:
        tier_id = request.POST.get("tier_id")
        tier = get_object_or_404(SubscriptionTier, id=tier_id)
        
        # Subscribe
        Subscription.objects.create(
            subscriber=request.user,
            tier=tier,
            status='active'
        )
        return redirect("core_ui:creator_profile", username=username)

    return render(request, "creator/profile.html", {
        "creator": creator_user,
        "profile": profile,
        "tiers": tiers,
        "is_subscribed": is_subscribed,
        "portfolio_photos": portfolio_photos,
        "avg_rating": avg_rating,
        "has_rating_package": has_rating_package
    })

@login_required
def manage_subscription_tiers_view(request):
    """
    Halaman bagi Host untuk mengatur 4 Slot Paket Berlangganan mereka.
    """
    if request.user.role != User.Role.HOST:
        messages.error(request, "Akses ditolak. Anda bukan Host.")
        return redirect("core_ui:index")
        
    profile = get_object_or_404(CreatorProfile, user=request.user)
        
    # Pastikan host memiliki 4 tiers
    tiers = list(SubscriptionTier.objects.filter(creator=request.user).order_by('sort_order', 'id'))
    while len(tiers) < 4:
        new_tier = SubscriptionTier.objects.create(
            creator=request.user,
            name=f"Tier {len(tiers) + 1}",
            price=0.00,
            sort_order=len(tiers) + 1
        )
        tiers.append(new_tier)
        
    if request.method == "POST":
        for index, tier in enumerate(tiers):
            tier_id_str = str(tier.id)
            name_key = f"name_{tier_id_str}"
            price_key = f"price_{tier_id_str}"
            desc_key = f"desc_{tier_id_str}"
            
            if name_key in request.POST:
                tier.name = request.POST.get(name_key)
                
                # Handling empty price safely
                price_val = request.POST.get(price_key)
                if price_val:
                    try:
                        tier.price = float(price_val)
                    except ValueError:
                        pass
                        
                tier.description = request.POST.get(desc_key, "")
                tier.save()
                
        # Simpan Subscription Rules
        if "subscription_rules" in request.POST:
            profile.subscription_rules = request.POST.get("subscription_rules")
            profile.save()
                
        messages.success(request, "Paket Langganan & Peraturan Anda berhasil diperbarui.")
        return redirect("core_ui:manage_tiers")
        
    return render(request, "core/manage_tiers.html", {
        "tiers": tiers,
        "profile": profile
    })

@login_required
def family_portal_view(request):
    """View untuk membuat dan memanage Family/Agency"""
    if request.method == "POST":
        action = request.POST.get("action")
        
        if action == "create":
            name = request.POST.get("name")
            description = request.POST.get("description", "")
            avatar = request.FILES.get("avatar")
            
            # Moderasi Konten Otomatis
            from apps.moderation.services import ContentModerationService
            from django.core.exceptions import ValidationError
            
            try:
                # Cek teks name dan description
                ContentModerationService.check_content(name)
                ContentModerationService.check_content(description)
                # Cek avatar secara sistemik
                if avatar:
                    ContentModerationService.check_content(avatar.name, image_file=avatar)
            except ValidationError as e:
                messages.error(request, str(e.message))
                return redirect("core_ui:family_portal")
            
            # Validasi Harga & Syarat
            from apps.subscriptions.models import Subscription
            from apps.payments.models import WalletTransaction
            from decimal import Decimal
            
            price_idr = Decimal("9999.00") if request.user.is_creator else Decimal("495999.00")
            
            if not request.user.is_creator:
                # Wajib pernah berlangganan host min 2x
                sub_count = Subscription.objects.filter(subscriber=request.user).count()
                if sub_count < 2:
                    messages.error(request, "Anda harus pernah berlangganan Host minimal 2 kali untuk membuat Family.")
                    return redirect("core_ui:family_portal")
            
            if request.user.balance_idr < price_idr:
                messages.error(request, f"Saldo IDR tidak cukup. Pembuatan Family membutuhkan {price_idr} IDR.")
                return redirect("core_ui:family_portal")
                
            # Potong Saldo
            request.user.balance_idr -= price_idr
            request.user.save()
            
            # Catat Transaksi
            WalletTransaction.objects.create(
                user=request.user,
                transaction_type=WalletTransaction.TransactionType.FEE_DEDUCTION,
                amount=price_idr,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes=f"Biaya Pembuatan Family: {name}"
            )
            
            from apps.family.models import FamilyGroup, FamilyMember
            family = FamilyGroup.objects.create(name=name, description=description, owner=request.user)
            
            if avatar:
                family.avatar = avatar
                family.save()
                
            FamilyMember.objects.create(family=family, user=request.user, role=FamilyMember.Role.OWNER)
            messages.success(request, f"Family {name} berhasil dibuat! (Biaya: {price_idr} IDR)")
            return redirect("core_ui:family_detail", family_id=family.id)
            
        elif action == "join":
            invite_code = request.POST.get("invite_code")
            from apps.family.models import FamilyGroup, FamilyMember
            try:
                family = FamilyGroup.objects.get(invite_code=invite_code)
                # Check if already joined
                if FamilyMember.objects.filter(family=family, user=request.user).exists():
                    messages.warning(request, "Anda sudah menjadi anggota Family ini.")
                else:
                    FamilyMember.objects.create(family=family, user=request.user, role=FamilyMember.Role.MEMBER)
                    family.member_count = FamilyMember.objects.filter(family=family).count()
                    family.save()
                    messages.success(request, f"Berhasil bergabung ke {family.name}!")
            except FamilyGroup.DoesNotExist:
                messages.error(request, "Kode undangan tidak valid.")
            return redirect("core_ui:family_portal")

    from apps.family.models import FamilyGroup
    my_families = FamilyGroup.objects.filter(members__user=request.user).distinct()
    return render(request, "core/family_portal.html", {"families": my_families})

@login_required
def family_detail_view(request, family_id):
    """Menampilkan detail, anggota, dan stream dari Family"""
    from apps.family.models import FamilyGroup, FamilyMember
    from apps.streaming_ui.models import LiveStream
    
    family = get_object_or_404(FamilyGroup, id=family_id)
    
    # Check membership
    membership = FamilyMember.objects.filter(family=family, user=request.user).first()
    if not membership and request.user.role not in [request.user.Role.ADMIN, request.user.Role.SUPERADMIN]:
        messages.error(request, "Anda bukan anggota Family ini.")
        return redirect("core_ui:family_portal")
        
    members = FamilyMember.objects.filter(family=family).select_related("user")
    exclusive_streams = LiveStream.objects.filter(
        family_group=family, 
        is_family_only=True
    ).order_by("-scheduled_time")
    
    return render(request, "core/family_detail.html", {
        "family": family,
        "membership": membership,
        "members": members,
        "exclusive_streams": exclusive_streams
    })

def about_view(request):
    return render(request, "core/about.html")

@login_required
def user_wallet_view(request):
    """
    Dasbor Finansial / Dompet Universal untuk Semua User.
    Menampilkan Saldo 3 Mata Uang dan Riwayat Transaksi.
    """
    from apps.payments.models import WalletTransaction
    
    # Ambil 20 transaksi terakhir milik user ini
    transactions = WalletTransaction.objects.filter(user=request.user).order_by("-created_at")[:20]
    
    return render(request, "wallet/detail.html", {
        "user": request.user,
        "transactions": transactions
    })

@login_required
@require_POST
def user_wallet_convert_view(request):
    """
    Sistem Auto-Convert Wallet: Mengonversi semua mata uang asing ke IDR.
    Mengambil spread profit 1.5% untuk platform.
    """
    if request.user.role != 'host':
        messages.error(request, "Fitur konversi ini khusus untuk Host.")
        return redirect("core_ui:user_wallet")
        
    user = request.user
    from decimal import Decimal
    from apps.payments.models import WalletTransaction
    from apps.payments.services import ExchangeRateService
    from django.db import transaction
    
    total_converted_idr = Decimal("0.00")
    conversions = []
    
    with transaction.atomic():
        # Lock user for update to prevent race conditions
        from apps.accounts.models import User
        user = User.objects.select_for_update().get(id=request.user.id)
        
        # Calculate for each currency
        if user.balance_usd > 0:
            rate = ExchangeRateService.get_rate("USD", "IDR", apply_spread=True)
            val = user.balance_usd * rate
            total_converted_idr += val
            conversions.append(f"USD {user.balance_usd} -> IDR {val:,.2f} (Rate: {rate:,.2f})")
            user.balance_usd = Decimal("0.00")
            
        if user.balance_sgd > 0:
            rate = ExchangeRateService.get_rate("SGD", "IDR", apply_spread=True)
            val = user.balance_sgd * rate
            total_converted_idr += val
            conversions.append(f"SGD {user.balance_sgd} -> IDR {val:,.2f} (Rate: {rate:,.2f})")
            user.balance_sgd = Decimal("0.00")
            
        if user.balance_myr > 0:
            rate = ExchangeRateService.get_rate("MYR", "IDR", apply_spread=True)
            val = user.balance_myr * rate
            total_converted_idr += val
            conversions.append(f"MYR {user.balance_myr} -> IDR {val:,.2f} (Rate: {rate:,.2f})")
            user.balance_myr = Decimal("0.00")
            
        if user.balance_cny > 0:
            rate = ExchangeRateService.get_rate("CNY", "IDR", apply_spread=True)
            val = user.balance_cny * rate
            total_converted_idr += val
            conversions.append(f"CNY {user.balance_cny} -> IDR {val:,.2f} (Rate: {rate:,.2f})")
            user.balance_cny = Decimal("0.00")
            
        if total_converted_idr > 0:
            user.balance_idr += total_converted_idr
            user.save()
            
            notes_str = ", ".join(conversions)
            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransaction.TransactionType.DEPOSIT,
                amount=total_converted_idr,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes=f"Auto-Convert: {notes_str}"
            )
            messages.success(request, f"Konversi berhasil! Total IDR yang ditambahkan: {total_converted_idr:,.2f}.")
        else:
            messages.warning(request, "Tidak ada saldo asing untuk dikonversi.")
            
    return redirect("core_ui:user_wallet")

@login_required
def user_wallet_action_view(request):
    """
    Memproses request Deposit dan Withdrawal dari Dasbor Dompet.
    """
    if request.method == "POST":
        action = request.POST.get("action")
        amount_str = request.POST.get("amount", "0")
        currency = request.POST.get("currency", "USD")
        
        try:
            from decimal import Decimal
            amount = Decimal(amount_str)
            if amount <= 0:
                raise ValueError("Jumlah harus lebih dari 0")
        except:
            messages.error(request, "Jumlah tidak valid.")
            return redirect("core_ui:user_wallet")
            
        user = request.user
        from apps.payments.models import WalletTransaction
        
        if action == "deposit":
            messages.error(request, "Deposit manual telah dinonaktifkan karena alasan keamanan. Silakan gunakan integrasi PayPal untuk Top-Up Saldo.")
            return redirect("core_ui:user_wallet")
            
        elif action == "withdraw":
            if not user.is_creator:
                messages.error(request, "Hanya Host/Creator yang diizinkan menarik dana.")
                return redirect("core_ui:user_wallet")
                
            # Cek saldo cukup
            sufficient = False
            if currency == "USD" and user.balance_usd >= amount:
                user.balance_usd -= amount
                sufficient = True
            elif currency == "SGD" and user.balance_sgd >= amount:
                user.balance_sgd -= amount
                sufficient = True
            elif currency == "IDR" and user.balance_idr >= amount:
                user.balance_idr -= amount
                sufficient = True
                
            if not sufficient:
                messages.error(request, f"Saldo {currency} Anda tidak mencukupi untuk penarikan ini.")
                return redirect("core_ui:user_wallet")
                
            user.save()
            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransaction.TransactionType.WITHDRAWAL,
                amount=amount,
                currency=currency,
                status=WalletTransaction.Status.PENDING,
                notes="Permintaan Penarikan (Menunggu verifikasi admin)"
            )
            messages.success(request, f"Permintaan penarikan {currency} {amount:,.2f} sedang diproses.")
            
    return redirect("core_ui:user_wallet")

@login_required
def admin_dashboard_view(request):
    """
    Dasbor Khusus Admin. Menampilkan statistik dan antrean withdrawal.
    """
    if request.user.role not in [User.Role.ADMIN, User.Role.SUPERADMIN]:
        messages.error(request, "Akses ditolak. Anda bukan Admin.")
        return redirect("core_ui:index")
        
    from apps.payments.models import WalletTransaction
    
    total_users = User.objects.count()
    total_hosts = User.objects.filter(role=User.Role.HOST).count()
    
    pending_withdrawals = WalletTransaction.objects.filter(
        transaction_type=WalletTransaction.TransactionType.WITHDRAWAL,
        status=WalletTransaction.Status.PENDING
    ).order_by("created_at")
    
    from apps.accounts.models import KYCDocument
    from apps.moderation.models import Report, AuditLog
    
    pending_kyc = KYCDocument.objects.filter(status=KYCDocument.Status.PENDING).order_by("submitted_at")
    active_users = User.objects.filter(is_active=True).count()
    recent_reports = Report.objects.all().order_by("-created_at")[:10]
    audit_logs = AuditLog.objects.all().order_by("-created_at")[:50]
    
    return render(request, "core/admin_dashboard.html", {
        "total_users": total_users,
        "total_hosts": total_hosts,
        "pending_kyc": pending_kyc,
        "active_users": active_users,
        "recent_reports": recent_reports,
        "pending_withdrawals": pending_withdrawals,
        "audit_logs": audit_logs,
    })

@login_required
@require_POST
def buy_rating_package_view(request):
    """
    User membeli paket rating VIP atau Premium.
    """
    from apps.subscriptions.models import PlatformRatingAccess
    from django.db import transaction
    from decimal import Decimal
    from django.views.decorators.http import require_POST
    from django.utils import timezone
    from datetime import timedelta
    
    package_type = request.POST.get("package_type") # "premium" or "vip"
    
    if package_type == "premium":
        price = Decimal("50000.00")
        days = 30
    elif package_type == "vip":
        price = Decimal("150000.00")
        days = 90
    else:
        messages.error(request, "Paket tidak valid.")
        return redirect(request.META.get('HTTP_REFERER', 'core_ui:index'))
        
    user = request.user
    
    with transaction.atomic():
        if user.balance_idr < price:
            messages.error(request, f"Saldo IDR tidak cukup. Harga paket: IDR {price}")
            return redirect('core_ui:user_wallet')
            
        # Potong saldo
        user.balance_idr -= price
        user.save()
        
        # Buat/Update Access
        access, created = PlatformRatingAccess.objects.get_or_create(user=user, defaults={
            'package_type': package_type,
            'expires_at': timezone.now() + timedelta(days=days)
        })
        
        if not created:
            # Perpanjang atau ganti paket
            access.package_type = package_type
            if access.expires_at > timezone.now():
                access.expires_at += timedelta(days=days)
            else:
                access.expires_at = timezone.now() + timedelta(days=days)
            access.save()
            
        # Catat Ledger
        from apps.payments.models import WalletTransaction
        WalletTransaction.objects.create(
            user=user,
            transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
            amount=price,
            currency="IDR",
            status=WalletTransaction.Status.COMPLETED,
            notes=f"Beli Paket Rating {package_type.upper()}"
        )
        
    messages.success(request, f"Berhasil membeli Paket Rating {package_type.upper()}!")
    return redirect(request.META.get('HTTP_REFERER', 'core_ui:index'))

@login_required
def admin_withdraw_action_view(request, tx_id):
    """
    Aksi Admin: Menyetujui atau menolak penarikan dana.
    """
    if request.user.role not in [User.Role.ADMIN, User.Role.SUPERADMIN]:
        messages.error(request, "Akses ditolak.")
        return redirect("core_ui:index")
        
    if request.method == "POST":
        action = request.POST.get("action")
        from apps.payments.models import WalletTransaction
        tx = get_object_or_404(WalletTransaction, id=tx_id, transaction_type=WalletTransaction.TransactionType.WITHDRAWAL, status=WalletTransaction.Status.PENDING)
        
        if action == "approve":
            tx.status = WalletTransaction.Status.COMPLETED
            tx.notes = "Penarikan Disetujui & Telah Ditransfer."
            tx.save()
            messages.success(request, f"Penarikan {tx.currency} {tx.amount} oleh {tx.user.username} disetujui.")
            
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=tx.user,
                type=Notification.NotificationType.PAYOUT_COMPLETED,
                title="Penarikan Disetujui",
                body=f"Permintaan penarikan {tx.currency} {tx.amount} Anda telah disetujui dan ditransfer."
            )
            
        elif action == "reject":
            # Kembalikan saldo
            tx.status = WalletTransaction.Status.FAILED
            tx.notes = "Penarikan Ditolak oleh Admin."
            tx.save()
            
            user = tx.user
            if tx.currency == "USD": user.balance_usd += tx.amount
            elif tx.currency == "SGD": user.balance_sgd += tx.amount
            elif tx.currency == "IDR": user.balance_idr += tx.amount
            user.save()
            
            messages.warning(request, f"Penarikan {tx.currency} {tx.amount} oleh {tx.user.username} ditolak. Saldo dikembalikan.")
            
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=tx.user,
                type=Notification.NotificationType.SYSTEM,
                title="Penarikan Ditolak",
                body=f"Permintaan penarikan {tx.currency} {tx.amount} ditolak. Saldo dikembalikan ke dompet Anda."
            )
            
    return redirect("core_ui:admin_dashboard")
def help_view(request):
    return render(request, "core/help.html")

def privacy_view(request):
    return render(request, "core/privacy.html")

def terms_view(request):
    return render(request, "core/terms.html")

@login_required
def chat_inbox_view(request):
    """
    Menampilkan daftar chat/inbox pengguna.
    Di MVP ini, kita akan me-render UI kosong,
    atau daftar Host yang disubscribe pengguna.
    """
    from apps.subscriptions.models import Subscription
    from apps.accounts.models import User
    from django.db.models import Q
    
    # Ambil daftar Host/Fan yang pernah berinteraksi dengan user ini
    if request.user.role == User.Role.HOST:
        # Jika Host, tampilkan Fan yang subscribe ATAU booking ke dia
        contacts = User.objects.filter(
            Q(host_bookings_made__host=request.user) | 
            Q(subscriptions__tier__creator=request.user)
        ).exclude(id=request.user.id).distinct()
    else:
        # Jika Fans, tampilkan host yang disubscribe ATAU di-booking
        contacts = User.objects.filter(
            Q(host_bookings_received__user=request.user) | 
            Q(subscription_tiers__subscriptions__subscriber=request.user)
        ).exclude(id=request.user.id).distinct()
        
    return render(request, "core/chat_inbox.html", {
        "contacts": contacts
    })

@login_required
def chat_detail_view(request, username):
    """
    Menampilkan UI Private Chat dengan pengguna tertentu (Host/Fans).
    Harus memvalidasi apakah ada Subscription yang aktif di antara keduanya.
    """
    from apps.accounts.models import User
    from apps.subscriptions.models import Subscription
    
    other_user = get_object_or_404(User, username=username)
    
    # Validasi Subscription
    has_access = False
    if request.user.role == User.Role.HOST:
        has_access = Subscription.objects.filter(creator=request.user, subscriber=other_user, is_active=True).exists()
    else:
        has_access = Subscription.objects.filter(creator=other_user, subscriber=request.user, is_active=True).exists()
        
    # Jika sesama Host atau tidak berlangganan, tolak. (Opsional: sesama Host bisa chat jika mereka berteman di Family)
    # Untuk MVP, pastikan ada subscription
    if not has_access:
        messages.error(request, f"Anda harus berlangganan (Subscribe) ke {other_user.username} untuk mengirim pesan pribadi.")
        return redirect("core_ui:creator_profile", username=username)
        
    # Generate JWT Token untuk WebSocket Go
    from rest_framework_simplejwt.tokens import AccessToken
    token = AccessToken.for_user(request.user)
    
    # Room ID: Buat unique string dari dua ID (diurutkan agar konsisten)
    # Go Chat Service menerima ID apa saja, tapi standar UUID lebih baik.
    # Namun chat-service /api/v1/rooms menangani pembuatan ruangan.
    # Kita serahkan ke frontend untuk membuat room via REST API Go atau mengirimnya.
    
    return render(request, "core/chat_detail.html", {
        "other_user": other_user,
        "chat_token": str(token),
    })

@login_required
def user_topup_view(request):
    """
    Menampilkan halaman form Top-Up Dompet.
    Mendukung integrasi langsung ke Gateway PayPal.
    """
    from django.conf import settings
    return render(request, "wallet/topup.html", {
        "paypal_client_id": getattr(settings, "PAYPAL_CLIENT_ID", "test")
    })

@login_required
def user_topup_action_view(request):
    """
    Memproses Top-Up untuk metode non-PayPal (seperti Transfer Bank/E-Wallet).
    Mencatat transaksi berstatus Pending hingga dikonfirmasi admin.
    """
    if request.method == "POST":
        amount_str = request.POST.get("amount", "0")
        currency = request.POST.get("currency", "USD")
        method = request.POST.get("method", "Transfer Bank")
        
        try:
            from decimal import Decimal
            amount = Decimal(amount_str)
            if amount <= 0:
                raise ValueError("Jumlah harus positif.")
        except Exception:
            messages.error(request, "Nominal tidak valid.")
            return redirect("core_ui:user_topup")
            
        user = request.user
        from apps.payments.models import WalletTransaction
        
        # Untuk metode manual (Crypto / Transfer), statusnya PENDING
        # Saldo dompet TIDAK BOLEH ditambah sampai transaksi berstatus COMPLETED
        
        tx_hash = request.POST.get("tx_hash", "").strip()
        notes = f"Top-Up via {method} (Menunggu Konfirmasi)"
        if tx_hash:
            notes += f" | TxHash: {tx_hash}"
            
        WalletTransaction.objects.create(
            user=user,
            transaction_type=WalletTransaction.TransactionType.DEPOSIT,
            amount=amount,
            currency=currency,
            status=WalletTransaction.Status.PENDING,
            notes=notes
        )
        
        messages.success(request, f"Permintaan Top-Up {currency} {amount:,.2f} via {method} sedang diproses. Harap tunggu verifikasi Admin.")
        return redirect("core_ui:user_wallet")
        
    return redirect("core_ui:user_topup")

@login_required
@require_POST
def admin_kyc_action_view(request, kyc_id):
    """
    Aksi Admin: Menyetujui atau menolak KYC.
    """
    from apps.accounts.models import KYCDocument
    if request.user.role not in [User.Role.ADMIN, User.Role.SUPERADMIN]:
        messages.error(request, "Akses ditolak.")
        return redirect("core_ui:index")
        
    kyc = get_object_or_404(KYCDocument, id=kyc_id, status=KYCDocument.Status.PENDING)
    action = request.POST.get("action")
    
    if action == "approve":
        kyc.status = KYCDocument.Status.APPROVED
        kyc.save()
        
        # Jadikan host
        kyc.user.role = User.Role.HOST
        kyc.user.save()
        
        # Buat profile host default
        from apps.accounts.models import CreatorProfile
        CreatorProfile.objects.get_or_create(user=kyc.user)
        
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=kyc.user,
            type=Notification.NotificationType.SYSTEM,
            title="KYC Disetujui",
            body="Selamat! Akun Anda telah disetujui sebagai Host."
        )
        
        messages.success(request, f"KYC untuk {kyc.user.username} disetujui. Akun telah menjadi Host.")
    elif action == "reject":
        kyc.status = KYCDocument.Status.REJECTED
        kyc.reviewer_notes = request.POST.get("reason", "Dokumen tidak valid atau buram.")
        kyc.save()
        
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=kyc.user,
            type=Notification.NotificationType.SYSTEM,
            title="KYC Ditolak",
            body=f"Pengajuan KYC Anda ditolak. Alasan: {kyc.rejection_reason}"
        )
        
        messages.warning(request, f"KYC untuk {kyc.user.username} ditolak.")
        
    return redirect("core_ui:admin_dashboard")

@login_required
@require_POST
def admin_report_action_view(request, report_id):
    """
    Aksi Admin: Menindaklanjuti laporan pengguna.
    """
    from apps.moderation.models import Report
    if request.user.role not in [User.Role.ADMIN, User.Role.SUPERADMIN]:
        messages.error(request, "Akses ditolak.")
        return redirect("core_ui:index")
        
    report = get_object_or_404(Report, id=report_id)
    action = request.POST.get("action")
    
    if action == "ban":
        report.reported_user.is_active = False
        report.reported_user.save()
        messages.success(request, f"Akun {report.reported_user.username} telah di-ban.")
        report.delete() # Selesai
    elif action == "dismiss":
        report.delete()
        messages.info(request, "Laporan diabaikan.")
        
    return redirect("core_ui:admin_dashboard")

@ratelimit(key='ip', rate='10/m', block=True)
def global_search_view(request):
    """
    Menampilkan hasil pencarian global untuk Host dan Live Stream.
    """
    from apps.streaming_ui.models import LiveStream
    from apps.accounts.models import User
    
    query = request.GET.get('q', '').strip()
    
    hosts = []
    streams = []
    
    if query and len(query) >= 3:
        # Batasi hasil hingga maksimal 20 (Anti DoS/Full Table Scan)
        hosts = User.objects.annotate(
            search=SearchVector('username', 'creator_profile__display_name')
        ).filter(
            role=User.Role.HOST,
            search=query
        ).distinct()[:20]
        
        streams = LiveStream.objects.annotate(
            search=SearchVector('title', 'description')
        ).filter(
            status__in=[LiveStream.Status.UPCOMING, LiveStream.Status.LIVE],
            search=query
        ).order_by('scheduled_time')[:20]
        
    return render(request, "core/search_results.html", {
        "query": query,
        "hosts": hosts,
        "streams": streams
    })
