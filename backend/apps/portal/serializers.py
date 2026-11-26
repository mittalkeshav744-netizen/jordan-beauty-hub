from rest_framework import serializers

from django.utils.text import slugify

from apps.catalog.models import Category, Product, ProductImage, ProductVariant, Review
from apps.looks.models import Look
from apps.orders.models import Coupon, Order
from apps.orders.serializers import OrderDetailSerializer, OrderListSerializer
from apps.store.models import NewsletterSubscriber, StorefrontConfig, StorefrontReel

from .services import allowed_next_statuses


class PortalOrderListSerializer(OrderListSerializer):
    customer_email = serializers.EmailField(source="user.email", read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + ["customer_email", "customer_name"]

    def get_customer_name(self, order):
        return order.shipping_full_name or order.user.get_full_name() or ""


class PortalOrderDetailSerializer(OrderDetailSerializer):
    customer_email = serializers.EmailField(source="user.email", read_only=True)
    customer_id = serializers.IntegerField(source="user_id", read_only=True)
    customer_name = serializers.SerializerMethodField()
    allowed_next_statuses = serializers.SerializerMethodField()

    class Meta(OrderDetailSerializer.Meta):
        fields = OrderDetailSerializer.Meta.fields + [
            "customer_id",
            "customer_email",
            "customer_name",
            "allowed_next_statuses",
        ]

    def get_customer_name(self, order):
        return order.shipping_full_name or order.user.get_full_name() or ""

    def get_allowed_next_statuses(self, order):
        return allowed_next_statuses(order)


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class OrderShipmentSerializer(serializers.Serializer):
    courier_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    tracking_number = serializers.CharField(required=False, allow_blank=True, max_length=120)
    tracking_url = serializers.URLField(required=False, allow_blank=True, max_length=500)


def media_url(image_field, request):
    if not image_field:
        return ""
    url = image_field.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class PortalProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "url", "alt_text", "sort_order"]

    def get_url(self, image):
        return media_url(image.image, self.context.get("request"))


class PortalVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "name",
            "sku",
            "price",
            "compare_at_price",
            "stock_quantity",
            "shade_hex",
            "is_active",
        ]


class PortalProductListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    total_stock = serializers.IntegerField(read_only=True)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    variant_count = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "brand_name",
            "category_name",
            "is_active",
            "is_featured",
            "total_stock",
            "min_price",
            "in_stock",
            "review_count",
            "variant_count",
            "primary_image",
            "updated_at",
        ]

    def get_variant_count(self, product):
        return product.variants.count()

    def get_in_stock(self, product):
        return any(variant.stock_quantity > 0 and variant.is_active for variant in product.variants.all())

    def get_primary_image(self, product):
        image = next(iter(product.images.all()), None)
        return media_url(image.image, self.context.get("request")) if image else ""


class PortalProductDetailSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    variants = PortalVariantSerializer(many=True, read_only=True)
    images = PortalProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "brand_name",
            "category_name",
            "short_description",
            "description",
            "ingredients",
            "how_to_use",
            "net_quantity",
            "routine_step",
            "is_active",
            "is_featured",
            "variants",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "brand_name",
            "category_name",
            "variants",
            "images",
            "created_at",
            "updated_at",
        ]


class PortalProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "name",
            "short_description",
            "description",
            "ingredients",
            "how_to_use",
            "net_quantity",
            "is_active",
            "is_featured",
        ]


def _validate_sale_price(price, compare_at_price):
    if compare_at_price is not None and compare_at_price <= price:
        raise serializers.ValidationError(
            {"compare_at_price": "Original price must be higher than the selling price."}
        )


def _normalize_shade_hex(value):
    """Blank = no swatch; otherwise require #RRGGBB."""
    if value in (None, ""):
        return ""
    cleaned = str(value).strip()
    if not cleaned:
        return ""
    if cleaned[0] != "#":
        cleaned = f"#{cleaned}"
    if len(cleaned) != 7 or any(ch not in "0123456789abcdefABCDEF" for ch in cleaned[1:]):
        raise serializers.ValidationError("Enter a colour like #C46A6A, or leave blank.")
    return f"#{cleaned[1:].upper()}"


class PortalProductCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    brand_id = serializers.IntegerField()
    category_id = serializers.IntegerField()
    short_description = serializers.CharField(required=False, allow_blank=True, max_length=300)
    variant_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    shade_hex = serializers.CharField(required=False, allow_blank=True, max_length=7)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    compare_at_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0, required=False, allow_null=True
    )
    stock_quantity = serializers.IntegerField(min_value=0, required=False, default=0)

    def validate_shade_hex(self, value):
        return _normalize_shade_hex(value)

    def validate(self, attrs):
        from apps.catalog.models import Brand, Category

        _validate_sale_price(attrs["price"], attrs.get("compare_at_price"))
        if not Brand.objects.filter(pk=attrs["brand_id"]).exists():
            raise serializers.ValidationError({"brand_id": "Choose a brand."})
        if not Category.objects.filter(pk=attrs["category_id"]).exists():
            raise serializers.ValidationError({"category_id": "Choose a category."})
        return attrs


class PortalVariantWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    compare_at_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0, required=False, allow_null=True
    )
    shade_hex = serializers.CharField(required=False, allow_blank=True, max_length=7)
    is_active = serializers.BooleanField(required=False, default=True)
    stock_quantity = serializers.IntegerField(min_value=0, required=False, default=0)

    def validate_shade_hex(self, value):
        return _normalize_shade_hex(value)

    def validate(self, attrs):
        _validate_sale_price(attrs["price"], attrs.get("compare_at_price"))
        return attrs


class PortalVariantUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    compare_at_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0, required=False, allow_null=True
    )
    shade_hex = serializers.CharField(required=False, allow_blank=True, max_length=7)
    is_active = serializers.BooleanField()

    def validate_shade_hex(self, value):
        return _normalize_shade_hex(value)

    def validate(self, attrs):
        _validate_sale_price(attrs["price"], attrs.get("compare_at_price"))
        return attrs


class StockAdjustSerializer(serializers.Serializer):
    quantity_change = serializers.IntegerField()
    reason = serializers.ChoiceField(
        choices=["restock", "adjustment"],
        default="adjustment",
    )
    reference = serializers.CharField(required=False, allow_blank=True, max_length=100)

    def validate_quantity_change(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity change cannot be zero.")
        return value


class PortalReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product_name",
            "product_slug",
            "customer_email",
            "rating",
            "title",
            "body",
            "is_approved",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "product_name",
            "product_slug",
            "customer_email",
            "rating",
            "title",
            "body",
            "created_at",
        ]


class PortalCouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "description",
            "discount_type",
            "value",
            "min_order_amount",
            "max_discount_amount",
            "valid_from",
            "valid_until",
            "usage_limit",
            "usage_limit_per_user",
            "times_used",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "times_used", "created_at"]

    def validate_code(self, value):
        return value.strip().upper()


class PortalCustomerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone = serializers.CharField()
    is_active = serializers.BooleanField()
    is_staff = serializers.BooleanField(required=False)
    date_joined = serializers.DateTimeField()
    order_count = serializers.IntegerField()


class PortalCustomerDetailSerializer(PortalCustomerSerializer):
    addresses = serializers.SerializerMethodField()
    recent_orders = serializers.SerializerMethodField()

    def get_addresses(self, user):
        return [
            {
                "id": address.id,
                "full_name": address.full_name,
                "phone": address.phone,
                "line1": address.line1,
                "line2": address.line2,
                "city": address.city,
                "state": address.state,
                "postal_code": address.postal_code,
                "is_default": address.is_default,
            }
            for address in user.addresses.all()
        ]

    def get_recent_orders(self, user):
        orders = user.orders.all()[:8]
        return PortalOrderListSerializer(orders, many=True).data


class PortalLookSerializer(serializers.ModelSerializer):
    step_count = serializers.IntegerField(read_only=True)
    cover_image_url = serializers.SerializerMethodField()
    preview_images = serializers.SerializerMethodField()
    step_labels = serializers.SerializerMethodField()

    class Meta:
        model = Look
        fields = [
            "id",
            "title",
            "slug",
            "occasion",
            "description",
            "is_active",
            "sort_order",
            "step_count",
            "cover_image_url",
            "preview_images",
            "step_labels",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "step_count",
            "cover_image_url",
            "preview_images",
            "step_labels",
            "updated_at",
        ]

    def _media_url(self, file_field):
        """Prefer a root-relative media path so Vite and Django both serve it."""
        if not file_field:
            return ""
        try:
            url = file_field.url
        except ValueError:
            return ""
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_cover_image_url(self, look):
        return self._media_url(look.cover_image)

    def get_preview_images(self, look):
        urls = []
        for step in look.steps.all():
            product = getattr(step, "product", None)
            if product is None or not product.is_active:
                continue
            image = next(iter(product.images.all()), None)
            if not image:
                continue
            url = self._media_url(image.image)
            if url:
                urls.append(url)
            if len(urls) == 3:
                break
        return urls

    def get_step_labels(self, look):
        labels = []
        for step in look.steps.all()[:5]:
            product = getattr(step, "product", None)
            if product is not None:
                labels.append(product.name)
        return labels


class PortalLookUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Look
        fields = ["title", "occasion", "description", "is_active", "sort_order"]


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ["id", "email", "subscribed_at"]


class NewsletterCampaignSerializer(serializers.Serializer):
    KIND_OFFER = "offer"
    KIND_NEW_ARRIVALS = "new_arrivals"
    KIND_CUSTOM = "custom"
    KIND_CHOICES = (
        (KIND_OFFER, "Offer"),
        (KIND_NEW_ARRIVALS, "New arrivals"),
        (KIND_CUSTOM, "Custom"),
    )

    kind = serializers.ChoiceField(choices=KIND_CHOICES, default=KIND_CUSTOM)
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField(max_length=4000)

    def validate_subject(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Enter a subject.")
        return cleaned

    def validate_message(self, value):
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise serializers.ValidationError("Write a short message (at least 10 characters).")
        return cleaned


def _parse_json_if_string(value):
    if isinstance(value, str):
        import json

        try:
            return json.loads(value)
        except json.JSONDecodeError as error:
            raise serializers.ValidationError("Enter valid JSON.") from error
    return value


class PortalCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "image",
            "image_url",
            "is_active",
            "sort_order",
            "product_count",
            "updated_at",
        ]
        read_only_fields = ["id", "image_url", "product_count", "updated_at"]
        extra_kwargs = {"image": {"write_only": True, "required": False}}

    def get_image_url(self, category):
        return media_url(category.image, self.context.get("request"))

    def validate_slug(self, value):
        return slugify(value) if value else value

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = slugify(validated_data["name"])[:120]
        return super().create(validated_data)


class PortalStorefrontConfigSerializer(serializers.ModelSerializer):
    hero_video_file_url = serializers.SerializerMethodField()
    store_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = StorefrontConfig
        fields = [
            "id",
            "announcement_text",
            "announcement_link",
            "announcement_enabled",
            "hero_tag",
            "hero_title",
            "hero_rotating_lines",
            "hero_media_type",
            "hero_video_file",
            "hero_video_file_url",
            "hero_video_url",
            "hero_video_loop_end",
            "hero_primary_cta_text",
            "hero_primary_cta_link",
            "hero_secondary_cta_text",
            "hero_secondary_cta_link",
            "marquee_items",
            "quiz_badge",
            "quiz_title",
            "quiz_subtitle",
            "quiz_button_text",
            "quiz_link",
            "quiz_enabled",
            "benefits",
            "budget_tiles",
            "sections_order",
            "footer_tagline",
            "footer_shop_title",
            "footer_account_title",
            "footer_help_title",
            "footer_shop_links",
            "footer_account_links",
            "footer_help_links",
            "footer_include_categories",
            "policies",
            "store_logo",
            "store_logo_url",
            "updated_at",
        ]
        read_only_fields = ["id", "hero_video_file_url", "store_logo_url", "updated_at"]
        extra_kwargs = {
            "hero_video_file": {"write_only": True, "required": False},
            "store_logo": {"write_only": True, "required": False},
        }

    def get_hero_video_file_url(self, config):
        return media_url(config.hero_video_file, self.context.get("request"))

    def get_store_logo_url(self, config):
        return media_url(config.store_logo, self.context.get("request"))

    def to_internal_value(self, data):
        # QueryDict stringifies list/dict values; use a plain dict for JSON fields.
        if hasattr(data, "lists"):
            mutable = {key: data.get(key) for key in data.keys()}
        else:
            mutable = dict(data)
        for key in (
            "hero_rotating_lines",
            "marquee_items",
            "benefits",
            "budget_tiles",
            "sections_order",
            "footer_shop_links",
            "footer_account_links",
            "footer_help_links",
            "policies",
        ):
            if key in mutable:
                mutable[key] = _parse_json_if_string(mutable.get(key))
        return super().to_internal_value(mutable)


class PortalStorefrontReelSerializer(serializers.ModelSerializer):
    video_file_url = serializers.SerializerMethodField()
    product_id = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.SerializerMethodField()
    product_slug = serializers.SerializerMethodField()
    resolved_link_url = serializers.SerializerMethodField()

    class Meta:
        model = StorefrontReel
        fields = [
            "id",
            "title",
            "video_file",
            "video_file_url",
            "video_url",
            "link_type",
            "link_url",
            "product_id",
            "product_name",
            "product_slug",
            "resolved_link_url",
            "start_seconds",
            "loop_end_seconds",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "video_file_url",
            "product_name",
            "product_slug",
            "resolved_link_url",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {"video_file": {"write_only": True, "required": False}}

    def get_video_file_url(self, reel):
        return media_url(reel.video_file, self.context.get("request"))

    def get_product_name(self, reel):
        return reel.product.name if reel.product_id else ""

    def get_product_slug(self, reel):
        return reel.product.slug if reel.product_id else ""

    def get_resolved_link_url(self, reel):
        return reel.resolved_link_url()

    def validate(self, attrs):
        link_type = attrs.get(
            "link_type",
            getattr(self.instance, "link_type", StorefrontReel.LinkType.PATH),
        )
        link_url = attrs.get(
            "link_url",
            getattr(self.instance, "link_url", "") if self.instance else "",
        )
        if "product_id" in attrs:
            raw = attrs.get("product_id")
            if raw in ("", None):
                product_id = None
            else:
                try:
                    product_id = int(raw)
                except (TypeError, ValueError) as exc:
                    raise serializers.ValidationError(
                        {"product_id": "Pick a valid product."}
                    ) from exc
            attrs["product_id"] = product_id
        else:
            product_id = getattr(self.instance, "product_id", None) if self.instance else None

        if link_type == StorefrontReel.LinkType.PRODUCT:
            if not product_id:
                raise serializers.ValidationError(
                    {"product_id": "Pick the product this reel should open."}
                )
            from apps.catalog.models import Product

            if not Product.objects.filter(pk=product_id).exists():
                raise serializers.ValidationError({"product_id": "That product was not found."})
            attrs.setdefault("link_url", getattr(self.instance, "link_url", "") if self.instance else "")
        else:
            cleaned = (link_url or "").strip() or "/shop"
            if not cleaned.startswith("/"):
                raise serializers.ValidationError(
                    {
                        "link_url": (
                            "Use a site path starting with / "
                            "(for example /shop?category=skincare)."
                        )
                    }
                )
            attrs["link_url"] = cleaned
            attrs["product_id"] = None
        attrs["link_type"] = link_type
        return attrs

    def create(self, validated_data):
        product_id = validated_data.pop("product_id", None)
        return StorefrontReel.objects.create(**validated_data, product_id=product_id)

    def update(self, instance, validated_data):
        product_id = validated_data.pop("product_id", serializers.empty)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if product_id is not serializers.empty:
            instance.product_id = product_id
        instance.save()
        return instance


class StorefrontReelReorderSerializer(serializers.Serializer):
    ordered_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )


class HomepagePicksWriteSerializer(serializers.Serializer):
    """Ordered catalogue product ids for the owner-curated home shelf."""

    product_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=True,
        max_length=12,
    )
