from decimal import Decimal, InvalidOperation

from django.db.models import Exists, F, Max, Min, OuterRef, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from config.exceptions import error_response

from .models import Brand, Category, Concern, Product, Review, SkinType
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ConcernSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ReviewSerializer,
    RoutineQuerySerializer,
    SkinTypeSerializer,
)
from .services import annotated_products, build_routine, user_has_received_product

MAX_IDS_PER_REQUEST = 24
RELATED_PRODUCT_LIMIT = 4

ORDERING_OPTIONS = {
    "newest": ["-created_at"],
    "price_asc": ["min_price", "name"],
    "price_desc": ["-min_price", "name"],
    "rating": [F("average_rating").desc(nulls_last=True), "-review_count", "name"],
    "name": ["name"],
}


def parse_decimal(value):
    try:
        return Decimal(value) if value not in (None, "") else None
    except InvalidOperation:
        return None


def filter_products(queryset, params, *, apply_price=True):
    """Apply the shop's query-string filters. Price is optional so price bounds can ignore it."""
    search = params.get("search", "").strip()
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(brand__name__icontains=search)
            | Q(category__name__icontains=search)
            | Q(short_description__icontains=search)
        )

    category = params.get("category")
    if category:
        queryset = queryset.filter(category__slug__in=category.split(","))

    brand = params.get("brand")
    if brand:
        queryset = queryset.filter(brand__slug__in=brand.split(","))

    concern = params.get("concern")
    if concern:
        concern_links = Product.concerns.through.objects.filter(
            product=OuterRef("pk"), concern__slug__in=concern.split(","), concern__is_active=True
        )
        queryset = queryset.filter(Exists(concern_links))

    if apply_price:
        min_price = parse_decimal(params.get("min_price"))
        if min_price is not None:
            queryset = queryset.filter(min_price__gte=min_price)

        max_price = parse_decimal(params.get("max_price"))
        if max_price is not None:
            queryset = queryset.filter(min_price__lte=max_price)

    if params.get("in_stock") == "true":
        queryset = queryset.filter(is_in_stock=True)

    if params.get("featured") == "true":
        queryset = queryset.filter(is_featured=True)

    ids = [int(part) for part in params.get("ids", "").split(",") if part.strip().isdigit()]
    if ids:
        queryset = queryset.filter(pk__in=ids[:MAX_IDS_PER_REQUEST])

    return queryset


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    pagination_class = None


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    pagination_class = None


class ConcernViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Concern.objects.filter(is_active=True)
    serializer_class = ConcernSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    pagination_class = None


class SkinTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SkinType.objects.all()
    serializer_class = SkinTypeSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    pagination_class = None


class RoutineView(APIView):
    """
    GET /api/catalog/routine/?skin_type=oily&concern=acne&max_price=499
    Skin quiz result: one product per morning and night step (null when nothing matches yet).
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = RoutineQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        routine = build_routine(**query.validated_data)
        context = {"request": request}

        def serialize_steps(steps):
            return [
                {
                    "step": step["step"],
                    "label": step["label"],
                    "product": ProductListSerializer(step["product"], context=context).data
                    if step["product"]
                    else None,
                }
                for step in steps
            ]

        return Response(
            {
                "morning": serialize_steps(routine["morning"]),
                "night": serialize_steps(routine["night"]),
                "bag_variant_ids": routine["bag_variant_ids"],
                "total_price": f"{routine['total_price']:.2f}",
            }
        )


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/catalog/products/ supports these query parameters:
      search, category, brand, concern (comma-separated slugs), min_price, max_price,
      in_stock=true, featured=true, ids (comma-separated product ids, at most 24),
      ordering (newest|price_asc|price_desc|rating|name), page, page_size.
    GET /api/catalog/products/price-range/ takes the same filters and returns {"min", "max"}.
    GET /api/catalog/products/{slug}/related/ returns up to four products from the same category.
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "slug"

    def get_serializer_class(self):
        return ProductDetailSerializer if self.action == "retrieve" else ProductListSerializer

    def get_queryset(self):
        queryset = annotated_products()
        if self.action != "list":
            return queryset

        params = self.request.query_params
        queryset = filter_products(queryset, params)
        ordering = ORDERING_OPTIONS.get(params.get("ordering"), ORDERING_OPTIONS["newest"])
        return queryset.order_by(*ordering)

    @action(detail=False, methods=["get"], url_path="price-range")
    def price_range(self, request):
        """Lowest and highest card price for the current filters (ignoring the price filter)."""
        products = filter_products(annotated_products(), request.query_params, apply_price=False)
        bounds = products.aggregate(min=Min("min_price"), max=Max("min_price"))
        return Response({key: f"{value:.2f}" if value is not None else None for key, value in bounds.items()})

    @action(detail=True, methods=["get"])
    def related(self, request, slug=None):
        product = self.get_object()
        related = (
            annotated_products()
            .filter(category=product.category)
            .exclude(pk=product.pk)
            .order_by("-is_in_stock", "-is_featured", "-created_at")[:RELATED_PRODUCT_LIMIT]
        )
        return Response(ProductListSerializer(related, many=True, context={"request": request}).data)

    @action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[permissions.IsAuthenticatedOrReadOnly],
    )
    def reviews(self, request, slug=None):
        product = self.get_object()

        if request.method == "GET":
            reviews = product.reviews.filter(is_approved=True).select_related("user")
            page = self.paginate_queryset(reviews)
            serializer = ReviewSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        if not user_has_received_product(request.user, product):
            return error_response(
                "You can review a product after your order containing it has been delivered.",
                status.HTTP_403_FORBIDDEN,
            )
        if Review.objects.filter(product=product, user=request.user).exists():
            return error_response("You have already reviewed this product.")

        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product, user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
