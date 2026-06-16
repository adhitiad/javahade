from decimal import Decimal
from apps.content.models import Post

def recalculate_quality_score(post: Post) -> Decimal:
    """
    Menghitung ulang skor kualitas (Quality Score) postingan untuk Algoritma Feed.
    Skor = (Likes * 2) + (Comments * 3) + (Views * 0.1) - (Unlikes * 1)
    Khusus untuk tipe konten Video, skor dikalikan 1.5x.
    """
    likes_score = post.like_count * 2.0
    comments_score = post.comment_count * 3.0
    views_score = post.view_count * 0.1
    unlikes_score = post.unlike_count * 1.0
    
    base_score = likes_score + comments_score + views_score - unlikes_score
    
    # Video multiplier
    if post.content_type == Post.ContentType.VIDEO:
        base_score *= 1.5
        
    post.quality_score = Decimal(str(round(base_score, 2)))
    post.save(update_fields=["quality_score"])
    return post.quality_score
