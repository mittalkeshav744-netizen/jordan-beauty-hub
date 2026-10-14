"""Small helpers that create valid test data. Used by the test suites only."""

import itertools
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import Address
from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.orders.models import Coupon

_sequence = itertools.count(1)
DEFAULT_PASSWORD = "Str0ng-pass-phrase!"


def make_user(email=None, password=DEFAULT_PASSWORD, **extra):
    number = next(_sequence)
    return get_user_model().objects.create_user(
        email=email or f"customer{number}@example.com",
        password=password,
        first_name=extra.pop("first_name", "Test"),
        last_name=extra.pop("last_name", "Customer"),
        **extra,
    )


def make_address(user, **extra):
    data = {
        "full_name": "Test Customer",
        "phone": "9876543210",
        "line1": "12 MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560001",
        "is_default": True,
    }
    data.update(extra)
    return Address.objects.create(user=user, **data)


def make_product(name=None, price="500.00", stock=10, category=None, brand=None, **extra):
    number = next(_sequence)
    name = name or f"Product {number}"
    category = category or Category.objects.create(name=f"Category {number}", slug=f"category-{number}")
    brand = brand or Brand.objects.create(name=f"Brand {number}", slug=f"brand-{number}")
    product = Product.objects.create(
        name=name, slug=f"product-{number}", category=category, brand=brand, **extra
    )
    ProductVariant.objects.create(
        product=product,
        name="Default",
        sku=f"SKU-{number}",
        price=Decimal(price),
        stock_quantity=stock,
    )
    return product


def make_coupon(code="SAVE10", **extra):
    data = {
        "discount_type": Coupon.DiscountType.PERCENTAGE,
        "value": Decimal("10"),
        "valid_from": timezone.now() - timedelta(days=1),
    }
    data.update(extra)
    return Coupon.objects.create(code=code, **data)
