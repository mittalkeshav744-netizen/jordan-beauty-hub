"""
Seed realistic owner-portal demo data (DEBUG only).

Creates shoppers, addresses, orders across statuses, pending reviews, coupons
and newsletter rows so /manage has something to click through.

Usage:
  python manage.py seed_catalog
  python manage.py seed_portal_demo
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Address
from apps.cart.services import add_item, get_cart
from apps.catalog.models import Product, ProductVariant, Review
from apps.orders.models import Coupon, Order
from apps.orders.services import change_order_status, place_order
from apps.store.models import NewsletterSubscriber
from apps.store.services import subscribe_to_newsletter

User = get_user_model()
DEMO_PASSWORD = "Demo-pass-123!"

SHOPPERS = [
    ("asha.shopper@example.com", "Asha", "Rao", "9876501001"),
    ("riya.shopper@example.com", "Riya", "Mehta", "9876501002"),
    ("neha.shopper@example.com", "Neha", "Iyer", "9876501003"),
]

# Walk order through these statuses (in order) after place_order leaves it pending.
STATUS_PATH = {
    Order.Status.PENDING: [],
    Order.Status.CONFIRMED: [Order.Status.CONFIRMED],
    Order.Status.PROCESSING: [Order.Status.CONFIRMED, Order.Status.PROCESSING],
    Order.Status.SHIPPED: [Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.SHIPPED],
    Order.Status.DELIVERED: [
        Order.Status.CONFIRMED,
        Order.Status.PROCESSING,
        Order.Status.SHIPPED,
        Order.Status.DELIVERED,
    ],
}

# (email, [(variant_index, qty)], target_status, note)
ORDER_PLAN = [
    ("asha.shopper@example.com", [(0, 1), (1, 1)], Order.Status.PENDING, "COD — please confirm"),
    ("asha.shopper@example.com", [(2, 2)], Order.Status.CONFIRMED, "Ready to process"),
    ("riya.shopper@example.com", [(0, 1)], Order.Status.PROCESSING, "Packing today"),
    ("riya.shopper@example.com", [(3, 1), (4, 1)], Order.Status.SHIPPED, "Out for delivery"),
    ("neha.shopper@example.com", [(1, 1), (5, 1)], Order.Status.DELIVERED, "Delivered last week"),
    ("mittalkeshav744@gmail.com", [(0, 1)], Order.Status.PENDING, "Local account order"),
    ("mail@gmail.com", [(2, 1), (3, 1)], Order.Status.CONFIRMED, "Dev account test checkout"),
]


class Command(BaseCommand):
    help = "Seed owner-portal demo shoppers, orders, reviews and coupons (DEBUG only)."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_portal_demo is for development only (DJANGO_DEBUG must be True).")

        variants = list(
            ProductVariant.objects.filter(product__is_active=True, is_active=True)
            .select_related("product")
            .order_by("id")[:12]
        )
        if len(variants) < 6:
            raise CommandError(
                "Not enough variants. Run `python manage.py seed_catalog` first."
            )

        ProductVariant.objects.filter(pk__in=[v.pk for v in variants]).update(stock_quantity=80)

        with transaction.atomic():
            users = self._ensure_shoppers()
            self._ensure_local_accounts()
            orders_created = self._seed_orders(variants, users)
            reviews_created = self._seed_pending_reviews(users)
            coupons_created = self._seed_coupons()
            newsletter_created = self._seed_newsletter()

        self.stdout.write(
            self.style.SUCCESS(
                f"Portal demo ready: {orders_created} new orders, {reviews_created} pending reviews, "
                f"{coupons_created} coupons, {newsletter_created} newsletter signups.\n"
                f"Demo shopper password: {DEMO_PASSWORD}\n"
                f"Customers now include mail@gmail.com (staff badge) and mittalkeshav744@gmail.com."
            )
        )

    def _ensure_shoppers(self):
        users = {}
        for email, first_name, last_name, phone in SHOPPERS:
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create_user(
                    email=email,
                    password=DEMO_PASSWORD,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                )
            Address.objects.get_or_create(
                user=user,
                is_default=True,
                defaults={
                    "full_name": f"{first_name} {last_name}",
                    "phone": phone,
                    "line1": "14 Brigade Road",
                    "line2": "Near Metro",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "postal_code": "560001",
                    "country": "India",
                },
            )
            users[email] = user
        return users

    def _ensure_local_accounts(self):
        for email, full_name, phone in [
            ("mittalkeshav744@gmail.com", "Keshav Mittal", "9876502001"),
            ("mail@gmail.com", "Local Developer", "9876502002"),
            ("e2e.tester@example.com", "E2E Tester", "9876502003"),
        ]:
            user = User.objects.filter(email=email).first()
            if user is None:
                continue
            if not user.addresses.exists():
                Address.objects.create(
                    user=user,
                    full_name=full_name,
                    phone=phone,
                    line1="22 Local Test Street",
                    city="Bengaluru",
                    state="Karnataka",
                    postal_code="560002",
                    country="India",
                    is_default=True,
                )

    def _seed_orders(self, variants, users):
        created = 0
        for email, lines, target_status, note in ORDER_PLAN:
            user = users.get(email) or User.objects.filter(email=email).first()
            if user is None:
                self.stdout.write(self.style.WARNING(f"Skip order — no user {email}"))
                continue
            address = user.addresses.filter(is_default=True).first() or user.addresses.first()
            if address is None:
                self.stdout.write(self.style.WARNING(f"Skip order — no address for {email}"))
                continue

            demo_note = f"[demo] {note}"
            if Order.objects.filter(user=user, customer_note=demo_note).exists():
                continue

            get_cart(user).items.all().delete()
            for variant_index, qty in lines:
                add_item(user, variants[variant_index].pk, qty)

            order, was_created = place_order(
                user,
                address,
                uuid.uuid4(),
                coupon_code="",
                customer_note=demo_note,
            )
            if not was_created:
                continue

            for status in STATUS_PATH[target_status]:
                order = change_order_status(order, status, user, f"[demo] → {status}")
            created += 1
        return created

    def _seed_pending_reviews(self, users):
        created = 0
        products = list(Product.objects.filter(is_active=True).order_by("id")[:6])
        asha = users.get("asha.shopper@example.com")
        if not asha or len(products) < 3:
            return 0
        samples = [
            (products[0], 5, "Love this", "Texture is perfect for daily wear."),
            (products[1], 3, "Okay-ish", "Colour is nice but packaging was dented."),
            (products[2], 4, "Almost perfect", "Would buy again after a restock."),
        ]
        for product, rating, title, body in samples:
            review, was_created = Review.objects.get_or_create(
                product=product,
                user=asha,
                defaults={
                    "rating": rating,
                    "title": title,
                    "body": body,
                    "is_approved": False,
                },
            )
            if was_created:
                created += 1
            elif review.is_approved:
                review.is_approved = False
                review.save(update_fields=["is_approved", "updated_at"])
                created += 1
        return created

    def _seed_coupons(self):
        created = 0
        now = timezone.now()
        specs = [
            ("PORTAL15", "15% off portal demo", "percentage", Decimal("15"), Decimal("200")),
            ("FLAT100", "₹100 off over ₹799", "fixed", Decimal("100"), None),
        ]
        for code, description, dtype, value, cap in specs:
            _, was_created = Coupon.objects.get_or_create(
                code=code,
                defaults={
                    "description": description,
                    "discount_type": dtype,
                    "value": value,
                    "min_order_amount": Decimal("499") if dtype == "fixed" else Decimal("0"),
                    "max_discount_amount": cap,
                    "valid_from": now - timedelta(days=1),
                    "valid_until": now + timedelta(days=60),
                    "usage_limit": 100,
                    "usage_limit_per_user": 2,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
        return created

    def _seed_newsletter(self):
        created = 0
        for email in [
            "hello.beauty@example.com",
            "glow.club@example.com",
            "asha.shopper@example.com",
        ]:
            before = NewsletterSubscriber.objects.filter(email=email).exists()
            subscribe_to_newsletter(email)
            if not before:
                created += 1
        return created
