from rest_framework import serializers


class AddWishlistItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
