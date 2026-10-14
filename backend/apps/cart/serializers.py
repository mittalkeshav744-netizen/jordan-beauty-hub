from rest_framework import serializers

from apps.catalog.models import ProductVariant

from .models import CartItem


class CartVariantSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    brand_name = serializers.CharField(source="product.brand.name", read_only=True)
    image = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "name",
            "sku",
            "price",
            "compare_at_price",
            "stock_quantity",
            "product_name",
            "product_slug",
            "brand_name",
            "image",
            "is_available",
        ]

    def get_image(self, variant):
        images = list(variant.product.images.all())
        if not images:
            return None
        request = self.context.get("request")
        url = images[0].image.url
        return request.build_absolute_uri(url) if request else url

    def get_is_available(self, variant):
        return variant.is_active and variant.product.is_active and variant.stock_quantity > 0


class CartItemSerializer(serializers.ModelSerializer):
    variant = CartVariantSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "variant", "quantity", "line_total"]

    def get_line_total(self, item):
        return f"{item.variant.price * item.quantity:.2f}"


class AddCartItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
