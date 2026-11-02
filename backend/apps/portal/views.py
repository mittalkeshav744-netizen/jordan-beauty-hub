from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.pagination import PageNumberPagination

from apps.catalog.models import HomepagePick, ProductVariant
from apps.catalog.services import (
    HomepagePickError,
    InsufficientStockError,
    change_stock,
    replace_homepage_picks,
)
from apps.orders.services import InvalidStatusTransition, change_order_status

from .permissions import IsStaffUser
from apps.store.models import StorefrontConfig, StorefrontReel

from apps.courses.serializers import PortalCourseSerializer, PortalCourseWriteSerializer
from apps.courses import services as course_services

from .serializers import (
    HomepagePicksWriteSerializer,
    NewsletterCampaignSerializer,
    NewsletterSubscriberSerializer,
    OrderStatusUpdateSerializer,
    PortalCategorySerializer,
    PortalCouponSerializer,
    PortalCustomerDetailSerializer,
    PortalCustomerSerializer,
    PortalLookSerializer,
    PortalLookUpdateSerializer,
    PortalOrderDetailSerializer,
    PortalOrderListSerializer,
    PortalProductCreateSerializer,
    PortalProductDetailSerializer,
    PortalProductListSerializer,
    PortalProductUpdateSerializer,
    PortalReviewSerializer,
    PortalStorefrontConfigSerializer,
    PortalStorefrontReelSerializer,
    PortalVariantUpdateSerializer,
    PortalVariantWriteSerializer,
    StockAdjustSerializer,
    StorefrontReelReorderSerializer,
)
from . import services


def product_detail_response(product, request, status_code=status.HTTP_200_OK):
    fresh = services.product_queryset().get(pk=product.pk)
    payload = PortalProductDetailSerializer(fresh, context={"request": request}).data
    return Response(payload, status=status_code)


class PortalStaffMixin:
    permission_classes = [IsStaffUser]


class DashboardView(PortalStaffMixin, APIView):
    def get(self, request):
        return Response(services.dashboard_stats())


class NavBadgesView(PortalStaffMixin, APIView):
    def get(self, request):
        return Response(services.nav_badges())


class SettingsView(PortalStaffMixin, APIView):
    def get(self, request):
        return Response(services.portal_settings_payload(request.user))


class OrderViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    lookup_field = "number"
    lookup_value_regex = r"[A-Za-z0-9\-]+"

    def get_queryset(self):
        qs = services.order_queryset()
        return services.filter_orders(
            qs,
            status=self.request.query_params.get("status", "").strip(),
            search=self.request.query_params.get("search", "").strip(),
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PortalOrderDetailSerializer
        return PortalOrderListSerializer

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, number=None):
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            change_order_status(
                order,
                serializer.validated_data["status"],
                request.user,
                serializer.validated_data.get("note") or "Updated from owner portal",
            )
        except InvalidStatusTransition as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        return Response(PortalOrderDetailSerializer(order).data)


class PortalProductPagination(PageNumberPagination):
    page_size = 200
    page_size_query_param = "page_size"
    max_page_size = 500


class ProductViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = PortalProductPagination

    def get_queryset(self):
        qs = services.product_queryset()
        active_param = self.request.query_params.get("active")
        active = None
        if active_param in {"1", "true", "True"}:
            active = True
        elif active_param in {"0", "false", "False"}:
            active = False
        low_stock = self.request.query_params.get("low_stock") in {"1", "true", "True"}
        category_raw = self.request.query_params.get("category", "").strip()
        category_id = None
        if category_raw.isdigit():
            category_id = int(category_raw)
        return services.filter_products(
            qs,
            search=self.request.query_params.get("search", "").strip(),
            active=active,
            low_stock=low_stock,
            stock=self.request.query_params.get("stock", "").strip(),
            category_id=category_id,
        )

    def get_serializer_class(self):
        if self.action == "create":
            return PortalProductCreateSerializer
        if self.action == "retrieve":
            return PortalProductDetailSerializer
        if self.action in {"partial_update", "update"}:
            return PortalProductUpdateSerializer
        return PortalProductListSerializer

    def create(self, request, *args, **kwargs):
        serializer = PortalProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = services.create_portal_product(**serializer.validated_data, user=request.user)
        from apps.store.campaigns import notify_new_arrival, safe_notify

        safe_notify(notify_new_arrival, product)
        return product_detail_response(product, request, status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        product = self.get_object()
        serializer = PortalProductUpdateSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return product_detail_response(product, request)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="variants")
    def add_variant(self, request, pk=None):
        product = self.get_object()
        serializer = PortalVariantWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        variant = services.add_portal_variant(
            product,
            name=data["name"],
            price=data["price"],
            compare_at_price=data.get("compare_at_price"),
            stock_quantity=data.get("stock_quantity") or 0,
            user=request.user,
        )
        compare = data.get("compare_at_price")
        if compare is not None and data["price"] < compare:
            from apps.store.campaigns import notify_product_sale, safe_notify

            safe_notify(
                notify_product_sale,
                product,
                price=data["price"],
                compare_at_price=compare,
            )
        return product_detail_response(variant.product, request, status.HTTP_201_CREATED)


class VariantStockView(PortalStaffMixin, APIView):
    def post(self, request, pk):
        variant = get_object_or_404(ProductVariant.objects.select_related("product"), pk=pk)
        serializer = StockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            updated = change_stock(
                variant.id,
                data["quantity_change"],
                data["reason"],
                data.get("reference") or "Owner portal",
                request.user,
            )
        except InsufficientStockError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "id": updated.id,
                "sku": updated.sku,
                "stock_quantity": updated.stock_quantity,
                "product_id": updated.product_id,
            }
        )


class VariantDetailView(PortalStaffMixin, APIView):
    def patch(self, request, pk):
        variant = get_object_or_404(ProductVariant.objects.select_related("product"), pk=pk)
        serializer = PortalVariantUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        was_on_sale = (
            variant.compare_at_price is not None and variant.price < variant.compare_at_price
        )
        updated = services.update_portal_variant(variant, **serializer.validated_data)
        now_on_sale = (
            updated.compare_at_price is not None and updated.price < updated.compare_at_price
        )
        if now_on_sale and not was_on_sale:
            from apps.store.campaigns import notify_product_sale, safe_notify

            safe_notify(
                notify_product_sale,
                updated.product,
                price=updated.price,
                compare_at_price=updated.compare_at_price,
            )
        return product_detail_response(updated.product, request)

    def delete(self, request, pk):
        variant = get_object_or_404(ProductVariant.objects.select_related("product"), pk=pk)
        if variant.product.variants.count() <= 1:
            return Response(
                {"detail": "A product needs at least one option. Delete the product instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product = variant.product
        variant.delete()
        return product_detail_response(product, request)


class VariantOutOfStockView(PortalStaffMixin, APIView):
    def post(self, request, pk):
        variant = get_object_or_404(ProductVariant, pk=pk)
        updated = services.mark_variant_out_of_stock(variant, request.user)
        return Response(
            {
                "id": updated.id,
                "sku": updated.sku,
                "stock_quantity": updated.stock_quantity,
                "product_id": updated.product_id,
            }
        )


class CatalogOptionsView(PortalStaffMixin, APIView):
    def get(self, request):
        return Response(services.catalog_options())


class ProductImagesView(PortalStaffMixin, APIView):
    def post(self, request, pk):
        product = get_object_or_404(services.product_queryset(), pk=pk)
        files = request.FILES.getlist("images") or request.FILES.getlist("image")
        try:
            services.add_product_images(product, files, alt_text=request.data.get("alt_text", ""))
        except services.PortalImageError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return product_detail_response(product, request, status.HTTP_201_CREATED)


class ProductImageView(PortalStaffMixin, APIView):
    def patch(self, request, pk, image_id):
        product = get_object_or_404(services.product_queryset(), pk=pk)
        try:
            if "alt_text" in request.data:
                services.update_product_image(product, image_id, alt_text=request.data.get("alt_text", ""))
            if "position" in request.data:
                services.place_product_image(product, image_id, request.data.get("position"))
            move = request.data.get("move")
            if move:
                if move not in {"earlier", "later"}:
                    return Response(
                        {"detail": "Move a photo earlier or later."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                services.move_product_image(product, image_id, move)
        except services.PortalImageError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return product_detail_response(product, request)

    def delete(self, request, pk, image_id):
        product = get_object_or_404(services.product_queryset(), pk=pk)
        try:
            services.delete_product_image(product, image_id)
        except services.PortalImageError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return product_detail_response(product, request)


class ReviewViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ["get", "patch", "head", "options"]
    serializer_class = PortalReviewSerializer

    def get_queryset(self):
        qs = services.review_queryset()
        approved_param = self.request.query_params.get("approved")
        approved = None
        if approved_param in {"1", "true", "True"}:
            approved = True
        elif approved_param in {"0", "false", "False"}:
            approved = False
        return services.filter_reviews(
            qs,
            approved=approved,
            search=self.request.query_params.get("search", "").strip(),
        )


class CouponViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ["get", "post", "patch", "head", "options"]
    serializer_class = PortalCouponSerializer

    def get_queryset(self):
        qs = services.coupon_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(code__icontains=search)
        active = self.request.query_params.get("active")
        if active in {"1", "true", "True"}:
            qs = qs.filter(is_active=True)
        elif active in {"0", "false", "False"}:
            qs = qs.filter(is_active=False)
        return qs

    def perform_create(self, serializer):
        coupon = serializer.save()
        if coupon.is_active:
            from apps.store.campaigns import notify_coupon_offer, safe_notify

            safe_notify(notify_coupon_offer, coupon)

    def perform_update(self, serializer):
        was_active = serializer.instance.is_active
        coupon = serializer.save()
        if coupon.is_active and not was_active:
            from apps.store.campaigns import notify_coupon_offer, safe_notify

            safe_notify(notify_coupon_offer, coupon)


class CustomerViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    def get_queryset(self):
        from django.db.models import Q

        qs = services.customer_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
            )
        return qs.prefetch_related("addresses", "orders")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PortalCustomerDetailSerializer
        return PortalCustomerSerializer

    def _user_payload(self, user, *, detail=False):
        payload = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "date_joined": user.date_joined,
            "order_count": getattr(user, "order_count", None),
        }
        if payload["order_count"] is None:
            payload["order_count"] = user.orders.count()
        if detail:
            helper = PortalCustomerDetailSerializer()
            payload["addresses"] = helper.get_addresses(user)
            payload["recent_orders"] = helper.get_recent_orders(user)
        return payload

    def retrieve(self, request, *args, **kwargs):
        user = get_object_or_404(
            get_user_model().objects.prefetch_related("addresses", "orders"),
            pk=kwargs["pk"],
        )
        return Response(self._user_payload(user, detail=True))

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        users = page if page is not None else queryset
        data = [self._user_payload(user) for user in users]
        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)


class LookViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return services.look_queryset()

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return PortalLookUpdateSerializer
        return PortalLookSerializer

    def partial_update(self, request, *args, **kwargs):
        look = self.get_object()
        serializer = PortalLookUpdateSerializer(look, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        look = services.look_queryset().get(pk=look.pk)
        return Response(PortalLookSerializer(look, context={"request": request}).data)


class NewsletterViewSet(PortalStaffMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = NewsletterSubscriberSerializer

    def get_queryset(self):
        qs = services.newsletter_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(email__icontains=search)
        return qs

    @action(detail=False, methods=["get"], url_path="audience")
    def audience(self, request):
        from apps.store.campaigns import marketing_recipient_emails
        from apps.store.models import NewsletterSubscriber

        subscribers = NewsletterSubscriber.objects.count()
        recipients = len(marketing_recipient_emails())
        return Response(
            {
                "newsletter_subscribers": subscribers,
                "total_recipients": recipients,
                "includes_signed_up_customers": True,
            }
        )

    @action(detail=False, methods=["post"], url_path="send")
    def send(self, request):
        serializer = NewsletterCampaignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from apps.store.campaigns import compose_owner_campaign, send_marketing_campaign

        data = serializer.validated_data
        subject, text_body, html_body = compose_owner_campaign(
            kind=data["kind"],
            subject=data["subject"],
            message=data["message"],
        )
        result = send_marketing_campaign(
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )
        return Response(
            {
                "detail": (
                    f"Sent to {result['sent']} of {result['total']} recipients"
                    + (f" ({result['failed']} failed)." if result["failed"] else ".")
                ),
                **result,
            }
        )


class CategoryViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    serializer_class = PortalCategorySerializer
    pagination_class = None

    def get_queryset(self):
        from django.db.models import Q

        qs = services.category_queryset()
        active_param = self.request.query_params.get("active")
        if active_param in {"1", "true", "True"}:
            qs = qs.filter(is_active=True)
        elif active_param in {"0", "false", "False"}:
            qs = qs.filter(is_active=False)
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search)
            )
        return qs

    def _annotated(self, category):
        return services.category_queryset().get(pk=category.pk)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        out = self.get_serializer(self._annotated(category))
        headers = self.get_success_headers(out.data)
        return Response(out.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        category = self.get_object()
        serializer = self.get_serializer(category, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return Response(self.get_serializer(self._annotated(category)).data)

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.products.exists():
            return Response(
                {
                    "detail": (
                        "This category still has products. Move or delete those products first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """POST /api/portal/categories/reorder/ — set shop display order from ordered_ids."""
        serializer = StorefrontReelReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            services.reorder_categories(serializer.validated_data["ordered_ids"])
        except services.PortalImageError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        categories = services.category_queryset()
        return Response(PortalCategorySerializer(categories, many=True, context={"request": request}).data)


class StorefrontConfigView(PortalStaffMixin, APIView):
    def get(self, request):
        config = StorefrontConfig.load()
        return Response(
            PortalStorefrontConfigSerializer(config, context={"request": request}).data
        )

    def patch(self, request):
        config = StorefrontConfig.load()
        serializer = PortalStorefrontConfigSerializer(
            config, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        config = StorefrontConfig.load()
        return Response(
            PortalStorefrontConfigSerializer(config, context={"request": request}).data
        )


class StorefrontReelViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    serializer_class = PortalStorefrontReelSerializer
    pagination_class = None

    def get_queryset(self):
        return StorefrontReel.objects.all()


class StorefrontReelReorderView(PortalStaffMixin, APIView):
    def post(self, request):
        serializer = StorefrontReelReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            services.reorder_storefront_reels(serializer.validated_data["ordered_ids"])
        except services.PortalImageError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        reels = StorefrontReel.objects.all()
        return Response(
            PortalStorefrontReelSerializer(reels, many=True, context={"request": request}).data
        )


def _homepage_picks_response(request):
    ordered_ids = list(
        HomepagePick.objects.order_by("sort_order", "id").values_list("product_id", flat=True)
    )
    by_id = {
        product.pk: product
        for product in services.product_queryset().filter(pk__in=ordered_ids)
    }
    products = [by_id[pk] for pk in ordered_ids if pk in by_id]
    return Response(
        {
            "product_ids": ordered_ids,
            "products": PortalProductListSerializer(
                products, many=True, context={"request": request}
            ).data,
        }
    )


class HomepagePicksView(PortalStaffMixin, APIView):
    """GET/PUT owner-curated home page product shelf (not the Storefront layout editor)."""

    def get(self, request):
        return _homepage_picks_response(request)

    def put(self, request):
        serializer = HomepagePicksWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            replace_homepage_picks(serializer.validated_data["product_ids"])
        except HomepagePickError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return _homepage_picks_response(request)


def _portal_course_payload(course, request):
    fresh = course_services.portal_courses_queryset().prefetch_related("modules__lessons").get(
        pk=course.pk
    )
    return PortalCourseSerializer(fresh, context={"request": request}).data


def _parse_modules(raw):
    if raw is None:
        return None
    if isinstance(raw, str):
        import json

        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"modules": "Modules must be valid JSON."}) from exc
    return raw


class CourseViewSet(
    PortalStaffMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Owner CRUD for courses, including curriculum replace on write."""

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    serializer_class = PortalCourseSerializer

    def get_queryset(self):
        search = self.request.query_params.get("search", "")
        return course_services.portal_courses_queryset(search).prefetch_related(
            "modules__lessons"
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else queryset
        data = PortalCourseSerializer(rows, many=True, context={"request": request}).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        return Response(_portal_course_payload(self.get_object(), request))

    def create(self, request, *args, **kwargs):
        modules = _parse_modules(request.data.get("modules"))
        payload = {
            key: request.data.get(key)
            for key in (
                "title",
                "slug",
                "short_description",
                "description",
                "price",
                "is_published",
                "is_active",
                "sort_order",
            )
            if key in request.data
        }
        serializer = PortalCourseWriteSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        title = data.pop("title")
        slug = data.pop("slug", "") or None
        course = course_services.create_course(title=title, slug=slug, **data)
        if request.FILES.get("cover_image"):
            course.cover_image = request.FILES["cover_image"]
            course.save(update_fields=["cover_image", "updated_at"])
        if modules is not None:
            course_services.replace_curriculum(course, modules)
        return Response(_portal_course_payload(course, request), status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        course = self.get_object()
        modules = _parse_modules(request.data.get("modules")) if "modules" in request.data else None
        payload = {
            key: request.data.get(key)
            for key in (
                "title",
                "slug",
                "short_description",
                "description",
                "price",
                "is_published",
                "is_active",
                "sort_order",
            )
            if key in request.data
        }
        serializer = PortalCourseWriteSerializer(data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data:
            course = course_services.update_course(course, **serializer.validated_data)
        if request.FILES.get("cover_image"):
            course.cover_image = request.FILES["cover_image"]
            course.save(update_fields=["cover_image", "updated_at"])
        if modules is not None:
            course_services.replace_curriculum(course, modules)
        return Response(_portal_course_payload(course, request))

    def destroy(self, request, *args, **kwargs):
        course = self.get_object()
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
