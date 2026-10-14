import uuid
from datetime import timedelta
from decimal import Decimal

from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cart.services import add_item
from apps.catalog.models import StockMovement
from apps.orders.models import Coupon, Order
from apps.orders.services import change_order_status
from apps.payments.models import Payment
from apps.test_factories import make_address, make_coupon, make_product, make_user


class CheckoutTestCase(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.address = make_address(self.user)
        self.client.force_authenticate(self.user)
        self.variant = make_product(price="400.00", stock=5).variants.get()

    def checkout(self, key=None, **extra):
        payload = {"address_id": self.address.pk, "idempotency_key": str(key or uuid.uuid4())}
        payload.update(extra)
        return self.client.post("/api/orders/", payload)


class OrderCreationTests(CheckoutTestCase):
    def test_order_snapshots_items_reduces_stock_and_clears_cart(self):
        add_item(self.user, self.variant.pk, 2)
        response = self.checkout()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["subtotal"], "800.00")
        self.assertEqual(response.data["grand_total"], "800.00")
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(response.data["payment_status"], "Pending")
        item = response.data["items"][0]
        self.assertEqual((item["sku"], item["unit_price"], item["quantity"]), (self.variant.sku, "400.00", 2))

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_quantity, 3)
        self.assertTrue(StockMovement.objects.filter(reason="order", quantity_change=-2).exists())
        self.assertEqual(self.client.get("/api/cart/").data["items"], [])

    def test_price_change_after_order_does_not_change_order(self):
        add_item(self.user, self.variant.pk, 1)
        number = self.checkout().data["number"]
        self.variant.price = Decimal("999.00")
        self.variant.save()
        detail = self.client.get(f"/api/orders/{number}/").data
        self.assertEqual(detail["items"][0]["unit_price"], "400.00")
        self.assertEqual(detail["grand_total"], "400.00")

    def test_empty_cart_cannot_checkout(self):
        response = self.checkout()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Your bag is empty.")

    def test_insufficient_stock_blocks_order(self):
        add_item(self.user, self.variant.pk, 3)
        self.variant.stock_quantity = 1
        self.variant.save()
        response = self.checkout()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

    def test_duplicate_submission_creates_one_order(self):
        add_item(self.user, self.variant.pk, 1)
        key = uuid.uuid4()
        first = self.checkout(key)
        second = self.checkout(key)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["number"], second.data["number"])
        self.assertEqual(Order.objects.count(), 1)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_quantity, 4)

    def test_cannot_use_another_users_address(self):
        add_item(self.user, self.variant.pk, 1)
        other_address = make_address(make_user())
        response = self.checkout(address_id=other_address.pk)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_client_cannot_override_totals(self):
        add_item(self.user, self.variant.pk, 1)
        response = self.checkout(grand_total="1.00", subtotal="1.00")
        self.assertEqual(response.data["grand_total"], "400.00")

    @override_settings(SHIPPING_FLAT_FEE=Decimal("49.00"), FREE_SHIPPING_THRESHOLD=Decimal("999.00"))
    def test_shipping_fee_and_free_shipping_threshold(self):
        add_item(self.user, self.variant.pk, 1)
        self.assertEqual(self.checkout().data["grand_total"], "449.00")
        add_item(self.user, self.variant.pk, 3)
        self.assertEqual(self.checkout().data["shipping_total"], "0.00")

    def test_payment_record_is_separate_from_order_status(self):
        add_item(self.user, self.variant.pk, 1)
        order = Order.objects.get(number=self.checkout().data["number"])
        self.assertEqual(order.payment.method, Payment.Method.CASH_ON_DELIVERY)
        self.assertEqual(order.payment.status, Payment.Status.PENDING)
        for next_status in ["confirmed", "processing", "shipped", "delivered"]:
            order = change_order_status(order, next_status)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, Payment.Status.PAID)


class OrderAccessAndCancellationTests(CheckoutTestCase):
    def place(self, quantity=2):
        add_item(self.user, self.variant.pk, quantity)
        return self.checkout().data["number"]

    def test_orders_require_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/orders/").status_code, 403)

    def test_user_cannot_see_another_users_order(self):
        number = self.place()
        self.client.force_authenticate(make_user())
        self.assertEqual(self.client.get(f"/api/orders/{number}/").status_code, 404)
        self.assertEqual(self.client.get("/api/orders/").data["count"], 0)

    def test_customer_cancellation_restores_stock(self):
        number = self.place(2)
        response = self.client.post(f"/api/orders/{number}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")
        self.assertEqual(response.data["payment_status"], "Cancelled")
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_quantity, 5)

    def test_shipped_order_cannot_be_cancelled_by_customer(self):
        number = self.place()
        order = Order.objects.get(number=number)
        for next_status in ["confirmed", "processing", "shipped"]:
            order = change_order_status(order, next_status)
        response = self.client.post(f"/api/orders/{number}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_history_is_recorded(self):
        number = self.place()
        self.client.post(f"/api/orders/{number}/cancel/")
        history = self.client.get(f"/api/orders/{number}/").data["status_history"]
        self.assertEqual([entry["to_status"] for entry in history], ["pending", "cancelled"])


class CouponTests(CheckoutTestCase):
    def quote(self, code):
        return self.client.post("/api/orders/quote/", {"coupon_code": code})

    def test_percentage_coupon_with_cap(self):
        make_coupon("SAVE10", value=Decimal("10"), max_discount_amount=Decimal("50"))
        add_item(self.user, self.variant.pk, 2)
        response = self.quote("save10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["discount_total"], "50.00")
        self.assertEqual(response.data["grand_total"], "750.00")

    def test_fixed_coupon_never_exceeds_subtotal(self):
        make_coupon("BIG", discount_type=Coupon.DiscountType.FIXED, value=Decimal("5000"))
        add_item(self.user, self.variant.pk, 1)
        self.assertEqual(self.quote("BIG").data["grand_total"], "0.00")

    def test_invalid_expired_and_minimum_order_coupons(self):
        add_item(self.user, self.variant.pk, 1)
        self.assertEqual(self.quote("NOPE").status_code, 400)

        make_coupon("OLD", valid_until=timezone.now() - timedelta(hours=1))
        self.assertIn("expired", self.quote("OLD").data["detail"])

        make_coupon("MIN", min_order_amount=Decimal("1000"))
        self.assertEqual(self.quote("MIN").status_code, 400)

        make_coupon("OFF", is_active=False)
        self.assertEqual(self.quote("OFF").status_code, 400)

    def test_coupon_applied_at_checkout_and_usage_limit_per_user(self):
        coupon = make_coupon("ONCE", usage_limit_per_user=1)
        add_item(self.user, self.variant.pk, 1)
        response = self.checkout(coupon_code="ONCE")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["discount_total"], "40.00")
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 1)

        add_item(self.user, self.variant.pk, 1)
        response = self.checkout(coupon_code="ONCE")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 1)

    def test_cancelling_order_releases_coupon_usage(self):
        coupon = make_coupon("ONCE", usage_limit_per_user=1, usage_limit=1)
        add_item(self.user, self.variant.pk, 1)
        number = self.checkout(coupon_code="ONCE").data["number"]
        self.client.post(f"/api/orders/{number}/cancel/")
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 0)
        self.assertEqual(self.quote("ONCE").status_code, status.HTTP_200_OK)
