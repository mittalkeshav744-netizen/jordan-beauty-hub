from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import Address
from config.exceptions import error_response

from .models import Order
from .serializers import (
    CheckoutSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    QuoteSerializer,
)
from .services import (
    CheckoutError,
    InvalidStatusTransition,
    cancel_order_by_customer,
    place_order,
    quote_cart,
)


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "number"

    def get_queryset(self):
        queryset = Order.objects.filter(user=self.request.user).prefetch_related("items")
        if self.action != "list":
            queryset = queryset.select_related("payment").prefetch_related(
                "items__variant__product", "status_history"
            )
        return queryset

    def get_serializer_class(self):
        return OrderListSerializer if self.action == "list" else OrderDetailSerializer

    def create(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        address = get_object_or_404(Address, pk=data["address_id"], user=request.user)
        try:
            order, created = place_order(
                user=request.user,
                address=address,
                idempotency_key=data["idempotency_key"],
                coupon_code=data.get("coupon_code", ""),
                customer_note=data.get("customer_note", ""),
            )
        except CheckoutError as error:
            return error_response(str(error))
        order = self.get_queryset().get(pk=order.pk)
        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def quote(self, request):
        """Price the current cart, optionally with a coupon, without placing an order."""
        serializer = QuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            quote = quote_cart(request.user, serializer.validated_data.get("coupon_code", ""))
        except CheckoutError as error:
            return error_response(str(error), errors={"coupon_code": [str(error)]})
        return Response(quote.as_dict())

    @action(detail=True, methods=["post"])
    def cancel(self, request, number=None):
        order = self.get_object()
        try:
            cancel_order_by_customer(order, request.user)
        except InvalidStatusTransition as error:
            return error_response(str(error))
        return Response(OrderDetailSerializer(self.get_queryset().get(pk=order.pk)).data)
