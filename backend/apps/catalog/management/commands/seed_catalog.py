from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.catalog.models import Brand, Category, Product, ProductVariant, StockMovement
from apps.orders.models import Coupon

CATEGORIES = [
    ("Lips", "Lipsticks, liquid lipsticks and lip care."),
    ("Face", "Foundations, concealers, primers and blush."),
    ("Eyes", "Kajal, eyeliner, mascara and eyeshadow."),
    ("Skincare", "Cleansers, serums, moisturisers and sunscreen."),
    ("Haircare", "Shampoos, conditioners and hair oils."),
    ("Body Care", "Body lotions, scrubs and washes."),
    ("Accessories", "Brushes, sponges and beauty tools."),
]

# (name, category, short description, featured, [(variant, price, compare_at, stock, hex)])
PRODUCTS = [
    ("Matte Velvet Lipstick", "Lips", "Long-wear matte colour with a soft velvet finish.", True, [
        ("01 Ruby Rush", "699.00", "799.00", 25, "#9B1B30"),
        ("02 Rose Nude", "699.00", "799.00", 18, "#B5706B"),
        ("03 Berry Bold", "699.00", None, 0, "#6E1F3B"),
    ]),
    ("Hydrating Lip Balm", "Lips", "Tinted balm with shea butter for everyday softness.", False, [
        ("Cherry Tint", "299.00", None, 40, "#C2364B"),
        ("Clear", "249.00", None, 35, ""),
    ]),
    ("Second Skin Foundation", "Face", "Lightweight buildable coverage with a natural finish.", True, [
        ("10 Ivory", "1199.00", None, 12, "#F1D3B5"),
        ("20 Sand", "1199.00", None, 15, "#D9AE86"),
        ("30 Honey", "1199.00", None, 9, "#B98554"),
        ("40 Cocoa", "1199.00", None, 6, "#7E5236"),
    ]),
    ("Blush Stick", "Face", "Creamy multi-use stick for cheeks and lips.", False, [
        ("Peach Glow", "549.00", "649.00", 20, "#F08A6C"),
        ("Pink Pop", "549.00", "649.00", 14, "#E2557A"),
    ]),
    ("Smudge-Proof Kajal", "Eyes", "Intense black kajal that stays put for hours.", True, [
        ("Jet Black", "349.00", None, 60, "#111111"),
    ]),
    ("Volume Mascara", "Eyes", "Buildable volume without clumps.", False, [
        ("Black", "599.00", None, 22, "#1A1A1A"),
    ]),
    ("Vitamin C Glow Serum", "Skincare", "Brightening serum with 10% vitamin C.", True, [
        ("30 ml", "899.00", "999.00", 30, ""),
    ]),
    ("Daily Sunscreen SPF 50", "Skincare", "Light, non-greasy broad-spectrum protection.", True, [
        ("50 ml", "499.00", None, 45, ""),
        ("100 ml", "849.00", None, 20, ""),
    ]),
    ("Repair Hair Oil", "Haircare", "Nourishing blend for frizz-free shine.", False, [
        ("100 ml", "449.00", None, 28, ""),
    ]),
    ("Shea Body Lotion", "Body Care", "Deep moisture for soft, smooth skin.", False, [
        ("200 ml", "399.00", None, 33, ""),
    ]),
    ("Blending Sponge", "Accessories", "Soft, latex-free sponge for a seamless finish.", False, [
        ("Pink", "249.00", None, 50, "#F4A6C0"),
    ]),
]


class Command(BaseCommand):
    help = "Create sample categories, products, variants and a coupon for local development."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_catalog is for development only (DJANGO_DEBUG must be True).")

        with transaction.atomic():
            brand, _ = Brand.objects.get_or_create(
                slug="jordan-beauty", defaults={"name": "Jordan Beauty"}
            )
            categories = {}
            for index, (name, description) in enumerate(CATEGORIES):
                categories[name], _ = Category.objects.get_or_create(
                    slug=slugify(name),
                    defaults={"name": name, "description": description, "sort_order": index},
                )

            created_count = 0
            for name, category, short_description, featured, variants in PRODUCTS:
                product, created = Product.objects.get_or_create(
                    slug=slugify(name),
                    defaults={
                        "name": name,
                        "brand": brand,
                        "category": categories[category],
                        "short_description": short_description,
                        "description": f"{short_description} (Sample product description.)",
                        "is_featured": featured,
                    },
                )
                if not created:
                    continue
                created_count += 1
                for order, (variant_name, price, compare_at, stock, shade) in enumerate(variants):
                    variant = ProductVariant.objects.create(
                        product=product,
                        name=variant_name,
                        sku=f"JB-{product.pk:04d}-{order + 1:02d}",
                        price=Decimal(price),
                        compare_at_price=Decimal(compare_at) if compare_at else None,
                        stock_quantity=stock,
                        shade_hex=shade,
                        sort_order=order,
                    )
                    if stock:
                        StockMovement.objects.create(
                            variant=variant,
                            quantity_change=stock,
                            reason=StockMovement.Reason.RESTOCK,
                            reference="Sample data",
                        )

            Coupon.objects.get_or_create(
                code="WELCOME10",
                defaults={
                    "description": "10% off your first order (up to ₹200)",
                    "discount_type": Coupon.DiscountType.PERCENTAGE,
                    "value": Decimal("10"),
                    "max_discount_amount": Decimal("200"),
                    "min_order_amount": Decimal("499"),
                    "usage_limit_per_user": 1,
                    "valid_from": timezone.now() - timedelta(days=1),
                },
            )

        self.stdout.write(self.style.SUCCESS(f"Sample catalog ready ({created_count} new products)."))
