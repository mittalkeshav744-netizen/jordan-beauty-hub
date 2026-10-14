from django.db import models

from apps.orders.models import Order


class Payment(models.Model):
    """
    Payment state is tracked separately from the order's fulfilment status.

    Only Cash on Delivery exists today. When an online gateway is added, its
    server-side verification (signature check / webhook) must be the only
    thing that moves a payment to PAID.
    """

    class Method(models.TextChoices):
        CASH_ON_DELIVERY = "cod", "Cash on delivery"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    provider_reference = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_method_display()} for {self.order} ({self.get_status_display()})"
