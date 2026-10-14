from rest_framework import serializers

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_name",
            "variant_name",
            "sku",
            "unit_price",
            "quantity",
            "line_total",
            "product_slug",
        ]

    def get_product_slug(self, item):
        return item.variant.product.slug if item.variant else None


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ["from_status", "to_status", "note", "created_at"]


class OrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "number",
            "status",
            "status_display",
            "grand_total",
            "currency",
            "item_count",
            "created_at",
        ]

    def get_item_count(self, order):
        return sum(item.quantity for item in order.items.all())


class OrderDetailSerializer(OrderListSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    payment_method = serializers.CharField(source="payment.get_method_display", read_only=True)
    payment_status = serializers.CharField(source="payment.get_status_display", read_only=True)
    can_cancel = serializers.BooleanField(source="can_be_cancelled_by_customer", read_only=True)
    shipping_address = serializers.SerializerMethodField()

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + [
            "subtotal",
            "discount_total",
            "shipping_total",
            "coupon_code",
            "customer_note",
            "shipping_address",
            "items",
            "status_history",
            "payment_method",
            "payment_status",
            "can_cancel",
        ]

    def get_shipping_address(self, order):
        return {
            "full_name": order.shipping_full_name,
            "phone": order.shipping_phone,
            "line1": order.shipping_line1,
            "line2": order.shipping_line2,
            "city": order.shipping_city,
            "state": order.shipping_state,
            "postal_code": order.shipping_postal_code,
            "country": order.shipping_country,
        }


class QuoteSerializer(serializers.Serializer):
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.UUIDField()
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)
    customer_note = serializers.CharField(max_length=500, required=False, allow_blank=True)
