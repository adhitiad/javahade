"""
Template tags kustom untuk app booking.
Menyediakan filter dan tag tambahan untuk template.
"""

from django import template

register = template.Library()


@register.filter
def status_color(status):
    """Mengembalikan class warna Tailwind berdasarkan status booking."""
    colors = {
        "pending": "bg-amber-500/20 text-amber-400 border-amber-500/30",
        "confirmed": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        "cancelled": "bg-red-500/20 text-red-400 border-red-500/30",
        "completed": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    }
    return colors.get(status, "bg-gray-500/20 text-gray-400 border-gray-500/30")


@register.filter
def status_icon(status):
    """Mengembalikan emoji ikon berdasarkan status booking."""
    icons = {
        "pending": "⏳",
        "confirmed": "✅",
        "cancelled": "❌",
        "completed": "🏁",
    }
    return icons.get(status, "📋")


@register.filter
def rupiah(value):
    """Format angka ke format Rupiah."""
    try:
        return f"Rp {int(value):,}".replace(",", ".")
    except (ValueError, TypeError):
        return f"Rp 0"
