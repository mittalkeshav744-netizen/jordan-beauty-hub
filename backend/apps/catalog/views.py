from decimal import Decimal, InvalidOperation

from django.db.models import Avg, Count, Exists, F, IntegerField, Max, Min, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from config.exceptions import error_response

from .models import Brand, Category, Product, ProductVariant, Review
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ReviewSerializer,
)
from .services import user_has_received_product

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


def annotated_products():
    """Active products with the values product cards need, without N+1 queries."""
    active_variants = ProductVariant.objects.filter(product=OuterRef("pk"), is_active=True)
    cheapest = active_variants.order_by("price", "id")
    approved_reviews = Review.objects.filter(product=OuterRef("pk"), is_approved=True).values(
        "product"
    )
    return (
        Product.objects.filter(is_active=True, brand__is_active=True, category__is_active=True)
        .select_related("brand", "category")
        .prefetch_related("images", "variants")
        .annotate(
            min_price=Subquery(cheapest.values("price")[:1]),
            min_compare_at_price=Subquery(cheapest.values("compare_at_price")[:1]),
            is_in_stock=Exists(active_variants.filter(stock_quantity__gt=0)),
            average_rating=Subquery(
                approved_reviews.annotate(value=Avg("rating")).values("value")[:1]
            ),
            review_count=Coalesce(
                Subquery(
                    approved_reviews.annotate(value=Count("id")).values("value")[:1],
                    output_field=IntegerField(),
                ),
                Value(0),
            ),
        )
        .filter(min_price__isnull=False)
    )


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


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/catalog/products/ supports these query parameters:
      search, category, brand (comma-separated slugs), min_price, max_price,
      in_stock=true, featured=true, ordering (newest|price_asc|price_desc|rating|name),
      page, page_size.
    GET /api/catalog/products/price-range/ takes the same filters and returns {"min", "max"}.
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
