"""Payment views."""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

# pyrefly: ignore [missing-import]
from apps.accounts.models import User
# pyrefly: ignore [missing-import]
from apps.accounts.permissions import IsCreator
from .models import PaymentIntent, Payout
from .providers import get_payment_provider
from .serializers import (
    CreatePaymentSerializer,
    CreatePayoutSerializer,
    PaymentIntentSerializer,
    PayoutSerializer,
)



class CreatePaymentView(APIView):
    """POST /api/v1/payments/intent/ — Create a payment intent."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check Idempotency Key
        idempotency_key = request.headers.get("Idempotency-Key")
        if idempotency_key:
            from django.core.cache import cache
            cache_key = f"idemp_pay_{request.user.id}_{idempotency_key}"
            if cache.get(cache_key):
                return Response(
                    {"detail": "Idempotent request: Payment already processing or completed."},
                    status=status.HTTP_409_CONFLICT
                )
            cache.set(cache_key, "processing", timeout=60*5)

        from typing import cast
        data = cast(dict, serializer.validated_data)
        from django.conf import settings
        provider_name = getattr(settings, "DEFAULT_PAYMENT_PROVIDER", "stripe")
        provider = get_payment_provider(provider_name)
        result = provider.create_payment(
            amount=float(data["amount"]),
            currency=data["currency"],
            metadata=data.get("metadata", {}),
        )

        if result.success:
            recipient = None
            if data.get("recipient_id"):
                try:
                    recipient = User.objects.get(id=data["recipient_id"])
                except User.DoesNotExist:
                    pass

            payment = PaymentIntent.objects.create(
                user=request.user,
                recipient=recipient,
                amount=data["amount"],
                currency=data["currency"],
                payment_type=data["payment_type"],
                status=PaymentIntent.Status.COMPLETED,
                provider=provider_name,
                provider_ref=result.provider_ref,
                metadata=data.get("metadata", {}),
            )
            return Response(
                PaymentIntentSerializer(payment).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {"detail": result.error_message or "Payment failed."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class PaymentHistoryView(generics.ListAPIView):
    """GET /api/v1/payments/history/ — Payment history."""

    serializer_class = PaymentIntentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self): # type: ignore
        return PaymentIntent.objects.filter(user=self.request.user)


class EarningsView(APIView):
    """GET /api/v1/payments/earnings/ — Creator earnings summary."""

    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def get(self, request):
        profile = request.user.creator_profile
        return Response({
            "earnings_balance": str(profile.earnings_balance),
            "total_earnings": str(profile.total_earnings),
            "currency": "USD",
        })


class RequestPayoutView(APIView):
    """POST /api/v1/payments/payout/ — Request payout."""

    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def post(self, request):
        serializer = CreatePayoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = request.user.creator_profile
        from typing import cast
        data = cast(dict, serializer.validated_data)
        amount = data["amount"]

        if amount > profile.earnings_balance:
            return Response(
                {"detail": "Insufficient balance."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payout = Payout.objects.create(
            creator=request.user,
            amount=amount,
            method=data["method"],
            bank_details=data.get("bank_details", {}),
        )

        return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED)


class WebhookView(APIView):
    """POST /api/v1/payments/webhook/ — Payment provider webhook."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Mock webhook handler — in production, verify signature
        return Response({"received": True})

from .paypal_service import PayPalService

class PayPalCreateOrderView(APIView):
    """POST /api/v1/payments/paypal/create-order/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = request.data.get("amount")
        if not amount:
            return Response({"error": "amount is required"}, status=400)
            
        paypal = PayPalService()
        order = paypal.create_order(amount)
        if order and "id" in order:
            return Response({"id": order["id"]}, status=200)
        return Response({"error": "Failed to create PayPal order"}, status=500)

class PayPalCaptureOrderView(APIView):
    """POST /api/v1/payments/paypal/capture-order/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("orderID")
        amount_str = request.data.get("amount")
        currency = request.data.get("currency", "USD")
        
        if not order_id or not amount_str:
            return Response({"error": "orderID and amount are required"}, status=400)

        paypal = PayPalService()
        capture = paypal.capture_order(order_id)
        if capture and capture.get("status") == "COMPLETED":
            try:
                # Override client input with ACTUAL PayPal capture data if available
                captures_arr = capture.get("purchase_units", [{}])[0].get("payments", {}).get("captures", [{}])
                if captures_arr and captures_arr[0].get("amount"):
                    actual_amt = captures_arr[0]["amount"]
                    if actual_amt.get("value"): amount_str = actual_amt["value"]
                    if actual_amt.get("currency_code"): currency = actual_amt["currency_code"]
                
                from django.db import transaction
                from decimal import Decimal
                amount = Decimal(amount_str)
                
                with transaction.atomic():
                    # ROW LEVEL LOCKING untuk mencegah Race Condition Top-Up
                    user = User.objects.select_for_update().get(id=request.user.id)
                    
                    # Cek idempotency: Pastikan Order ID ini belum pernah di-topup
                    from apps.payments.models import WalletTransaction
                    if WalletTransaction.objects.filter(reference_id=order_id).exists():
                        return Response({"error": "Order already processed"}, status=400)
                    
                    # Update Balance
                    if currency == "USD": user.balance_usd += amount
                    elif currency == "SGD": user.balance_sgd += amount
                    elif currency == "IDR": user.balance_idr += amount
                    elif currency == "MYR": user.balance_myr += amount
                    elif currency == "CNY": user.balance_cny += amount
                    user.save()
                    
                    WalletTransaction.objects.create(
                        user=user,
                        transaction_type=WalletTransaction.TransactionType.DEPOSIT,
                        amount=amount,
                        currency=currency,
                        status=WalletTransaction.Status.COMPLETED,
                        reference_id=order_id,
                        notes=f"Top-Up via PayPal (Order: {order_id})"
                    )
                
                return Response({"status": "COMPLETED"}, status=200)
            except Exception as e:
                return Response({"error": str(e)}, status=500)
                
        return Response({"error": "Failed to capture PayPal order"}, status=400)

from .crypto_verify import CryptoVerificationService

class VerifyCryptoTransactionView(APIView):
    """POST /api/v1/payments/verify-crypto/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        txid = request.data.get('txid')
        network = request.data.get('network')
        if not txid or not network:
            return Response({'error': 'txid and network required'}, status=400)
            
        txid = txid.strip()
        network = network.strip().lower()
        
        service = CryptoVerificationService()
        if network in ['usdt', 'trc20']:
            result = service.verify_usdt_trc20(txid)
        elif network in ['bnb', 'bep20']:
            result = service.verify_bnb_bep20(txid)
        else:
            return Response({'error': 'Unsupported network'}, status=400)
            
        if result.get('valid'):
            from django.db import transaction
            from decimal import Decimal
            from apps.payments.models import WalletTransaction
            
            with transaction.atomic():
                user = User.objects.select_for_update().get(id=request.user.id)
                
                # Idempotency check
                if WalletTransaction.objects.filter(reference_id=txid).exists():
                    return Response({'error': 'Transaction already processed'}, status=400)
                    
                amount = Decimal(result.get('amount', 0))
                currency = result.get('currency', 'USD')
                
                if currency == "USDT":
                    user.balance_usd += amount
                    currency_record = "USD"
                elif currency == "BNB":
                    # Assume 1 BNB = $300 for simplification if not converted beforehand
                    user.balance_usd += amount * Decimal("300")
                    currency_record = "USD"
                else:
                    currency_record = "USD"
                    user.balance_usd += amount
                    
                user.save()
                
                WalletTransaction.objects.create(
                    user=user,
                    transaction_type=WalletTransaction.TransactionType.DEPOSIT,
                    amount=amount,
                    currency=currency_record,
                    status=WalletTransaction.Status.COMPLETED,
                    reference_id=txid,
                    notes=f"Crypto Deposit via {network.upper()} (TXID: {txid})"
                )
            return Response(result, status=200)
        else:
            return Response(result, status=400)

from .models import VirtualGift, GiftTransaction

class VirtualGiftListAPIView(APIView):
    """GET /api/v1/payments/gifts/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        gifts = VirtualGift.objects.filter(is_active=True)
        if not gifts.exists():
            from decimal import Decimal
            VirtualGift.objects.create(name="Mawar", icon="🌹", price_idr=Decimal("10000.00"))
            VirtualGift.objects.create(name="Kopi", icon="☕", price_idr=Decimal("25000.00"))
            VirtualGift.objects.create(name="Mahkota", icon="👑", price_idr=Decimal("50000.00"))
            VirtualGift.objects.create(name="Mobil Sport", icon="🏎️", price_idr=Decimal("250000.00"))
            VirtualGift.objects.create(name="Jet Pribadi", icon="✈️", price_idr=Decimal("1000000.00"))
            gifts = VirtualGift.objects.filter(is_active=True)
            
        data = [
            {"id": str(g.id), "name": g.name, "icon": g.icon, "price_idr": str(g.price_idr)}
            for g in gifts
        ]
        return Response(data)

class SendGiftAPIView(APIView):
    """POST /api/v1/payments/gifts/send/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.db import transaction
        from typing import cast
        user = cast(User, request.user)
        gift_id = request.data.get('gift_id')
        receiver_username = request.data.get('receiver_username')
        context = request.data.get('context', 'profile')
        room_id = request.data.get('room_id') # For targeted streaming room broadcast
        
        if not gift_id or not receiver_username:
            return Response({"error": "gift_id and receiver_username required"}, status=400)
            
        with transaction.atomic():
            try:
                gift = VirtualGift.objects.get(id=gift_id, is_active=True)
                # Row-Level Locking untuk Sender dan Receiver
                user = User.objects.select_for_update().get(id=request.user.id)
                receiver = User.objects.select_for_update().get(username=receiver_username)
            except (VirtualGift.DoesNotExist, User.DoesNotExist):
                return Response({"error": "Invalid gift or receiver"}, status=400)
                
            if user == receiver:
                return Response({"error": "You cannot send a gift to yourself"}, status=400)
            is_anonymous = request.data.get('is_anonymous', False)
            special_animation = request.data.get('special_animation', False)
            
            from decimal import Decimal
            extra_fee = Decimal("0.00")
            if is_anonymous: extra_fee += Decimal("7500.00")
            if special_animation: extra_fee += Decimal("15000.00")
            
            price = gift.price_idr
            total_charge = price + extra_fee
            
            from django.db.models import F
            updated = User.objects.filter(
                id=user.id,
                balance_idr__gte=total_charge
            ).update(balance_idr=F('balance_idr') - total_charge)
            
            if updated == 0:
                return Response({"error": f"Saldo IDR tidak cukup. Butuh {total_charge}"}, status=400)
                
            platform_fee = price * Decimal("0.30")
            
            from apps.subscriptions.models import CreatorShare
            dividend_pool = price * Decimal("0.01") # 1% for shareholders
            shares = CreatorShare.objects.filter(creator=receiver)
            total_shares_issued = sum(share.shares_count for share in shares)
            
            from apps.payments.models import WalletTransaction
            
            if total_shares_issued > 0:
                dividend_per_share = dividend_pool / Decimal(str(total_shares_issued))
                for share in shares:
                    user_dividend = dividend_per_share * Decimal(str(share.shares_count))
                    User.objects.filter(id=share.investor.id).update(balance_idr=F('balance_idr') + user_dividend)
                    CreatorShare.objects.filter(id=share.id).update(total_dividends_earned=F('total_dividends_earned') + user_dividend)
                    
                    WalletTransaction.objects.create(
                        user=share.investor,
                        transaction_type=WalletTransaction.TransactionType.EARNING,
                        amount=user_dividend,
                        currency="IDR",
                        status=WalletTransaction.Status.COMPLETED,
                        notes=f"Dividend from {receiver.username} ({share.shares_count} shares)"
                    )
                net_host = price - platform_fee - dividend_pool
            else:
                dividend_pool = Decimal("0.00")
                net_host = price - platform_fee
            
            # Saldo sender sudah dipotong via Atomic Update
            
            User.objects.filter(id=receiver.id).update(balance_idr=F('balance_idr') + net_host)
            
            

            # Catat pembayaran fitur premium
            if extra_fee > 0:
                WalletTransaction.objects.create(
                    user=user,
                    transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
                    amount=extra_fee,
                    currency="IDR",
                    status=WalletTransaction.Status.COMPLETED,
                    notes=f"Premium Gifting Features (Anonymous/Animation)"
                )
                
            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION,
                amount=price,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes=f"Send gift {gift.name} to {getattr(receiver, 'username', '')}"
            )
            
            sender_name = "Anonymous Fan" if is_anonymous else getattr(user, 'username', '')
            WalletTransaction.objects.create(
                user=receiver,
                transaction_type=WalletTransaction.TransactionType.EARNING,
                amount=net_host,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes=f"Received gift {gift.name} from {sender_name}"
            )
            
            gt = GiftTransaction.objects.create(
                sender=user,
                receiver=receiver,
                gift=gift,
                amount_idr=price,
                platform_fee_idr=platform_fee + extra_fee, # All extra fee goes to platform
                net_host_amount_idr=net_host,
                context=context
            )
            
            # -------------------------------------------------------------
            # SECURE GIFTING ARCHITECTURE: Publish to Redis instead of letting 
            # the client send websocket broadcast directly.
            # -------------------------------------------------------------
            if room_id:
                from common.redis_pubsub import publish_event
                publish_event(
                    channel=f"notification:room:{room_id}",
                    event_type="gift",
                    data={
                        "sender_id": str(user.id),
                        "username": sender_name,
                        "gift_type": gift.name,
                        "amount": float(price),
                        "animation": gift.icon,
                        "room_id": room_id
                    }
                )
            # -------------------------------------------------------------
            
        return Response({"message": "Gift sent successfully!", "new_balance": str(user.balance_idr)}, status=200)

from .services import ExchangeRateService

class ExchangeRatesAPIView(APIView):
    """GET /api/v1/payments/exchange-rates/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        rates = ExchangeRateService.get_rates()
        return Response({"base": "USD", "rates": rates})

from .models import StreamBounty

class CreateStreamBountyAPIView(APIView):
    """POST /api/v1/payments/bounties/create/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.db import transaction
        host_username = request.data.get('host_username')
        task_description = request.data.get('task_description')
        amount = request.data.get('amount')
        room_id = request.data.get('room_id', host_username)
        
        if not host_username or not task_description or not amount:
            return Response({"error": "host_username, task_description, and amount required"}, status=400)
            
        try:
            from decimal import Decimal
            amount_idr = Decimal(str(amount))
            if amount_idr <= 0:
                raise ValueError("Amount must be positive")
        except:
            return Response({"error": "Invalid amount"}, status=400)
            
        try:
            host = User.objects.get(username=host_username, role='host')
        except User.DoesNotExist:
            return Response({"error": "Host not found"}, status=404)
            
        with transaction.atomic():
            from typing import cast
            user = cast(User, request.user)
            # lock user to prevent race condition
            user = User.objects.select_for_update().get(id=user.id)
            if user.balance_idr < amount_idr:
                return Response({"error": "Saldo IDR tidak cukup untuk bounty ini"}, status=400)
                
            # Escrow: deduct from user
            user.balance_idr -= amount_idr
            user.save()
            
            bounty = StreamBounty.objects.create(
                host=host,
                challenger=user,
                task_description=task_description,
                amount_idr=amount_idr,
                status=StreamBounty.Status.PENDING
            )
            
            from apps.payments.models import WalletTransaction
            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION, # using this for escrow deduct
                amount=amount_idr,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                reference_id=str(bounty.id),
                notes=f"Escrow for Bounty to {host.username}"
            )
            
            from common.redis_pubsub import publish_event
            publish_event(
                channel=f"notification:room:{room_id}",
                event_type="bounty",
                data={
                    "action": "created",
                    "bounty_id": str(bounty.id),
                    "challenger": user.username,
                    "host": host.username,
                    "amount": float(bounty.amount_idr),
                    "task_description": bounty.task_description
                }
            )
            
        return Response({"message": "Bounty created and escrowed", "bounty_id": str(bounty.id)}, status=201)

class HostActionStreamBountyAPIView(APIView):
    """POST /api/v1/payments/bounties/<id>/action/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, bounty_id):
        from django.db import transaction
        action = request.data.get("action")
        if action not in ["accept", "complete", "reject"]:
            return Response({"error": "Invalid action. Use accept, complete, or reject"}, status=400)
            
        try:
            bounty = StreamBounty.objects.get(id=bounty_id)
        except StreamBounty.DoesNotExist:
            return Response({"error": "Bounty not found"}, status=404)
            
        with transaction.atomic():
            if action in ["accept", "reject"]:
                if bounty.host != request.user:
                    return Response({"error": "Hanya host yang bisa menerima/menolak bounty"}, status=403)
                
                if action == "accept" and bounty.status == StreamBounty.Status.PENDING:
                    bounty.status = StreamBounty.Status.ACCEPTED
                    bounty.save()
                elif action == "reject" and bounty.status == StreamBounty.Status.PENDING:
                    bounty.status = StreamBounty.Status.REJECTED
                    bounty.save()
                    # Refund challenger
                    challenger = User.objects.select_for_update().get(id=bounty.challenger.id)
                    challenger.balance_idr += bounty.amount_idr
                    challenger.save()
                    from apps.payments.models import WalletTransaction
                    WalletTransaction.objects.create(
                        user=challenger,
                        transaction_type=WalletTransaction.TransactionType.REFUND,
                        amount=bounty.amount_idr,
                        currency="IDR",
                        status=WalletTransaction.Status.COMPLETED,
                        reference_id=str(bounty.id),
                        notes=f"Refund: Bounty rejected by {bounty.host.username}"
                    )
                else:
                    return Response({"error": f"Cannot perform {action} from status {bounty.status}"}, status=400)
                    
            elif action == "complete":
                if bounty.challenger != request.user:
                    return Response({"error": "Hanya challenger pembuat bounty yang bisa menyelesaikan tantangan ini"}, status=403)
                    
                if bounty.status == StreamBounty.Status.ACCEPTED:
                    bounty.status = StreamBounty.Status.COMPLETED
                    bounty.save()
                    
                    # Apply 20% platform fee
                    from decimal import Decimal
                    platform_fee = bounty.amount_idr * Decimal("0.20")
                    net_host = bounty.amount_idr - platform_fee
                    
                    host = User.objects.select_for_update().get(id=bounty.host.id)
                    host.balance_idr += net_host
                    host.save()
                    from apps.payments.models import WalletTransaction
                    WalletTransaction.objects.create(
                        user=host,
                        transaction_type=WalletTransaction.TransactionType.EARNING,
                        amount=net_host,
                        currency="IDR",
                        status=WalletTransaction.Status.COMPLETED,
                        reference_id=str(bounty.id),
                        notes=f"Earning from completed bounty by {bounty.challenger.username}"
                    )
                else:
                    return Response({"error": f"Cannot perform complete from status {bounty.status}"}, status=400)
                
            room_id = request.data.get("room_id", bounty.host.username)
            from common.redis_pubsub import publish_event
            publish_event(
                channel=f"notification:room:{room_id}",
                event_type="bounty",
                data={
                    "action": action,
                    "bounty_id": str(bounty.id),
                    "host": bounty.host.username,
                    "challenger": bounty.challenger.username,
                    "amount": float(bounty.amount_idr)
                }
            )
                
        return Response({"message": f"Bounty marked as {action}", "status": bounty.status}, status=200)

class AnalyticsDashboardAPIView(APIView):
    """GET /api/v1/payments/analytics/dashboard/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDate
        from django.utils import timezone
        import datetime
        from .models import WalletTransaction, GiftTransaction, StreamBounty
        
        user = request.user
        if user.role != 'host':
            return Response({"error": "Hanya host yang dapat melihat dashboard analitik"}, status=403)
            
        seven_days_ago = timezone.now() - datetime.timedelta(days=7)
        
        # 1. Earnings Chart Data
        earnings = WalletTransaction.objects.filter(
            user=user, 
            transaction_type__in=[WalletTransaction.TransactionType.EARNING, WalletTransaction.TransactionType.DEPOSIT],
            status=WalletTransaction.Status.COMPLETED,
            created_at__gte=seven_days_ago
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Sum('amount')
        ).order_by('date')
        
        earnings_chart = [{"date": e['date'].isoformat(), "total": float(e['total'])} for e in earnings]
        
        # 2. Gifts Breakdown
        gifts = GiftTransaction.objects.filter(
            receiver=user,
            created_at__gte=seven_days_ago
        ).values('gift__name', 'gift__icon').annotate(
            total_net_idr=Sum('net_host_amount_idr'),
            count=Count('id')
        ).order_by('-total_net_idr')
        
        gift_breakdown = [
            {
                "name": g['gift__name'] or "Unknown",
                "icon": g['gift__icon'] or "",
                "total_idr": float(g['total_net_idr'] or 0),
                "count": g['count']
            } for g in gifts
        ]
        
        # 3. Bounty Stats
        bounties = StreamBounty.objects.filter(host=user)
        total_bounties = bounties.count()
        completed_bounties = bounties.filter(status=StreamBounty.Status.COMPLETED).count()
        bounty_earnings = bounties.filter(status=StreamBounty.Status.COMPLETED).aggregate(total=Sum('amount_idr'))['total'] or 0
        
        return Response({
            "overview": {
                "balance_usd": float(user.balance_usd),
                "balance_idr": float(user.balance_idr)
            },
            "earnings_chart": earnings_chart,
            "gift_breakdown": gift_breakdown,
            "bounty_stats": {
                "total": total_bounties,
                "completed": completed_bounties,
                "earnings_idr": float(bounty_earnings)
            }
        })