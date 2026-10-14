from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from config.exceptions import error_response

from .models import CartItem
from .serializers import AddCartItemSerializer, CartItemSerializer, UpdateCartItemSerializer
from .services import (
    CartError,
    add_item,
    calculate_subtotal,
    cart_items_queryset,
    get_cart,
    update_item_quantity,
)


def cart_response(request, status_code=status.HTTP_200_OK):
    cart = get_cart(request.user)
    items = list(cart_items_queryset(cart))
    data = {
        "items": CartItemSerializer(items, many=True, context={"request": request}).data,
        "item_count": sum(item.quantity for item in items),
        "subtotal": f"{calculate_subtotal(items):.2f}",
    }
    return Response(data, status=status_code)


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return cart_response(request)

    def delete(self, request):
        get_cart(request.user).items.all().delete()
        return cart_response(request)


class CartItemListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            add_item(request.user, **serializer.validated_data)
        except CartError as error:
            return error_response(str(error))
        return cart_response(request, status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_item(self, request, item_id):
        return get_object_or_404(
            CartItem.objects.select_related("variant__product"),
            pk=item_id,
            cart__user=request.user,
        )

    def patch(self, request, item_id):
        item = self.get_item(request, item_id)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            update_item_quantity(item, serializer.validated_data["quantity"])
        except CartError as error:
            return error_response(str(error))
        return cart_response(request)

    def delete(self, request, item_id):
        self.get_item(request, item_id).delete()
        return cart_response(request)
