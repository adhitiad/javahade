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
        
    if request.method == "POST" and not has_ticket:
        # Proses pembelian tiket
        user = request.user
        price = stream.ticket_price_usd
        if user.balance_usd >= price:
            user.balance_usd -= price
            user.save()
            
            # Beri pendapatan ke Host (revenue sharing sederhana)
            host = stream.host
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
            
            messages.success(request, "Tiket berhasil dibeli! Anda sekarang memiliki akses.")
            has_ticket = True
        else:
            messages.error(request, "Saldo USD Anda tidak mencukupi untuk membeli tiket ini.")
            
    context = {
        "stream": stream,
        "has_ticket": has_ticket
    }
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
        
    context = {
        "stream": stream,
        "is_host": stream.host == request.user
    }
    return render(request, "streaming/watch.html", context)
