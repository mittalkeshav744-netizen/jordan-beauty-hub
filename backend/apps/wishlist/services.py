from django.db.models import OuterRef, Subquery

from apps.catalog.services import annotated_products

from .models import WishlistItem


class WishlistError(Exception):
    pass


def wishlist_products(user):
    """The user's saved products that are still on sale, most recently saved first."""
    saved_at = WishlistItem.objects.filter(user=user, product=OuterRef("pk")).values("added_at")[:1]
    return (
        annotated_products()
        .annotate(saved_at=Subquery(saved_at))
        .filter(saved_at__isnull=False)
        .order_by("-saved_at", "-id")
    )


def add_to_wishlist(user, product_id):
    """Save a product. Saving it again is harmless."""
    if not annotated_products().filter(pk=product_id).exists():
        raise WishlistError("This product is not available.")
    WishlistItem.objects.get_or_create(user=user, product_id=product_id)


def remove_from_wishlist(user, product_id):
    WishlistItem.objects.filter(user=user, product_id=product_id).delete()
