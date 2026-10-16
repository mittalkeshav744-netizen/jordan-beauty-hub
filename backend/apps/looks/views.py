from django.db.models import Prefetch
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from .models import LookStep
from .serializers import LookDetailSerializer, LookListSerializer, LookStepSerializer
from .services import active_looks, look_with_products


class LookViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/looks/          active looks for the "Get the look" page
    GET /api/looks/{slug}/   one look with its products, total price and bag variant ids
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = LookListSerializer
    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        steps = LookStep.objects.select_related("product").prefetch_related("product__images")
        return active_looks().prefetch_related(Prefetch("steps", queryset=steps))

    def retrieve(self, request, slug=None):
        look = self.get_object()
        context = {"request": request}
        details = look_with_products(look)
        data = LookDetailSerializer(look, context=context).data
        data["steps"] = LookStepSerializer(details["steps"], many=True, context=context).data
        data["bag_variant_ids"] = details["bag_variant_ids"]
        data["total_price"] = f"{details['total_price']:.2f}"
        return Response(data)
