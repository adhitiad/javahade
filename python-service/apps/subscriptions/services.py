from decimal import Decimal
from django.db.models import Sum
from apps.accounts.models import User
from apps.payments.models import WalletTransaction
from apps.content.models import Post

class CreatorValuationService:
    """
    Kalkulasi Valuasi (Nilai Pasar) dari seorang Host untuk penentuan Harga Saham.
    """
    
    BASE_VALUATION_IDR = Decimal("10000000.00") # Nilai dasar Host Rp 1 Juta
    TOTAL_SHARES_CAP = 10000 # Maksimal 10.000 lembar saham per Host
    
    @classmethod
    def calculate_valuation(cls, host: User) -> Decimal:
        """
        Rumus Valuasi:
        1. Nilai Dasar (Rp 10.000.000)
        2. Total Pendapatan Historis * 1.5 (Multiplier)
        3. Total Quality Score Postingan * Rp 5.000
        """
        if host.role != 'host':
            return Decimal("0.00")
            
        # 1. Base Valuation
        valuation = cls.BASE_VALUATION_IDR
        
        # 2. Earnings Multiplier
        earnings = WalletTransaction.objects.filter(
            user=host, 
            transaction_type=WalletTransaction.TransactionType.EARNING,
            status=WalletTransaction.Status.COMPLETED
        ).aggregate(total=Sum('amount'))['total'] or Decimal("0.00")
        
        valuation += earnings * Decimal("1.5")
        
        # 3. Engagement / Quality Score Multiplier
        total_quality_score = Post.objects.filter(author=host).aggregate(
            total_score=Sum('quality_score')
        )['total_score'] or 0
        
        valuation += Decimal(str(total_quality_score)) * Decimal("5000.00")
        
        return valuation

    @classmethod
    def get_share_price(cls, host: User) -> Decimal:
        """Harga 1 Lembar Saham = Valuasi / 10.000"""
        valuation = cls.calculate_valuation(host)
        return valuation / Decimal(str(cls.TOTAL_SHARES_CAP))
