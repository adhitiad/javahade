from django.contrib import admin
from .models import FamilyGroup, FamilyMember, FamilyContent

@admin.register(FamilyGroup)
class FamilyGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "member_count", "is_private", "created_at"]
    list_filter = ["is_private"]
    search_fields = ["name", "owner__username"]

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ["user", "family", "role", "joined_at"]
    list_filter = ["role"]

@admin.register(FamilyContent)
class FamilyContentAdmin(admin.ModelAdmin):
    list_display = ["family", "post", "shared_by", "shared_at"]
