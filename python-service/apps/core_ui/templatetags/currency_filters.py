from django import template
from django.contrib.humanize.templatetags.humanize import intcomma

register = template.Library()

@register.filter(name='currency_idr')
def currency_idr(value):
    """
    Mengonversi nilai integer/float ke format Rupiah.
    Contoh: 1500000 -> Rp 1.500.000
    """
    try:
        value = float(value)
        # Pisahkan ribuan dengan titik
        formatted_value = "{:,.0f}".format(value).replace(',', '.')
        return f"Rp {formatted_value}"
    except (ValueError, TypeError):
        return value

@register.filter(name='currency_usd')
def currency_usd(value):
    """
    Mengonversi nilai integer/float ke format USD.
    Contoh: 50 -> $50.00
    """
    try:
        value = float(value)
        return f"${value:,.2f}"
    except (ValueError, TypeError):
        return value
