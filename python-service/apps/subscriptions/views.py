"""
Subscription views.
"""

from datetime import timedelta

from django.db import models
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCreator
from common.redis_pubsub import publish_event

from .models import Subscription, SubscriptionTier
from .serializers import (
    SubscribeSerializer,
    SubscriptionSerializer,
    SubscriptionTierSerializer,
)


class TierListView(generics.ListAPIView):
    """GET /api/v1/subscriptions/tiers/?creator={username}"""

    serializer_class = SubscriptionTierSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):  # type: ignore
        qs = SubscriptionTier.objects.filter(is_active=True)
        creator_username = self.request.query_params.get("creator")  # type: ignore
        if creator_username:
            qs = qs.filter(creator__username=creator_username)
        return qs.select_related("creator")


class TierCreateView(generics.CreateAPIView):
    """POST /api/v1/subscriptions/tiers/ — Create tier (creators only)."""

    serializer_class = SubscriptionTierSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class SubscribeView(APIView):
    """POST /api/v1/subscriptions/subscribe/ — Subscribe to a tier."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tier_id = serializer.validated_data["tier_id"]  # type: ignore
        auto_renew = serializer.validated_data["auto_renew"]  # type: ignore

        try:
            tier = SubscriptionTier.objects.select_related("creator").get(
                id=tier_id, is_active=True
            )
        except SubscriptionTier.DoesNotExist:
            return Response(
                {"detail": "Subscription tier not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Don't subscribe to own tiers
        if tier.creator == request.user:
            return Response(
                {"detail": "Cannot subscribe to your own tier."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for existing active subscription
        existing = Subscription.objects.filter(
            subscriber=request.user,
            tier__creator=tier.creator,
            status=Subscription.Status.ACTIVE,
            expires_at__gt=timezone.now(),
        ).first()

        if existing:
            return Response(
                {"detail": "Already subscribed to this creator."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create subscription (mock payment — activate immediately)
        now = timezone.now()
        subscription = Subscription.objects.create(
            subscriber=request.user,
            tier=tier,
            status=Subscription.Status.ACTIVE,
            starts_at=now,
            expires_at=now + timedelta(days=tier.duration_days),
            auto_renew=auto_renew,
        )

        # Update subscriber count
        from apps.accounts.models import CreatorProfile
        CreatorProfile.objects.filter(user=tier.creator).update(
            subscriber_count=models.F("subscriber_count") + 1
        )

        # Notify creator via Redis PubSub
        publish_event(
            channel=f"notification:{tier.creator.id}",
            event_type="new_subscription",
            data={
                "subscriber_id": str(request.user.id),
                "subscriber_username": request.user.username,
                "tier_name": tier.name,
            },
        )

        return Response(
            SubscriptionSerializer(subscription).data,
            status=status.HTTP_201_CREATED,
        )


class MySubscriptionsView(generics.ListAPIView):
    """GET /api/v1/subscriptions/my/ — My active subscriptions."""

    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore
        return Subscription.objects.filter(
            subscriber=self.request.user,
        ).select_related("tier", "tier__creator", "subscriber")


class CancelSubscriptionView(APIView):
    """DELETE /api/v1/subscriptions/{id}/cancel/ — Cancel subscription."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, id):
        try:
            subscription = Subscription.objects.get(
                id=id, subscriber=request.user
            )
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "Subscription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        subscription.status = Subscription.Status.CANCELLED
        subscription.auto_renew = False
        subscription.save(update_fields=["status", "auto_renew", "updated_at"])

        return Response(
            {"detail": "Subscription cancelled.", "id": str(subscription.id)},
            status=status.HTTP_200_OK,
        )

from .services import CreatorValuationService
from .models import CreatorShare

class HostValuationAPIView(APIView):
    """GET /api/v1/subscriptions/valuation/<username>/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        from apps.accounts.models import User
        try:
            host = User.objects.get(username=username, role='host')
        except User.DoesNotExist:
            return Response({"error": "Host not found"}, status=404)
            
        valuation = CreatorValuationService.calculate_valuation(host)
        price_per_share = CreatorValuationService.get_share_price(host)
        
        # Hitung saham yang sudah beredar
        from django.db.models import Sum
        issued_shares = CreatorShare.objects.filter(creator=host).aggregate(total=Sum('shares_count'))['total'] or 0
        available_shares = CreatorValuationService.TOTAL_SHARES_CAP - issued_shares
        
        return Response({
            "host_username": host.username,
            "total_valuation_idr": str(valuation),
            "share_price_idr": str(price_per_share),
            "max_shares": CreatorValuationService.TOTAL_SHARES_CAP,
            "issued_shares": issued_shares,
            "available_shares": available_shares
        })

class BuyCreatorShareAPIView(APIView):
    """POST /api/v1/subscriptions/shares/buy/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.db import transaction
        from apps.accounts.models import User
        host_username = request.data.get("host_username")
        shares_to_buy = int(request.data.get("shares_count", 0))
        
        if not host_username or shares_to_buy <= 0:
            return Response({"error": "host_username and valid shares_count required"}, status=400)
            
        try:
            host = User.objects.get(username=host_username, role='host')
        except User.DoesNotExist:
            return Response({"error": "Host not found"}, status=404)
            
        if request.user == host:
            return Response({"error": "You cannot buy your own shares"}, status=400)
            
        with transaction.atomic():
            from django.db.models import Sum
            issued_shares = CreatorShare.objects.filter(creator=host).aggregate(total=Sum('shares_count'))['total'] or 0
            available_shares = CreatorValuationService.TOTAL_SHARES_CAP - issued_shares
            
            if shares_to_buy > available_shares:
                return Response({"error": f"Not enough shares available. Only {available_shares} left."}, status=400)
                
            share_price = CreatorValuationService.get_share_price(host)
            total_cost = share_price * shares_to_buy
            
            from typing import cast
            user = cast(User, request.user)
            if user.balance_idr < total_cost:
                return Response({"error": f"Saldo IDR tidak cukup. Butuh {total_cost}"}, status=400)
                
            # Potong Saldo
            user.balance_idr -= total_cost
            user.save()
            
            # Transfer ke Host sebagai Earning 100% atau dipotong platform?
            # Karena ini saham, 100% dana pembelian saham masuk ke modal pengembangan Host
            host.balance_idr += total_cost
            host.save()
            
            from apps.payments.models import WalletTransaction
            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION, # Outgoing investment
                amount=total_cost,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes=f"Buy {shares_to_buy} shares of {host.username}"
            )
            WalletTransaction.objects.create(
                user=host,
                transaction_type=WalletTransaction.TransactionType.EARNING,
                amount=total_cost,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes=f"Sold {shares_to_buy} shares to {user.username}"
            )
            
            # Buat/Update kepemilikan saham
            share_record, created = CreatorShare.objects.get_or_create(
                investor=user,
                creator=host,
                defaults={'shares_count': shares_to_buy}
            )
            if not created:
                share_record.shares_count += shares_to_buy
                share_record.save()
                
        return Response({
            "message": f"Successfully bought {shares_to_buy} shares of {host.username}",
            "total_cost_idr": str(total_cost),
            "your_total_shares": share_record.shares_count
        }, status=200)
