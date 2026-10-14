from rest_framework import serializers

from .models import Brand, Category, Product, ProductImage, ProductVariant, Review


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image"]


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text"]


class ProductVariantSerializer(serializers.ModelSerializer):
    is_in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "name",
            "sku",
            "price",
            "compare_at_price",
            "shade_hex",
            "is_in_stock",
            "stock_quantity",
        ]


class ProductListSerializer(serializers.ModelSerializer):
    """Compact representation for product cards. Expects queryset annotations."""

    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    min_compare_at_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    default_variant_id = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "short_description",
            "brand",
            "category",
            "primary_image",
            "min_price",
            "min_compare_at_price",
            "average_rating",
            "review_count",
            "is_in_stock",
            "is_featured",
            "default_variant_id",
            "variant_count",
        ]

    def get_primary_image(self, product):
        images = list(product.images.all())
        if not images:
            return None
        return ProductImageSerializer(images[0], context=self.context).data

    def _active_variants(self, product):
        return [variant for variant in product.variants.all() if variant.is_active]

    def get_default_variant_id(self, product):
        in_stock = [v for v in self._active_variants(product) if v.stock_quantity > 0]
        return in_stock[0].id if in_stock else None

    def get_variant_count(self, product):
        return len(self._active_variants(product))


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "description",
            "ingredients",
            "how_to_use",
            "images",
            "variants",
        ]

    def get_variants(self, product):
        return ProductVariantSerializer(
            self._active_variants(product), many=True, context=self.context
        ).data


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "rating", "title", "body", "author_name", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]

    def get_author_name(self, review):
        first = review.user.first_name or "Customer"
        last_initial = f" {review.user.last_name[0]}." if review.user.last_name else ""
        return f"{first}{last_initial}"
