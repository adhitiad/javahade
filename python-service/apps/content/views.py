"""
Content views — Posts, Comments, Likes, Stories.
"""

from django.db import models
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCreator, IsOwnerOrReadOnly

from .models import Comment, Like, Post, Story
from .serializers import (
    CommentSerializer,
    PostCreateSerializer,
    PostSerializer,
    StorySerializer,
)


# ─────────────────────────────────────────────
# Post Views
# ─────────────────────────────────────────────


class PostFeedView(generics.ListAPIView):
    """
    GET /api/v1/posts/feed/
    Personalized feed — posts from subscribed creators.
    Falls back to public posts for unauthenticated users.
    """

    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self): # type: ignore
        qs = Post.objects.filter(
            is_published=True,
            scheduled_at__isnull=True,
        ).select_related("creator").prefetch_related("likes", "comments")

        user = self.request.user
        if user.is_authenticated:
            # Get creators the user is subscribed to
            subscribed_creator_ids = user.subscriptions.filter( # type: ignore
                status="active"
            ).values_list("tier__creator__user_id", flat=True).distinct()

            # Show public posts + subscribed creator's premium posts
            qs = qs.filter(
                Q(is_premium=False)
                | Q(creator_id__in=subscribed_creator_ids)
            )
        else:
            qs = qs.filter(is_premium=False)

        return qs


class PostCreateView(generics.CreateAPIView):
    """POST /api/v1/posts/ — Create a new post (creators only)."""

    serializer_class = PostCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/v1/posts/{id}/ — Post detail."""

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    queryset = Post.objects.select_related("creator")
    lookup_field = "id"

    def get_serializer_class(self): # type: ignore
        if self.request.method in ("PUT", "PATCH"):
            return PostCreateSerializer
        return PostSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        from .services import recalculate_quality_score
        recalculate_quality_score(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class PostLikeToggleView(APIView):
    """POST /api/v1/posts/{id}/like/ — Toggle like on a post."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        try:
            post = Post.objects.get(id=id)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        like, created = Like.objects.get_or_create(post=post, user=request.user)

        from django.db.models import F
        if created:
            Post.objects.filter(id=post.id).update(like_count=F('like_count') + 1)
            liked = True
        else:
            if like.is_unlike:
                like.is_unlike = False
                like.save(update_fields=['is_unlike'])
                Post.objects.filter(id=post.id).update(unlike_count=F('unlike_count') - 1, like_count=F('like_count') + 1)
                liked = True
            else:
                like.delete()
                Post.objects.filter(id=post.id).update(like_count=F('like_count') - 1)
                liked = False
                
        post.refresh_from_db()
                
        from .services import recalculate_quality_score
        recalculate_quality_score(post)
        return Response({
            "liked": liked, 
            "unliked": False,
            "like_count": post.like_count,
            "unlike_count": post.unlike_count,
            "quality_score": post.quality_score
        })

class PostUnlikeToggleView(APIView):
    """POST /api/v1/posts/{id}/unlike/ — Toggle unlike on a post."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        try:
            post = Post.objects.get(id=id)
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        like, created = Like.objects.get_or_create(post=post, user=request.user)

        from django.db.models import F
        if created:
            like.is_unlike = True
            like.save(update_fields=['is_unlike'])
            Post.objects.filter(id=post.id).update(unlike_count=F('unlike_count') + 1)
            unliked = True
        else:
            if not like.is_unlike:
                like.is_unlike = True
                like.save(update_fields=['is_unlike'])
                Post.objects.filter(id=post.id).update(like_count=F('like_count') - 1, unlike_count=F('unlike_count') + 1)
                unliked = True
            else:
                like.delete()
                Post.objects.filter(id=post.id).update(unlike_count=F('unlike_count') - 1)
                unliked = False
                
        post.refresh_from_db()
                
        from .services import recalculate_quality_score
        recalculate_quality_score(post)
        return Response({
            "liked": False, 
            "unliked": unliked,
            "like_count": post.like_count,
            "unlike_count": post.unlike_count,
            "quality_score": post.quality_score
        })


class CreatorPostListView(generics.ListAPIView):
    """GET /api/v1/posts/creator/{username}/ — Posts by a creator."""

    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self): # type: ignore
        username = self.kwargs["username"]
        return Post.objects.filter(
            creator__username=username,
            is_published=True,
        ).select_related("creator")


# ─────────────────────────────────────────────
# Comment Views
# ─────────────────────────────────────────────


class CommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/posts/{id}/comments/ — List and add comments."""

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self): # type: ignore
        post_id = self.kwargs["id"]
        return Comment.objects.filter(
            post_id=post_id, parent__isnull=True, is_deleted=False
        ).select_related("user")

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            post_id=self.kwargs["id"],
        )

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # Increment comment count
        try:
            post = Post.objects.get(id=self.kwargs["id"])
            post.comment_count += 1
            post.save(update_fields=['comment_count'])
            from .services import recalculate_quality_score
            recalculate_quality_score(post)
        except Post.DoesNotExist:
            pass
        return response


# ─────────────────────────────────────────────
# Story Views
# ─────────────────────────────────────────────


class StoryListView(generics.ListAPIView):
    """GET /api/v1/posts/stories/ — Active stories from followed creators."""

    serializer_class = StorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):  # type: ignore
        return Story.objects.filter(
            expires_at__gt=timezone.now()
        ).select_related("creator")


class StoryCreateView(generics.CreateAPIView):
    """POST /api/v1/posts/stories/ — Create a story (creators only)."""

    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

from apps.payments.services import ExchangeRateService

class AIHighlightWebhookView(APIView):
    """POST /api/v1/content/ai-highlight-webhook/"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.db import transaction
        from apps.accounts.models import User
        host_username = request.data.get('host_username')
        video_url = request.data.get('video_url')
        
        if not host_username or not video_url:
            return Response({"error": "Missing parameters"}, status=400)
            
        try:
            host = User.objects.get(username=host_username, role='host')
        except User.DoesNotExist:
            return Response({"error": "Host not found"}, status=404)
            
        with transaction.atomic():
            # Cost is $0.84 USD
            from decimal import Decimal
            usd_to_idr_rate = ExchangeRateService.get_rate("USD", "IDR")
            cost_idr = Decimal("0.84") * usd_to_idr_rate
            
            if host.balance_idr < cost_idr:
                return Response({"error": "Host has insufficient balance for AI Highlight"}, status=400)
                
            host.balance_idr -= cost_idr
            host.save()
            
            from apps.payments.models import WalletTransaction
            WalletTransaction.objects.create(
                user=host,
                transaction_type=WalletTransaction.TransactionType.SUBSCRIPTION, # Outgoing platform fee
                amount=cost_idr,
                currency="IDR",
                status=WalletTransaction.Status.COMPLETED,
                notes="AI Highlight Auto-Generation Fee ($0.84)"
            )
            
            # Create a Post
            from .models import Post
            post = Post.objects.create(
                creator=host,
                author=host,
                content_type=Post.ContentType.VIDEO,
                content="Lihat highlight terbaik dari live stream saya! 🔥 #LiveHighlight",
                media_url=video_url,
                is_premium=False,
                is_published=True
            )
            
        return Response({"message": "AI Highlight Generated and Posted", "post_id": str(post.id), "cost_idr": str(cost_idr)}, status=201)
