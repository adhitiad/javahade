"""
Custom permissions for the Accounts app.
"""

from rest_framework.permissions import BasePermission


class IsCreator(BasePermission):
    """Allow access only to users with creator role."""

    message = "You must be an approved creator to perform this action."

    def has_permission(self, request, view):  # type: ignore
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_creator
            and hasattr(request.user, "creator_profile")
        )


class IsOwnerOrReadOnly(BasePermission):
    """Allow write access only to the object owner."""

    def has_object_permission(self, request, view, obj):  # type: ignore
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        # Check for user FK or direct user match
        if hasattr(obj, "user"):
            return obj.user == request.user
        return obj == request.user


class IsAdminUser(BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):  # type: ignore
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_admin_user
        )
