from rest_framework import serializers

from apps.catalog.serializers import ProductListSerializer

from .models import Look

PREVIEW_IMAGE_COUNT = 3


class LookListSerializer(serializers.ModelSerializer):
    """Look cards. Expects steps__product__images to be prefetched."""

    has_video = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    preview_images = serializers.SerializerMethodField()

    class Meta:
        model = Look
        fields = [
            "slug",
            "title",
            "occasion",
            "description",
            "cover_image",
            "has_video",
            "product_count",
            "preview_images",
        ]

    def _active_products(self, look):
        return [step.product for step in look.steps.all() if step.product.is_active]

    def get_has_video(self, look):
        return bool(look.video)

    def get_product_count(self, look):
        return len({product.pk for product in self._active_products(look)})

    def get_preview_images(self, look):
        request = self.context.get("request")
        urls = []
        for product in self._active_products(look):
            images = list(product.images.all())
            if images:
                url = images[0].image.url
                urls.append(request.build_absolute_uri(url) if request else url)
            if len(urls) == PREVIEW_IMAGE_COUNT:
                break
        return urls


class LookVariantSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    shade_hex = serializers.CharField()
    is_in_stock = serializers.BooleanField()


class LookStepSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="step.id")
    instruction = serializers.CharField(source="step.instruction")
    product = ProductListSerializer()
    variant = LookVariantSerializer(allow_null=True)


class LookDetailSerializer(serializers.ModelSerializer):
    video = serializers.FileField(read_only=True)

    class Meta:
        model = Look
        fields = ["slug", "title", "occasion", "description", "cover_image", "video"]
