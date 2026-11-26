from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order
from apps.portal.permissions import IsStaffUser

from . import services
from .models import Payment


@api_view(["GET"])
@permission_classes([AllowAny])
def payment_methods(request):
    return Response(services.public_payment_settings())


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def razorpay_create(request):
    order_number = (request.data.get("order_number") or "").strip()
    order = get_object_or_404(Order, number=order_number, user=request.user)
    payment = getattr(order, "payment", None)
    if payment is None:
        return Response({"detail": "No payment record for this order."}, status=400)
    if payment.status == Payment.Status.PAID:
        return Response({"detail": "This order is already paid."}, status=400)
    try:
        payload = services.create_razorpay_order(payment)
    except services.PaymentsNotConfigured as exc:
        return Response({"detail": str(exc)}, status=503)
    except Exception as exc:  # noqa: BLE001
        return Response({"detail": str(exc)}, status=502)
    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def razorpay_verify(request):
    order_number = (request.data.get("order_number") or "").strip()
    order = get_object_or_404(Order, number=order_number, user=request.user)
    payment = getattr(order, "payment", None)
    if payment is None:
        return Response({"detail": "No payment record for this order."}, status=400)
    try:
        services.verify_razorpay_payment(
            payment=payment,
            razorpay_order_id=request.data.get("razorpay_order_id") or "",
            razorpay_payment_id=request.data.get("razorpay_payment_id") or "",
            razorpay_signature=request.data.get("razorpay_signature") or "",
        )
    except services.PaymentsNotConfigured as exc:
        return Response({"detail": str(exc)}, status=503)
    except services.PaymentVerificationError as exc:
        return Response({"detail": str(exc)}, status=400)
    return Response({"detail": "Payment verified.", "status": payment.status})


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsStaffUser])
def razorpay_webhook(request):
    """Placeholder webhook endpoint — wire secret verification when keys are live."""
    if not services.razorpay_enabled():
        return Response({"detail": "Razorpay is not configured."}, status=503)
    # Acknowledge so Razorpay does not retry endlessly during setup.
    return Response({"detail": "Webhook received (configure signature checks before go-live)."})
