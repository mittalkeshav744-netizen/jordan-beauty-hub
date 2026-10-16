from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.serializers import ProductListSerializer
from config.exceptions import error_response

from .serializers import AddWishlistItemSerializer
from .services import WishlistError, add_to_wishlist, remove_from_wishlist, wishlist_products


def wishlist_response(request, status_code=status.HTTP_200_OK):
    products = list(wishlist_products(request.user))
    data = {
        "products": ProductListSerializer(products, many=True, context={"request": request}).data,
        "product_ids": [product.id for product in products],
    }
    return Response(data, status=status_code)


class WishlistView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return wishlist_response(request)

    def post(self, request):
        serializer = AddWishlistItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            add_to_wishlist(request.user, serializer.validated_data["product_id"])
        except WishlistError as error:
            return error_response(str(error))
        return wishlist_response(request, status.HTTP_201_CREATED)


class WishlistItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, product_id):
        remove_from_wishlist(request.user, product_id)
        return wishlist_response(request)
