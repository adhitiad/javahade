from django.urls import path
from .views import (
    TierListView, TierCreateView,
    SubscribeView, MySubscriptionsView,
    CancelSubscriptionView, HostValuationAPIView, BuyCreatorShareAPIView
)

urlpatterns = [
    path("tiers/", TierListView.as_view(), name="tier-list"),
    path("tiers/create/", TierCreateView.as_view(), name="tier-create"),
    path("subscribe/", SubscribeView.as_view(), name="subscribe"),
    path("my/", MySubscriptionsView.as_view(), name="my-subscriptions"),
    path("<uuid:id>/cancel/", CancelSubscriptionView.as_view(), name="cancel-subscription"),
    path("valuation/<str:username>/", HostValuationAPIView.as_view(), name="host-valuation"),
    path("shares/buy/", BuyCreatorShareAPIView.as_view(), name="buy-shares"),
]
