from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from .models import LiveStream, StreamTicket
from django.utils import timezone

@login_required
def stream_list(request):
    """Menampilkan daftar live stream publik (non-family atau user is in family)."""
    # Ambil stream yang publik
    public_streams = LiveStream.objects.filter(is_family_only=False).order_by("status", "-scheduled_time")
    
    # Ambil stream eksklusif untuk family di mana user menjadi member
    from apps.family.models import FamilyGroup
    user_families = FamilyGroup.objects.filter(members__user=request.user)
    family_streams = LiveStream.objects.filter(is_family_only=True, family_group__in=user_families).order_by("status", "-scheduled_time")
    
    # Gabung
    all_streams = (public_streams | family_streams).distinct().order_by("status", "-scheduled_time")
    
    context = {
        "streams": all_streams,
    }
    
    wants_json = "application/json" in request.headers.get("Accept", "") or request.GET.get("format") == "json"
    if wants_json:
        from django.http import JsonResponse
        data = []
        for s in all_streams:
            host_profile_data = None
            if hasattr(s.host, "creator_profile") and s.host.creator_profile:
                profile = s.host.creator_profile
                host_profile_data = {
                    "display_name": profile.display_name,
                    "avatar": profile.avatar.url if profile.avatar else None,
                }
            data.append({
                "id": str(s.id),
                "host": s.host.username,
                "host_name": host_profile_data["display_name"] if host_profile_data else s.host.get_full_name() or s.host.username,
                "host_avatar_color": "bg-rose-500",
                "title": s.title,
                "description": s.description,
                "scheduled_time": s.scheduled_time.isoformat() if s.scheduled_time else None,
                "ticket_price_usd": float(s.ticket_price_usd),
                "is_family_only": s.is_family_only,
                "status": s.status,
                "viewer_count": s.viewers_count,
                "created_at": s.created_at.isoformat(),
                "duration": "00:00:00"
            })
        return JsonResponse({"results": data})

    return render(request, "streaming/list.html", context)

@login_required
def stream_detail(request, slot_id):
    """Menampilkan detail stream dan memproses pembelian tiket jika ada."""
    stream = get_object_or_404(LiveStream, id=slot_id)
    
    has_ticket = False
    if stream.ticket_price_usd == 0 or stream.host == request.user:
        has_ticket = True
    else:
        has_ticket = StreamTicket.objects.filter(stream=stream, user=request.user).exists()
        
    wants_json = "application/json" in request.headers.get("Accept", "")
    
    if request.method == "POST" and not has_ticket:
        from django.db import transaction
        
        with transaction.atomic():
            # Proses pembelian tiket (Gunakan select_for_update untuk mencegah Race Condition)
            user = request.user.__class__.objects.select_for_update().get(id=request.user.id)
            price = stream.ticket_price_usd
            if user.balance_usd >= price:
                user.balance_usd -= price
                user.save()
                
                # Beri pendapatan ke Host (revenue sharing sederhana)
                host = stream.host.__class__.objects.select_for_update().get(id=stream.host.id)
                host.balance_usd += price
                host.save()
                
                # Catat tiket
                StreamTicket.objects.create(stream=stream, user=user, price_paid=price)
                
                # Catat Ledger Wallet
                from apps.payments.models import WalletTransaction
                WalletTransaction.objects.create(
                    user=user, transaction_type=WalletTransaction.TransactionType.TICKET_PURCHASE,
                    amount=price, currency="USD", status=WalletTransaction.Status.COMPLETED,
                    notes=f"Tiket Stream: {stream.title}"
                )
                WalletTransaction.objects.create(
                    user=host, transaction_type=WalletTransaction.TransactionType.EARNING,
                    amount=price, currency="USD", status=WalletTransaction.Status.COMPLETED,
                    notes=f"Penjualan Tiket: {stream.title} ke @{user.username}"
                )
                
                if wants_json:
                    from django.http import JsonResponse
                    return JsonResponse({"status": "success", "message": "Tiket berhasil dibeli! Anda sekarang memiliki akses.", "has_ticket": True})
                
                messages.success(request, "Tiket berhasil dibeli! Anda sekarang memiliki akses.")
                has_ticket = True
            else:
                if wants_json:
                    from django.http import JsonResponse
                    return JsonResponse({"status": "error", "message": "Saldo USD Anda tidak mencukupi untuk membeli tiket ini."}, status=402)
                
                messages.error(request, "Saldo USD Anda tidak mencukupi untuk membeli tiket ini.")
            
    context = {
        "stream": stream,
        "has_ticket": has_ticket
    }
    
    if wants_json:
        from django.http import JsonResponse
        return JsonResponse({
            "id": str(stream.id),
            "host": stream.host.username,
            "title": stream.title,
            "description": stream.description,
            "scheduled_time": stream.scheduled_time.isoformat() if stream.scheduled_time else None,
            "ticket_price_usd": float(stream.ticket_price_usd),
            "is_family_only": stream.is_family_only,
            "status": stream.status,
            "viewer_count": stream.viewers_count,
            "has_ticket": has_ticket
        })

    return render(request, "streaming/detail.html", context)

@login_required
def stream_watch(request, stream_id):
    """Halaman player stream dan chat interaktif."""
    stream = get_object_or_404(LiveStream, id=stream_id)
    
    # Verifikasi akses
    has_access = False
    if stream.ticket_price_usd == 0 or stream.host == request.user:
        has_access = True
    else:
        has_access = StreamTicket.objects.filter(stream=stream, user=request.user).exists()
        
    if not has_access:
        messages.error(request, "Anda harus memiliki tiket untuk menonton stream ini.")
        return redirect("streaming:stream_detail", slot_id=stream.id)

    # Generate Video SDK Token
    # Ini untuk Video SDK (token statis dari .env, atau disesuaikan di server-side jika ada API Secret)
    from django.conf import settings
    
    # Karena kita sudah menggunakan JWT dari Video SDK
    signed_token = getattr(settings, 'VIDEOSDK_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiJkY2M2NDRjNS01MWNhLTQ1ZWEtOGI2MC03MzdmYzYxODJlZWMiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc4MjEwNTI4NSwiZXhwIjoxOTM5ODkzMjg1fQ.aXaq8vdQnU2SeWyvOwPluWRaxwR1bhd5D25B_W7Oa6M')


    context = {
        "stream": stream,
        "is_host": stream.host == request.user,
        "signed_token": signed_token,
        "viewer_ip": request.META.get('HTTP_CF_CONNECTING_IP', request.META.get('REMOTE_ADDR', '127.0.0.1'))
    }
    
    wants_json = "application/json" in request.headers.get("Accept", "")
    if wants_json:
        from django.http import JsonResponse
        return JsonResponse({
            "stream": {
                "id": str(stream.id),
                "host": stream.host.username,
                "title": stream.title,
                "status": stream.status,
                "viewer_count": stream.viewers_count,
                "stream_key": stream.stream_key,
            },
            "is_host": stream.host == request.user,
            "signed_token": signed_token,
            "viewer_ip": context["viewer_ip"]
        })

    return render(request, "streaming/watch.html", context)


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

class OMEAdmissionWebhookView(APIView):
    """
    POST /api/v1/streaming/webhook/admission/
    Webhook dari OvenMediaEngine untuk memvalidasi Publisher (RTMP/WebRTC)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import base64
        import hmac
        import hashlib
        from django.conf import settings
        
        # 1. Verifikasi Signature OME (X-OME-Signature)
        secret = getattr(settings, 'OME_WEBHOOK_SECRET', '')
        signature_header = request.headers.get('X-OME-Signature')
        if secret and signature_header:
            expected_hmac = hmac.new(secret.encode(), request.body, hashlib.sha1).digest()
            expected_b64 = base64.b64encode(expected_hmac).decode()
            if not hmac.compare_digest(expected_b64, signature_header):
                return Response({"allowed": False, "reason": "Invalid signature"}, status=403)

        payload = request.data.get("request", {})
        direction = payload.get("direction")
        stream_name = payload.get("streamName")
        
        # 2. Incoming = Publisher RTMP/WebRTC
        if direction == "incoming":
            if not stream_name:
                return Response({"allowed": False, "reason": "No stream name"}, status=403)
                
            try:
                stream = LiveStream.objects.get(stream_key=stream_name, is_deleted=False)
                if stream.status == LiveStream.Status.ENDED:
                    return Response({"allowed": False, "reason": "Stream ended"}, status=403)
                
                return Response({"allowed": True}, status=200)
            except LiveStream.DoesNotExist:
                return Response({"allowed": False, "reason": "Invalid stream key"}, status=403)
                
        # 3. Outgoing = Player/Viewer (hanya allow jika stream publik atau via SignedToken)
        elif direction == "outgoing":
            # Jika menggunakan SignedToken OME, token divalidasi oleh OME secara internal.
            # Namun kita tetap verifikasi apakah stream exist.
            try:
                stream = LiveStream.objects.get(stream_key=stream_name, is_deleted=False)
                return Response({"allowed": True}, status=200)
            except LiveStream.DoesNotExist:
                return Response({"allowed": False, "reason": "Stream not found"}, status=404)

        return Response({"allowed": False, "reason": "Unknown direction"}, status=400)

class EndLiveStreamAPIView(APIView):
    """POST /api/v1/streaming/<id>/end/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, stream_id):
        stream = get_object_or_404(LiveStream, id=stream_id, is_deleted=False)
        
        if stream.host != request.user:
            return Response({"error": "Only host can end the stream"}, status=403)
            
        if stream.status == LiveStream.Status.ENDED:
            return Response({"error": "Stream already ended"}, status=400)
            
        stream.status = LiveStream.Status.ENDED
        stream.save()
        
        # 1. Create Post (Auto-Archiving Video to Feed)
        from apps.content.models import Post
        mock_vod_url = f"https://videosdk.live/vod/archives/{stream.stream_key}.mp4"
        post = Post.objects.create(
            creator=stream.host,
            content_type=Post.ContentType.VIDEO,
            title=f"VOD: {stream.title}",
            body=stream.description or f"Siaran ulang (VOD) dari {stream.title}",
            media_url=mock_vod_url,
            is_published=True
        )
        
        # 2. Publish stream_ended event to Redis to redirect viewers
        from common.redis_pubsub import publish_event
        publish_event(
            channel=f"notification:room:{stream.host.username}",
            event_type="stream_ended",
            data={
                "message": "Stream has ended",
                "post_id": str(post.id)
            }
        )
        
        return Response({"message": "Stream ended and VOD generated", "post_id": str(post.id)}, status=200)
