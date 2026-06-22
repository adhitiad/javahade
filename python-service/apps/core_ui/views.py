from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.contrib.postgres.search import SearchVector
from django_ratelimit.decorators import ratelimit
from apps.accounts.models import CreatorProfile, User
from apps.subscriptions.models import Subscription, SubscriptionTier
from apps.family.models import FamilyGroup, FamilyMember

from django.core.paginator import Paginator
from django.core.cache import cache
from apps.content.models import Post, Story, Like

def index_view(request):
    """
    Rute utama (Root URL).
    Jika user sudah login -> render Beranda (Feed).
    Jika guest (belum login) -> render Landing Page premium.
    """
    if request.user.is_authenticated:
        # Optimasi Backend: Cache query Story selama 60 detik (mengurangi beban DB)
        stories = cache.get("active_stories")
        if stories is None:
            stories = list(Story.objects.all()[:10])
            cache.set("active_stories", stories, 60)
        
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
        return render(request, "core/landing.html")

@login_required
def become_host_view(request):
    """View untuk mendaftar menjadi Host/Creator"""
    from apps.accounts.models import KYCDocument
    from apps.accounts.services.kyc_ai import verify_kyc_with_openrouter  # type: ignore
    
    error_message = None

    # 1. Validasi Gender (Hanya Perempuan)
    if request.user.gender != User.Gender.FEMALE:
        messages.error(request, "Pendaftaran Ditolak: Hanya pengguna berjenis kelamin Perempuan yang diizinkan menjadi Host.")
        return redirect("core_ui:index")

    if request.method == "POST":
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
            
            # 3. Kirim ke AI (OpenRouter) untuk Verifikasi
            verify_kyc_with_openrouter(kyc_doc.id)
            
            return redirect("core_ui:index")
            
    return render(request, "core/become_host.html", {"error_message": error_message})

@login_required
def verify_kyc_view(request):
    """View untuk User Biasa (Klien) mengunggah KYC agar bisa mem-booking Host"""
    from apps.accounts.models import KYCDocument
    from apps.accounts.services.kyc_ai import verify_kyc_with_openrouter  # type: ignore
    from django.http import JsonResponse

    wants_json = "application/json" in request.headers.get("Accept", "")

    # Jika sudah punya KYC yang approved atau pending
    existing_kyc = KYCDocument.objects.filter(user=request.user).order_by('-submitted_at').first()
    if existing_kyc and existing_kyc.status in [KYCDocument.Status.APPROVED, KYCDocument.Status.PENDING]:
        if wants_json:
            return JsonResponse({
                "status": "success",
                "kyc_status": existing_kyc.status,
                "message": f"Status KYC Anda saat ini: {existing_kyc.get_status_display()}"
            })
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
            # Kirim ke AI OpenRouter
            verify_kyc_with_openrouter(kyc_doc.id)
            
            if wants_json:
                return JsonResponse({"status": "success", "message": "Dokumen KYC berhasil dikirim dan sedang diproses oleh AI kami!"})
            
            messages.success(request, "Dokumen KYC berhasil dikirim dan sedang diproses oleh AI kami!")
            
            # Kembali ke halaman sebelumnya jika ada parameter 'next'
            next_url = request.GET.get('next')
            if next_url:
                return redirect(next_url)
            return redirect("core_ui:index")
        elif wants_json:
            return JsonResponse({"status": "error", "message": "Harap lengkapi semua data dan unggah dokumen."}, status=400)

    if wants_json:
        return JsonResponse({"status": "idle", "kyc_status": "none"})
        
    return render(request, "core/verify_kyc.html")

@login_required
def edit_creator_profile_view(request):
    """View untuk mengedit profil Host/Creator"""
    from django.http import JsonResponse
    wants_json = "application/json" in request.headers.get("Accept", "")

    if not request.user.is_creator:
        if wants_json:
            return JsonResponse({"status": "error", "message": "Hanya Host yang dapat mengedit profil kreator."}, status=403)
        messages.error(request, "Hanya Host yang dapat mengedit profil kreator.")
        return redirect("core_ui:index")
        
    profile = request.user.creator_profile
    
    if request.method == "POST":
        profile.display_name = request.POST.get("display_name", profile.display_name)
        profile.category = request.POST.get("category", profile.category)
        profile.subscription_price = request.POST.get("subscription_price", profile.subscription_price)
        profile.chat_price = request.POST.get("chat_price", profile.chat_price)
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
                    if not wants_json:
                        messages.warning(request, "Komisi platform harus antara 20% hingga 50%.")
            except:
                pass
        
        if "cover_image" in request.FILES:
            profile.cover_image = request.FILES["cover_image"]
            
        profile.save()
        if wants_json:
            return JsonResponse({"status": "success", "message": "Profil berhasil diperbarui!"})
        messages.success(request, "Profil berhasil diperbarui!")
        return redirect("core_ui:creator_profile", username=request.user.username)
        
    from apps.accounts.models import CreatorProfile
    if wants_json:
        return JsonResponse({
            "profile": {
                "display_name": profile.display_name,
                "category": profile.category,
                "subscription_price": str(profile.subscription_price),
                "chat_price": str(profile.chat_price),
                "website": profile.website,
                "subscription_rules": profile.subscription_rules,
                "platform_commission_rate": str(profile.platform_commission_rate),
                "cover_image_url": profile.cover_image.url if profile.cover_image else None
            },
            "categories": [{"id": c[0], "name": c[1]} for c in CreatorProfile.Category.choices]
        })

    return render(request, "creator/profile_edit.html", {
        "profile": profile,
        "categories": CreatorProfile.Category.choices
    })

def creator_profile_view(request, username):
    """View untuk melihat profil publik (Kreator/Host atau User Biasa)"""
    from django.http import JsonResponse
    import json
    
    wants_json = "application/json" in request.headers.get("Accept", "")
    
    # 1. Dapatkan user (Bebas apakah Host atau User)
    target_user = get_object_or_404(User, username=username)
    
    # 2. Ambil CreatorProfile jika ada
    profile = getattr(target_user, 'creator_profile', None)
    
    # 3. Data tambahan khusus Host
    tiers = None
    is_subscribed = False
    portfolio_photos = []
    avg_rating = 0
    
    if profile:
        tiers = SubscriptionTier.objects.filter(creator=target_user, is_active=True).order_by('sort_order')
        if request.user.is_authenticated:
            is_subscribed = Subscription.objects.filter(subscriber=request.user, tier__creator=target_user, status='active').exists()
            
        from apps.accounts.models import CreatorPhoto
        portfolio_photos = CreatorPhoto.objects.filter(profile=profile)
        avg_rating = target_user.get_avg_rating_as_host()
        
    # Rating Package Access
    has_rating_package = False
    has_chat_access = False
    if request.user.is_authenticated:
        if hasattr(request.user, 'rating_access'):
            has_rating_package = request.user.rating_access.is_active
            
        from apps.subscriptions.models import ChatAccess
        has_chat_access = is_subscribed or ChatAccess.objects.filter(host=target_user, user=request.user).exists()
    
    if request.method == "POST":
        data = request.POST
        if wants_json and request.content_type == "application/json":
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                pass
                
        if "subscribe" in data or data.get("action") == "subscribe":
            if not profile:
                if wants_json:
                    return JsonResponse({"status": "error", "message": "Pengguna ini bukan Host."}, status=400)
                messages.error(request, "Pengguna ini bukan Host.")
                return redirect("core_ui:creator_profile", username=username)
                
            tier_id = data.get("tier_id")
            tier = get_object_or_404(SubscriptionTier, id=tier_id)
            
            # Simple check if balance is enough (assume subscription deducts balance later or here if needed)
            # For now, just create the subscription
            Subscription.objects.create(
                subscriber=request.user,
                tier=tier,
                status='active'
            )
            
            if wants_json:
                return JsonResponse({"status": "success", "message": f"Berhasil berlangganan ke {target_user.username}"})
            return redirect("core_ui:creator_profile", username=username)

    if wants_json:
        return JsonResponse({
            "creator": {
                "id": target_user.id,
                "username": target_user.username,
                "role": target_user.role,
                "avatar_url": target_user.avatar.url if hasattr(target_user, 'avatar') and target_user.avatar else None
            },
            "profile": {
                "display_name": profile.display_name if profile else None,
                "category": profile.get_category_display() if profile else None,
                "bio": profile.bio if profile and hasattr(profile, 'bio') else None,
                "cover_image_url": profile.cover_image.url if profile and profile.cover_image else None,
                "subscription_rules": profile.subscription_rules if profile else None,
                "website": profile.website if profile else None,
                "chat_price": str(profile.chat_price) if profile else "0"
            } if profile else None,
            "tiers": [{
                "id": t.id,
                "name": t.name,
                "price": str(t.price),
                "description": t.description
            } for t in tiers] if tiers else [],
            "portfolio_photos": [{
                "id": p.id,
                "url": p.image.url
            } for p in portfolio_photos] if portfolio_photos else [],
            "is_subscribed": is_subscribed,
            "avg_rating": avg_rating,
            "has_rating_package": has_rating_package,
            "has_chat_access": has_chat_access
        })

    return render(request, "creator/profile.html", {
        "creator": target_user,
        "profile": profile,
        "tiers": tiers,
        "is_subscribed": is_subscribed,
        "portfolio_photos": portfolio_photos,
        "avg_rating": avg_rating,
        "has_rating_package": has_rating_package,
        "has_chat_access": has_chat_access
    })

@login_required
def manage_subscription_tiers_view(request):
    """
    Halaman bagi Host untuk mengatur 4 Slot Paket Berlangganan mereka.
    """
    from django.http import JsonResponse
    import json
    
    wants_json = "application/json" in request.headers.get("Accept", "")
    
    if request.user.role != User.Role.HOST:
        if wants_json:
            return JsonResponse({"status": "error", "message": "Akses ditolak. Anda bukan Host."}, status=403)
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
        data = request.POST
        if wants_json and request.content_type == "application/json":
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                pass
                
        for index, tier in enumerate(tiers):
            tier_id_str = str(tier.id)
            name_key = f"name_{tier_id_str}"
            price_key = f"price_{tier_id_str}"
            desc_key = f"desc_{tier_id_str}"
            
            if name_key in data:
                tier.name = data.get(name_key)
                
                # Handling empty price safely
                price_val = data.get(price_key)
                if price_val is not None and price_val != "":
                    try:
                        tier.price = float(price_val)
                    except ValueError:
                        pass
                        
                tier.description = data.get(desc_key, "")
                tier.save()
                
        # Simpan Subscription Rules
        if "subscription_rules" in data:
            profile.subscription_rules = data.get("subscription_rules")
            profile.save()
                
        if wants_json:
            return JsonResponse({"status": "success", "message": "Paket Langganan & Peraturan Anda berhasil diperbarui."})
        messages.success(request, "Paket Langganan & Peraturan Anda berhasil diperbarui.")
        return redirect("core_ui:manage_tiers")
        
    if wants_json:
        return JsonResponse({
            "tiers": [{
                "id": t.id,
                "name": t.name,
                "price": str(t.price),
                "description": t.description,
                "sort_order": t.sort_order
            } for t in tiers],
            "subscription_rules": profile.subscription_rules
        })
        
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
            # pyrefly: ignore [missing-import]
            from apps.subscriptions.models import Subscription
            # pyrefly: ignore [missing-import]
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
    from django.http import JsonResponse
    
    # Ambil 20 transaksi terakhir milik user ini
    transactions = WalletTransaction.objects.filter(user=request.user).order_by("-created_at")[:20]
    
    if "application/json" in request.headers.get("Accept", ""):
        tx_data = [{
            "id": tx.id,
            "type": tx.transaction_type,
            "type_display": tx.get_transaction_type_display(),
            "amount": str(tx.amount),
            "currency": tx.currency,
            "status": tx.status,
            "status_display": tx.get_status_display(),
            "notes": tx.notes,
            "created_at": tx.created_at.isoformat()
        } for tx in transactions]
        
        return JsonResponse({
            "balances": {
                "IDR": str(request.user.balance_idr),
                "USD": str(request.user.balance_usd),
                "SGD": str(request.user.balance_sgd),
                "MYR": str(request.user.balance_myr),
                "CNY": str(request.user.balance_cny)
            },
            "is_creator": request.user.is_creator,
            "transactions": tx_data
        })
    
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
    from django.http import JsonResponse
    wants_json = "application/json" in request.headers.get("Accept", "")

    if request.user.role != 'host':
        if wants_json:
            return JsonResponse({"status": "error", "message": "Fitur konversi ini khusus untuk Host."}, status=403)
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
            msg = f"Konversi berhasil! Total IDR yang ditambahkan: {total_converted_idr:,.2f}."
            if wants_json:
                return JsonResponse({"status": "success", "message": msg, "converted_amount": str(total_converted_idr)})
            messages.success(request, msg)
        else:
            if wants_json:
                return JsonResponse({"status": "error", "message": "Tidak ada saldo asing untuk dikonversi."}, status=400)
            messages.warning(request, "Tidak ada saldo asing untuk dikonversi.")
            
    if wants_json:
        return JsonResponse({"status": "success"})
    return redirect("core_ui:user_wallet")

@login_required
def user_wallet_action_view(request):
    """
    Memproses request Deposit dan Withdrawal dari Dasbor Dompet.
    """
    from django.http import JsonResponse
    import json
    
    wants_json = "application/json" in request.headers.get("Accept", "")
    
    if request.method == "POST":
        data = request.POST
        if wants_json and request.content_type == "application/json":
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                pass
                
        action = data.get("action")
        amount_str = data.get("amount", "0")
        currency = data.get("currency", "USD")
        
        try:
            from decimal import Decimal
            amount = Decimal(amount_str)
            if amount <= 0:
                raise ValueError("Jumlah harus lebih dari 0")
        except:
            if wants_json:
                return JsonResponse({"status": "error", "message": "Jumlah tidak valid."}, status=400)
            messages.error(request, "Jumlah tidak valid.")
            return redirect("core_ui:user_wallet")
            
        user = request.user
        from apps.payments.models import WalletTransaction
        
        if action == "deposit":
            if wants_json:
                return JsonResponse({"status": "error", "message": "Deposit manual telah dinonaktifkan karena alasan keamanan. Silakan gunakan integrasi PayPal untuk Top-Up Saldo."}, status=400)
            messages.error(request, "Deposit manual telah dinonaktifkan karena alasan keamanan. Silakan gunakan integrasi PayPal untuk Top-Up Saldo.")
            return redirect("core_ui:user_wallet")
            
        elif action == "withdraw":
            if not user.is_creator:
                if wants_json:
                    return JsonResponse({"status": "error", "message": "Hanya Host/Creator yang diizinkan menarik dana."}, status=403)
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
                if wants_json:
                    return JsonResponse({"status": "error", "message": f"Saldo {currency} Anda tidak mencukupi untuk penarikan ini."}, status=400)
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
            msg = f"Permintaan penarikan {currency} {amount:,.2f} sedang diproses."
            if wants_json:
                return JsonResponse({"status": "success", "message": msg})
            messages.success(request, msg)
            
    if wants_json:
        return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)
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
    from django.http import JsonResponse

    wants_json = "application/json" in request.headers.get("Accept", "")

    # Ambil daftar Host/Fan yang pernah berinteraksi dengan user ini
    if request.user.role == User.Role.HOST:
        # Jika Host, tampilkan Fan yang subscribe ATAU booking ke dia
        contacts = (
            User.objects.filter(
                Q(host_bookings_made__host=request.user)
                | Q(subscriptions__tier__creator=request.user)
            )
            .exclude(id=request.user.id)
            .distinct()
        )
    else:
        # Jika Fans, tampilkan host yang disubscribe ATAU di-booking
        contacts = (
            User.objects.filter(
                Q(host_bookings_received__user=request.user)
                | Q(subscription_tiers__subscriptions__subscriber=request.user)
            )
            .exclude(id=request.user.id)
            .distinct()
        )

    if wants_json:
        return JsonResponse({
            "contacts": [{
                "id": c.id,
                "username": c.username,
                "role": c.role,
                "avatar_url": c.avatar.url if c.avatar else None,
                "display_name": c.creator_profile.display_name if hasattr(c, 'creator_profile') and c.creator_profile else c.username
            } for c in contacts]
        })

    return render(request, "core/chat_inbox.html", {"contacts": contacts})

@login_required
def chat_detail_view(request, username):
    """
    Menampilkan UI Private Chat dengan pengguna tertentu (Host/Fans).
    Harus memvalidasi apakah ada Subscription yang aktif di antara keduanya.
    """
    from apps.accounts.models import User
    from apps.subscriptions.models import Subscription, ChatAccess
    from django.http import JsonResponse

    wants_json = "application/json" in request.headers.get("Accept", "")

    other_user = get_object_or_404(User, username=username)

    # Validasi Subscription atau ChatAccess
    has_access = False

    # Cek jika chat gratis
    is_free = False
    target_profile = getattr(other_user, 'creator_profile', None) if request.user.role != User.Role.HOST else getattr(request.user, 'creator_profile', None)
    
    price_to_pay = target_profile.chat_price if target_profile else 0
    if price_to_pay == 0:
        is_free = True

    if request.user.role == User.Role.HOST:
        # Host selalu bisa nge-chat user yang subscribe ke dia ATAU yang udah beli ChatAccess ke dia
        has_sub = Subscription.objects.filter(creator=request.user, subscriber=other_user, is_active=True).exists()
        has_chat_access = ChatAccess.objects.filter(host=request.user, user=other_user).exists()
        has_access = has_sub or has_chat_access or is_free
    else:
        # User biasa mengecek apakah dia subscribe host, ATAU dia udah beli ChatAccess
        has_sub = Subscription.objects.filter(creator=other_user, subscriber=request.user, is_active=True).exists()
        has_chat_access = ChatAccess.objects.filter(host=other_user, user=request.user).exists()
        has_access = has_sub or has_chat_access or is_free
        
    # Bypass validasi untuk Admin/Superadmin
    if request.user.is_superuser or request.user.role in [User.Role.ADMIN, User.Role.SUPERADMIN]:
        has_access = True
        
    if not has_access:
        if wants_json:
            return JsonResponse({
                "status": "error",
                "message": "Akses Terkunci",
                "reason": "payment_required",
                "price": str(price_to_pay)
            }, status=403)
        messages.error(request, f"Anda harus berlangganan (Subscribe) atau membeli Akses Chat ke {other_user.username} untuk mengirim pesan pribadi.")
        return redirect("core_ui:creator_profile", username=username)
        
    # Tandai jika ini chat dari admin ke host
    is_admin_chat = False
    if request.user.is_superuser or request.user.role in [User.Role.ADMIN, User.Role.SUPERADMIN]:
        if other_user.role == User.Role.HOST:
            is_admin_chat = True
        
    # Generate JWT Token untuk WebSocket Go
    from rest_framework_simplejwt.tokens import AccessToken
    token = AccessToken.for_user(request.user)
    
    if wants_json:
        return JsonResponse({
            "status": "success",
            "chat_token": str(token),
            "other_user": {
                "id": other_user.id,
                "username": other_user.username,
                "role": other_user.role,
                "avatar_url": other_user.avatar.url if other_user.avatar else None,
                "display_name": other_user.creator_profile.display_name if hasattr(other_user, 'creator_profile') and other_user.creator_profile else other_user.username
            },
            "is_admin_chat": is_admin_chat
        })
    
    return render(request, "core/chat_detail.html", {
        "other_user": other_user,
        "chat_token": str(token),
        "is_admin_chat": is_admin_chat
    })

@login_required
def user_topup_view(request):
    """
    Menampilkan halaman form Top-Up Dompet.
    Mendukung integrasi langsung ke Gateway PayPal.
    """
    from django.conf import settings
    from django.http import JsonResponse
    
    if "application/json" in request.headers.get("Accept", ""):
        return JsonResponse({
            "paypal_client_id": getattr(settings, "PAYPAL_CLIENT_ID", "test")
        })
        
    return render(request, "wallet/topup.html", {
        "paypal_client_id": getattr(settings, "PAYPAL_CLIENT_ID", "test")
    })

@login_required
def user_topup_action_view(request):
    """
    Memproses Top-Up untuk metode non-PayPal (seperti Transfer Bank/E-Wallet).
    Mencatat transaksi berstatus Pending hingga dikonfirmasi admin.
    """
    from django.http import JsonResponse
    import json
    
    wants_json = "application/json" in request.headers.get("Accept", "")
    
    if request.method == "POST":
        data = request.POST
        if wants_json and request.content_type == "application/json":
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                pass
                
        amount_str = data.get("amount", "0")
        currency = data.get("currency", "USD")
        method = data.get("method", "Transfer Bank")
        
        try:
            from decimal import Decimal
            amount = Decimal(amount_str)
            if amount <= 0:
                raise ValueError("Jumlah harus positif.")
        except Exception:
            if wants_json:
                return JsonResponse({"status": "error", "message": "Nominal tidak valid."}, status=400)
            messages.error(request, "Nominal tidak valid.")
            return redirect("core_ui:user_topup")
            
        user = request.user
        # pyrefly: ignore [missing-import]
        from apps.payments.models import WalletTransaction
        
        # Untuk metode manual (Crypto / Transfer), statusnya PENDING
        # Saldo dompet TIDAK BOLEH ditambah sampai transaksi berstatus COMPLETED
        
        tx_hash = data.get("tx_hash", "").strip()
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
        
        msg = f"Permintaan Top-Up {currency} {amount:,.2f} via {method} sedang diproses. Harap tunggu verifikasi Admin."
        if wants_json:
            return JsonResponse({"status": "success", "message": msg})
        messages.success(request, msg)
        return redirect("core_ui:user_wallet")
        
    if wants_json:
        return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)
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

# -----------------------------------------------------------------------------
# HTMX Feed & Interactive Views
# -----------------------------------------------------------------------------
@login_required
def htmx_feed_posts(request):
    """
    Mengembalikan potongan HTML daftar postingan untuk infinite scroll HTMX,
    atau JsonResponse jika Accept Header adalah application/json.
    """
    from apps.content.models import Post, Like, PostUnlock
    from apps.subscriptions.models import Subscription
    from django.core.paginator import Paginator
    from django.http import JsonResponse

    wants_json = "application/json" in request.headers.get("Accept", "")

    page_number = request.GET.get('page', 1)
    post_list = Post.objects.filter(is_published=True).select_related('creator')
    paginator = Paginator(post_list, 10)
    page_obj = paginator.get_page(page_number)
    
    liked_post_ids = Like.objects.filter(user=request.user, is_unlike=False).values_list('post_id', flat=True)
    unlocked_post_ids = PostUnlock.objects.filter(user=request.user).values_list('post_id', flat=True)
    
    if wants_json:
        # Pre-calculate active subscriptions to fast-check premium access
        # Admin or Superadmin ignores paywalls
        is_admin = request.user.is_superuser or request.user.role in ['admin', 'superadmin']
        
        subscribed_host_ids = []
        if not is_admin:
            subscribed_host_ids = Subscription.objects.filter(
                subscriber=request.user, is_active=True
            ).values_list('creator_id', flat=True)

        data = []
        for p in page_obj:
            # Akses dasar: Admin atau pemilik post
            has_access = is_admin or (request.user == p.creator)
            is_ppv = p.price_override and p.price_override > 0
            
            if not has_access:
                if is_ppv:
                    # Locked by PPV (Pay-per-view)
                    has_access = p.id in unlocked_post_ids
                elif p.is_premium:
                    # Locked by Subscription
                    has_access = p.creator_id in subscribed_host_ids
                else:
                    # Public
                    has_access = True
            
            post_data = {
                "id": str(p.id),
                "creator": {
                    "id": p.creator.id,
                    "username": p.creator.username,
                    "display_name": getattr(p.creator, 'creator_profile', None).display_name if hasattr(p.creator, 'creator_profile') else p.creator.username,
                    "avatar_url": p.creator.avatar.url if p.creator.avatar else None,
                },
                "content_type": p.content_type,
                "title": p.title,
                "is_premium": p.is_premium,
                "is_ppv": bool(is_ppv),
                "price": str(p.price_override) if is_ppv else "0",
                "like_count": p.like_count,
                "comment_count": p.comment_count,
                "created_at": p.created_at.isoformat(),
                "is_liked": p.id in liked_post_ids,
                "has_access": has_access
            }
            
            # Mask content if no access
            if not has_access:
                post_data["body"] = p.body[:50] + "..." if p.body else ""
                post_data["media_url"] = None
                post_data["media_file_url"] = None
                post_data["thumbnail_url"] = request.build_absolute_uri(p.thumbnail.url) if p.thumbnail else None
            else:
                post_data["body"] = p.body
                post_data["media_url"] = p.media_url
                post_data["media_file_url"] = request.build_absolute_uri(p.media_file.url) if p.media_file else None
                post_data["thumbnail_url"] = request.build_absolute_uri(p.thumbnail.url) if p.thumbnail else None
                
            data.append(post_data)
            
        return JsonResponse({
            "posts": data,
            "has_next": page_obj.has_next(),
            "total_pages": paginator.num_pages
        })

    return render(request, "components/_feed_posts.html", {
        "posts": page_obj,
        "liked_post_ids": liked_post_ids
    })

@login_required
def htmx_like_post(request, post_id):
    """
    Menandai/mencabut Like pada postingan via HTMX atau API JSON.
    """
    from apps.content.models import Post, Like
    from django.http import JsonResponse

    wants_json = "application/json" in request.headers.get("Accept", "")

    if request.method == "POST":
        post = get_object_or_404(Post, id=post_id)
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
        
        if wants_json:
            return JsonResponse({
                "status": "success",
                "is_liked": is_liked,
                "like_count": post.like_count
            })

        return render(request, "components/_post_like_button.html", {
            "post": post,
            "is_liked": is_liked
        })
        
    if wants_json:
        return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
    return redirect("core_ui:index")

@login_required
@require_POST
def create_post_view(request):
    """
    Endpoint JSON untuk membuat postingan baru (Feed)
    """
    from apps.content.models import Post
    from django.http import JsonResponse
    import json
    from decimal import Decimal

    if request.user.role != 'host':
        return JsonResponse({"error": "Hanya host yang bisa membuat postingan"}, status=403)
        
    try:
        # Menangani form multipart/form-data
        title = request.POST.get('title', '')
        body = request.POST.get('body', '')
        is_premium = request.POST.get('is_premium', 'false').lower() == 'true'
        price_override_str = request.POST.get('price_override', '0')
        price_override = Decimal(price_override_str) if price_override_str else None
        
        media_file = request.FILES.get('media_file')
        
        # Deteksi tipe konten
        content_type = Post.ContentType.TEXT
        if media_file:
            if media_file.content_type.startswith('video/'):
                content_type = Post.ContentType.VIDEO
            elif media_file.content_type.startswith('image/'):
                content_type = Post.ContentType.IMAGE
                
        post = Post(
            creator=request.user,
            title=title,
            body=body,
            is_premium=is_premium,
            price_override=price_override if price_override and price_override > 0 else None,
            content_type=content_type,
            is_published=True
        )
        
        if media_file:
            post.media_file = media_file
            
        post.save()
        
        return JsonResponse({"status": "success", "message": "Postingan berhasil dibuat", "post_id": str(post.id)})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
@require_POST
def buy_post_view(request, post_id):
    """
    Endpoint JSON untuk membeli postingan Pay-Per-View (PPV)
    """
    from apps.content.models import Post, PostUnlock
    from apps.payments.models import WalletTransaction
    from django.db import transaction
    from django.http import JsonResponse

    post = get_object_or_404(Post, id=post_id)
    
    if not post.price_override or post.price_override <= 0:
        return JsonResponse({"error": "Post ini tidak tersedia untuk dibeli satuan."}, status=400)
        
    if PostUnlock.objects.filter(post=post, user=request.user).exists():
        return JsonResponse({"status": "success", "message": "Anda sudah membeli postingan ini."})
        
    price = post.price_override
    user = request.user
    target_user = post.creator
    
    profile = getattr(target_user, 'creator_profile', None)
    commission_rate = profile.platform_commission_rate if profile else 20
    
    with transaction.atomic():
        if user.balance_idr < price:
            return JsonResponse({"error": f"Saldo IDR Anda tidak mencukupi (Butuh {price})."}, status=402)
            
        # Potong saldo pembeli
        user.balance_idr -= price
        user.save()
        
        # Tambah saldo host
        commission = price * (commission_rate / 100)
        net_price = price - commission
        target_user.balance_idr += net_price
        target_user.save()
        
        # Buat transaksi pembeli
        WalletTransaction.objects.create(
            user=user, transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
            amount=price, currency='IDR', status=WalletTransaction.Status.COMPLETED,
            notes=f'Membeli Postingan PPV dari {target_user.username}'
        )
        # Buat transaksi host
        WalletTransaction.objects.create(
            user=target_user, transaction_type=WalletTransaction.TransactionType.EARNING,
            amount=net_price, currency='IDR', status=WalletTransaction.Status.COMPLETED,
            notes=f'Penjualan Postingan PPV ke {user.username}'
        )
        
        # Catat pembukaan (Unlock)
        PostUnlock.objects.create(post=post, user=user, price_paid=price)
        
    return JsonResponse({"status": "success", "message": "Berhasil membeli postingan PPV!"})

@login_required
@require_POST
def buy_chat_access_view(request, username):
    from apps.accounts.models import User
    from apps.subscriptions.models import ChatAccess
    from apps.payments.models import WalletTransaction
    from django.db import transaction
    from django.http import JsonResponse

    wants_json = "application/json" in request.headers.get("Accept", "")

    target_user = get_object_or_404(User, username=username)
    profile = getattr(target_user, 'creator_profile', None)

    if not profile or profile.chat_price <= 0:
        if wants_json:
            return JsonResponse({"status": "error", "message": "Host ini tidak memungut biaya chat atau bukan host."}, status=400)
        messages.error(request, 'Host ini tidak memungut biaya chat atau bukan host.')
        return redirect('core_ui:creator_profile', username=username)

    price = profile.chat_price
    user = request.user

    if ChatAccess.objects.filter(user=user, host=target_user).exists():
        if wants_json:
            return JsonResponse({"status": "success", "message": "Anda sudah memiliki akses chat."})
        messages.info(request, 'Anda sudah memiliki akses chat.')
        return redirect('core_ui:chat_detail', username=username)

    with transaction.atomic():
        if user.balance_idr < price:
            if wants_json:
                return JsonResponse({"status": "error", "message": f"Saldo IDR Anda tidak mencukupi (Butuh {price})."}, status=402)
            messages.error(request, f'Saldo IDR Anda tidak mencukupi (Butuh {price}).')
            return redirect('core_ui:user_wallet')

        # Potong saldo pembeli
        user.balance_idr -= price
        user.save()

        # Tambah saldo host (misal dipotong komisi 20%)
        commission = price * (profile.platform_commission_rate / 100)
        net_price = price - commission
        target_user.balance_idr += net_price
        target_user.save()

        # Buat transaksi pembeli
        WalletTransaction.objects.create(
            user=user, transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
            amount=price, currency='IDR', status=WalletTransaction.Status.COMPLETED,
            notes=f'Membeli Akses Chat ke {target_user.username}'
        )
        # Buat transaksi host
        WalletTransaction.objects.create(
            user=target_user, transaction_type=WalletTransaction.TransactionType.EARNING,
            amount=net_price, currency='IDR', status=WalletTransaction.Status.COMPLETED,
            notes=f'Pendapatan Akses Chat dari {user.username}'
        )

        # Buat ChatAccess
        ChatAccess.objects.create(user=user, host=target_user, price_paid=price)

    if wants_json:
        return JsonResponse({"status": "success", "message": f"Akses chat dengan {target_user.username} terbuka!"})
    messages.success(request, f'Akses chat dengan {target_user.username} terbuka!')
    return redirect('core_ui:chat_detail', username=username)


from django.http import JsonResponse
import requests

@login_required
@require_POST
def chat_upload_image_view(request, username):
    try:
        image_file = request.FILES.get('image')
        room_id = request.POST.get('room_id')
        
        if not image_file or not room_id:
            return JsonResponse({"error": "Gambar dan Room ID diperlukan."}, status=400)
            
        other_user = get_object_or_404(User, username=username)
        user = request.user
        
        # 1. Tentukan Role dan Validasi Biaya
        is_free = True
        price_to_pay = 0
        target_host = None
        
        if user.is_superuser or user.role in [User.Role.ADMIN, User.Role.SUPERADMIN]:
            is_free = True
        elif user.role == User.Role.HOST:
            is_free = True
        else:
            # User biasa ke Host
            if other_user.role == User.Role.HOST:
                target_host = other_user
                is_free = False
            else:
                # User biasa ke User biasa (tidak didukung atau gratis)
                is_free = True
                
        if not is_free and target_host:
            # Validasi 11 balasan dari host
            # Panggil Go API untuk mendapatkan riwayat pesan
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken.for_user(user)
            headers = {"Authorization": f"Bearer {token}"}
            
            try:
                # Go Service URL from env or localhost:8081
                resp = requests.get(f"http://localhost:8081/api/v1/rooms/{room_id}/messages?limit=100", headers=headers, timeout=5)
                if resp.status_code == 200:
                    messages = resp.json()
                    host_reply_count = sum(1 for m in messages if m.get("sender_id") == str(target_host.id))
                    if host_reply_count < 11:
                        return JsonResponse({"error": f"Host belum membalas 11 kali. Saat ini baru {host_reply_count} balasan."}, status=403)
                else:
                    return JsonResponse({"error": "Gagal memverifikasi riwayat pesan dari server chat."}, status=500)
            except Exception as e:
                return JsonResponse({"error": "Sistem chat sedang tidak tersedia."}, status=500)
                
            # Validasi Saldo (0.10% dari subscription_price)
            profile = getattr(target_host, 'creator_profile', None)
            sub_price = profile.subscription_price if profile else 0
            
            # Harga = 0.10% dari sub_price
            price_to_pay = sub_price * (0.1 / 100)
            if price_to_pay < 1: 
                price_to_pay = 1 # Minimal 1 IDR
                
            if user.balance_idr < price_to_pay:
                return JsonResponse({"error": f"Saldo tidak cukup. Butuh IDR {price_to_pay:,.2f}"}, status=402)
                
            # Proses Pembayaran
            from apps.payments.models import WalletTransaction
            from django.db import transaction
            
            with transaction.atomic():
                user = User.objects.select_for_update().get(id=user.id)
                target_user = User.objects.select_for_update().get(id=target_host.id)
                
                if user.balance_idr < price_to_pay:
                    return JsonResponse({"error": "Saldo tidak cukup."}, status=402)
                    
                user.balance_idr -= price_to_pay
                user.save()
                
                commission = price_to_pay * (profile.platform_commission_rate / 100) if profile else 0
                net_price = price_to_pay - commission
                
                target_user.balance_idr += net_price
                target_user.save()
                
                WalletTransaction.objects.create(
                    user=user, transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
                    amount=price_to_pay, currency='IDR', status=WalletTransaction.Status.COMPLETED,
                    notes=f'Biaya Kirim Gambar ke {target_user.username}'
                )
                WalletTransaction.objects.create(
                    user=target_user, transaction_type=WalletTransaction.TransactionType.EARNING,
                    amount=net_price, currency='IDR', status=WalletTransaction.Status.COMPLETED,
                    notes=f'Pendapatan Gambar dari {user.username}'
                )
                
        # Simpan gambar
        from django.core.files.storage import default_storage
        import os
        from uuid import uuid4
        
        ext = os.path.splitext(image_file.name)[1]
        filename = f"chat_images/{uuid4()}{ext}"
        path = default_storage.save(filename, image_file)
        url = request.build_absolute_uri(default_storage.url(path))
        
        return JsonResponse({"url": url})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)
