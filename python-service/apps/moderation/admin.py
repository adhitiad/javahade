from django.contrib import admin
from .models import Report

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["reporter", "reason", "status", "content_type", "created_at"]
    list_filter = ["status", "reason"]
    search_fields = ["reporter__username", "description"]
