from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.catalog.models import (
    Brand,
    Category,
    Concern,
    Product,
    ProductVariant,
    Review,
    SkinType,
    StockMovement,
)
from apps.looks.models import Look, LookStep
from apps.orders.models import Coupon

User = get_user_model()

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
    ("Gentle Foaming Face Wash", "Skincare", "Soap-free cleanser that removes oil without stripping.", False, [
        ("100 ml", "299.00", None, 40, ""),
    ]),
    ("Rose Water Toner", "Skincare", "Alcohol-free toner that refreshes and preps skin.", False, [
        ("150 ml", "249.00", None, 35, ""),
    ]),
    ("Oil-Free Gel Moisturiser", "Skincare", "Weightless hydration with a matte finish.", False, [
        ("50 g", "449.00", None, 30, ""),
    ]),
    ("Overnight Repair Cream", "Skincare", "Rich night cream that restores softness while you sleep.", False, [
        ("50 g", "649.00", "749.00", 18, ""),
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


CONCERNS = [
    ("Acne & breakouts", "acne", "Clear pores and calm breakouts."),
    ("Oily skin & shine", "oily-skin", "Control oil and shine all day."),
    ("Dull skin", "dull-skin", "Bring back a healthy glow."),
    ("Pigmentation & dark spots", "pigmentation", "Even out your skin tone."),
    ("Dryness", "dryness", "Lock in moisture for soft skin."),
    ("Tanning & sun care", "tanning", "Protect from sun and tanning."),
    ("Frizzy & damaged hair", "frizzy-hair", "Smooth, nourished, shiny hair."),
]

# product slug: (routine step, skin type slugs (empty = all), concern slugs)
PRODUCT_GUIDES = {
    "gentle-foaming-face-wash": ("cleanser", [], ["acne", "oily-skin"]),
    "rose-water-toner": ("toner", [], ["dull-skin"]),
    "vitamin-c-glow-serum": ("serum", [], ["dull-skin", "pigmentation"]),
    "oil-free-gel-moisturiser": ("moisturiser", ["oily", "combination", "normal"], ["oily-skin", "acne"]),
    "daily-sunscreen-spf-50": ("sunscreen", [], ["tanning", "pigmentation"]),
    "overnight-repair-cream": ("night_treatment", ["dry", "normal", "sensitive"], ["dryness", "dull-skin"]),
    "shea-body-lotion": ("", [], ["dryness"]),
    "repair-hair-oil": ("", [], ["frizzy-hair"]),
}

# Sample customers who write the sample reviews. They have no usable password, so nobody can sign in
# as them. (email, first name, last name)
SAMPLE_REVIEWERS = [
    ("priya.sample@example.com", "Priya", "Sharma"),
    ("ananya.sample@example.com", "Ananya", "Rao"),
    ("meera.sample@example.com", "Meera", "Kapoor"),
    ("kavya.sample@example.com", "Kavya", "Nair"),
    ("riya.sample@example.com", "Riya", "Patel"),
    ("sneha.sample@example.com", "Sneha", "Das"),
]

# product slug: [(reviewer index, rating, title, body)]
SAMPLE_REVIEWS = {
    "matte-velvet-lipstick": [
        (0, 5, "My new everyday red", "Ruby Rush is the perfect red for my skin tone. Stays on through lunch."),
        (2, 4, "Comfortable for a matte", "Doesn't dry out my lips like other mattes. Wish there were more nudes."),
        (4, 5, "Lovely finish", "Velvety, not flat. Rose Nude works for office and evenings."),
    ],
    "hydrating-lip-balm": [
        (1, 5, "Saved my winter lips", "Soft and not sticky. The Cherry Tint gives a pretty wash of colour."),
        (3, 4, "Good daily balm", "Nice and moisturising. I reapply after meals."),
    ],
    "second-skin-foundation": [
        (2, 5, "Looks like real skin", "Light and buildable. 30 Honey matched me well."),
        (5, 4, "Great for humid days", "Doesn't feel heavy. I set it with powder for a full day."),
        (0, 3, "Nice, but check your shade", "The texture is lovely, but I needed one shade deeper than I ordered."),
    ],
    "blush-stick": [
        (4, 5, "Two products in one", "I use Peach Glow on cheeks and lips. Blends easily with fingers."),
        (1, 4, "Pretty natural flush", "Pink Pop is bright in the tube but sheer on the skin. Easy to build."),
    ],
    "smudge-proof-kajal": [
        (3, 5, "Really smudge-proof", "Lasted a full workday and a wedding function without moving."),
        (5, 5, "Very black, very smooth", "Glides on the waterline without tugging."),
        (2, 4, "Good value", "Intense colour. Needs a proper makeup remover at night."),
    ],
    "volume-mascara": [
        (0, 4, "Nice volume", "Builds well with two coats and no clumps."),
        (4, 5, "Holds the curl", "My lashes stay curled all day. Easy to remove with warm water."),
    ],
    "vitamin-c-glow-serum": [
        (1, 5, "Visible glow", "My skin looks brighter after three weeks. Absorbs fast."),
        (5, 4, "Good, use sunscreen with it", "Lightweight and not sticky. Slight tingle the first few days."),
        (3, 5, "Faded my dark spots", "Slow but steady results on old acne marks."),
    ],
    "daily-sunscreen-spf-50": [
        (2, 5, "No white cast", "Finally a sunscreen that doesn't look grey on my skin."),
        (0, 4, "Light and non-greasy", "Works under makeup. I reapply after lunch."),
    ],
    "gentle-foaming-face-wash": [
        (4, 5, "Clean but not tight", "Removes oil without leaving my skin dry."),
        (3, 4, "Good for oily skin", "Fewer breakouts since I switched. Lasts a long time."),
    ],
    "rose-water-toner": [
        (5, 5, "So refreshing", "I keep it in the fridge and spray it after coming home."),
        (1, 4, "Gentle and simple", "No alcohol smell. Nice mild rose scent."),
    ],
    "oil-free-gel-moisturiser": [
        (0, 5, "Perfect for summer", "Feels like water and leaves a matte finish."),
        (2, 4, "Good for combination skin", "Enough for my T-zone. My cheeks need a little extra in winter."),
    ],
    "overnight-repair-cream": [
        (3, 5, "Wake up with soft skin", "Rich but sinks in. My dry patches are gone."),
        (4, 4, "Lovely night cream", "A little goes a long way. A bit heavy for oily skin."),
    ],
    "repair-hair-oil": [
        (5, 5, "Frizz under control", "Two drops on damp ends and my hair stays smooth all day."),
        (1, 4, "Light, not greasy", "Nice shine. I use it before washing too."),
    ],
    "shea-body-lotion": [
        (2, 5, "Deep moisture", "My skin stays soft all day, even in an air-conditioned office."),
        (0, 4, "Nice everyday lotion", "Absorbs quickly with a mild scent."),
    ],
    "blending-sponge": [
        (4, 5, "Soft and bouncy", "Gives a seamless finish when damp. Easy to wash."),
        (3, 4, "Good sponge", "Doesn't soak up too much foundation."),
    ],
}

# (title, occasion, description, [(product slug, variant name or None, instruction)])
LOOKS = [
    ("Fresh glow, no-makeup look", "Everyday", "Skin first: a dewy, healthy glow in five minutes.", [
        ("vitamin-c-glow-serum", None, "Press two drops into clean skin."),
        ("daily-sunscreen-spf-50", "50 ml", "Finish skincare with two finger-lengths of sunscreen."),
        ("blush-stick", "Peach Glow", "Tap onto the cheeks and blend with your fingers."),
        ("hydrating-lip-balm", "Clear", "Add a soft shine to the lips."),
    ]),
    ("Office-ready in ten minutes", "Office", "Polished, natural coverage that lasts from meetings to dinner.", [
        ("second-skin-foundation", "20 Sand", "Dot on the face and blend outwards."),
        ("blending-sponge", None, "Bounce the damp sponge over the skin for a seamless finish."),
        ("smudge-proof-kajal", None, "Line the lower waterline."),
        ("hydrating-lip-balm", "Cherry Tint", "Finish with a wash of colour."),
    ]),
    ("Festive glam", "Festive", "Bold eyes and a classic red lip for Diwali, weddings and parties.", [
        ("second-skin-foundation", "30 Honey", "Build two thin layers for full coverage."),
        ("blush-stick", "Pink Pop", "Swipe on the cheekbones and blend upwards."),
        ("smudge-proof-kajal", None, "Smudge along the upper lash line for a smoky edge."),
        ("volume-mascara", None, "Two coats from root to tip."),
        ("matte-velvet-lipstick", "01 Ruby Rush", "Line and fill for a bold red lip."),
    ]),
]


class Command(BaseCommand):
    help = (
        "Create sample categories, products, variants, concerns, looks, reviews and a coupon for "
        "local development. Existing records are left as they are."
    )

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
            self._seed_guides()
            looks_created = self._seed_looks()
            reviews_created = self._seed_reviews()

        self.stdout.write(
            self.style.SUCCESS(
                f"Sample catalog ready ({created_count} new products, {looks_created} new looks, "
                f"{reviews_created} new reviews)."
            )
        )

    def _seed_guides(self):
        """Concerns, plus quiz tags for sample products that have none yet."""
        concerns = {}
        for order, (name, slug, description) in enumerate(CONCERNS):
            concerns[slug], _ = Concern.objects.get_or_create(
                slug=slug, defaults={"name": name, "description": description, "sort_order": order}
            )
        skin_types = {skin_type.slug: skin_type for skin_type in SkinType.objects.all()}

        for slug, (step, skin_slugs, concern_slugs) in PRODUCT_GUIDES.items():
            product = Product.objects.filter(slug=slug).first()
            if product is None or product.routine_step or product.concerns.exists():
                continue
            if step:
                product.routine_step = step
                product.save(update_fields=["routine_step", "updated_at"])
            product.skin_types.set([skin_types[s] for s in skin_slugs if s in skin_types])
            product.concerns.set([concerns[s] for s in concern_slugs])

    def _seed_looks(self):
        created_count = 0
        for order, (title, occasion, description, steps) in enumerate(LOOKS):
            look, created = Look.objects.get_or_create(
                slug=slugify(title),
                defaults={
                    "title": title,
                    "occasion": occasion,
                    "description": description,
                    "sort_order": order,
                },
            )
            if not created:
                continue
            created_count += 1
            for step_order, (product_slug, variant_name, instruction) in enumerate(steps):
                product = Product.objects.filter(slug=product_slug).first()
                if product is None:
                    continue
                LookStep.objects.create(
                    look=look,
                    product=product,
                    variant=product.variants.filter(name=variant_name).first() if variant_name else None,
                    instruction=instruction,
                    sort_order=step_order,
                )
        return created_count

    def _seed_reviews(self):
        reviewers = []
        for email, first_name, last_name in SAMPLE_REVIEWERS:
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create_user(email, password=None, first_name=first_name, last_name=last_name)
            reviewers.append(user)

        created_count = 0
        now = timezone.now()
        for slug, reviews in SAMPLE_REVIEWS.items():
            product = Product.objects.filter(slug=slug).first()
            if product is None:
                continue
            for order, (reviewer, rating, title, body) in enumerate(reviews):
                review, created = Review.objects.get_or_create(
                    product=product,
                    user=reviewers[reviewer],
                    defaults={"rating": rating, "title": title, "body": body},
                )
                if created:
                    created_count += 1
                    days_ago = 4 + order * 9 + reviewer * 2
                    Review.objects.filter(pk=review.pk).update(created_at=now - timedelta(days=days_ago))
        return created_count
