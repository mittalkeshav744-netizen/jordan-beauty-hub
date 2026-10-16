from django.conf import settings
from django.db import models

from apps.catalog.models import Product


class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wishlist_items"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlist_items")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-added_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="unique_product_per_wishlist"),
        ]

    def __str__(self):
        return f"{self.product} saved by {self.user}"
