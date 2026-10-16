from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from PIL import Image

from apps.catalog.models import Category, Product, ProductImage

OPENVERSE_THUMB = "https://api.openverse.org/v1/images/{}/thumb/"

# Placeholder photos for the seed_catalog products until the store's own photos are ready.
# Every photo is CC0 1.0 (public domain, commercial use allowed, no attribution required),
# found through Openverse and checked by eye for visible brand names or logos.
# (product slug, [(alt text, source page, download URL)])
SAMPLE_IMAGES = [
    ("matte-velvet-lipstick", [
        ("Red bullet lipstick on a blue background",
         "https://www.rawpixel.com/image/5916923/image-background-public-domain-blue",
         "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvaXMxNTU4OC1pbWFnZS1rd3Z3dDNlMS5qcGc.jpg"),
        ("Lipstick swatches in red and nude shades",
         "https://www.rawpixel.com/image/5904904/photo-image-face-white-background-public-domain",
         "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4ODM2OTU3LWltYWdlLWt3dnV3dXhiLmpwZw.jpg"),
    ]),
    ("hydrating-lip-balm", [
        ("Open jar of tinted pink lip balm",
         "https://www.rawpixel.com/image/5919201/image-public-domain-pink-makeup",
         "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2JzMTAzNy1pbWFnZS1rd3Z4NHRmby5qcGc.jpg"),
        ("Lip balm stick in a white tube",
         "https://www.rawpixel.com/image/11524183/white-tube-homemade-light-pink-lip-balm",
         "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMTAzOC1pbWFnZS5qcGc.jpg"),
    ]),
    ("second-skin-foundation", [
        ("Foundation stick with a swatch",
         "https://www.rawpixel.com/image/5947501/free-public-domain-cc0-photo",
         "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg2NjAzNjItaW1hZ2Uta3d5b3Z0YjUuanBn.jpg"),
    ]),
    ("blush-stick", [
        ("Blush compact with makeup brushes",
         "https://www.rawpixel.com/image/5905436/photo-image-public-domain-brush-beauty",
         "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4ODA0NTUwLWltYWdlLWt3dnV6M3B6LmpwZw.jpg"),
    ]),
    ("smudge-proof-kajal", [
        ("Black eye pencil and mascara wand",
         "https://www.rawpixel.com/image/5969582/eyeliner-mascara",
         "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvaXMxNTU4Mi1pbWFnZS1rd3lzYm50ay5qcGc.jpg"),
    ]),
    ("volume-mascara", [
        ("Mascara wand with a yellow cap",
         "https://www.rawpixel.com/image/5950999/free-public-domain-cc0-photo",
         "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHgyNjUzMDUtaW1hZ2Uta3d5cGV6bzAuanBn.jpg"),
    ]),
    ("vitamin-c-glow-serum", [
        ("Amber dropper bottle of serum",
         "https://www.rawpixel.com/image/11515770/dropper-bottle-blank-retro-label",
         "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMjMzLWltYWdlLmpwZw.jpg"),
        ("Woman applying serum with a dropper",
         "https://stocksnap.io/photo/beauty-skincare-PBIACLTCLJ",
         OPENVERSE_THUMB.format("ee61e4bf-7a08-4ad9-8fdc-2acd27c33c6a")),
    ]),
    ("daily-sunscreen-spf-50", [
        ("Woman holding a jar of face cream",
         "https://stocksnap.io/photo/woman-skin-8GLBROK819",
         OPENVERSE_THUMB.format("bdaddb70-2d1c-4ffb-8d3d-6ee1a5ddce9f")),
    ]),
    ("repair-hair-oil", [
        ("Three amber oil bottles with droppers",
         "https://www.rawpixel.com/image/11515788/bottles-beard-oil-blank-label",
         "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMjM4LWltYWdlLmpwZw.jpg"),
    ]),
    ("shea-body-lotion", [
        ("Woman holding an open jar of body cream",
         "https://stocksnap.io/photo/woman-skin-ZD257KAS8U",
         OPENVERSE_THUMB.format("edda94c6-2cb5-4f7b-a42a-fc28cac16531")),
    ]),
    ("blending-sponge", [
        ("Makeup brushes and beauty tools",
         "https://stocksnap.io/photo/brush-makeup-W55QEDBEXB",
         OPENVERSE_THUMB.format("5745d945-c1ff-4e96-b4ea-cf3c4f2daf46")),
    ]),
]

MAX_PRODUCT_IMAGES = 3
SAMPLE_IMAGE_DIR = Path(__file__).resolve().parents[2] / "sample_images"

# AI-generated placeholder photos in apps/catalog/sample_images/. They follow the CC0 photos above
# so every sample product has MAX_PRODUCT_IMAGES photos. Replace them with real product photos.
# (product slug, [(alt text, file name)])
AI_IMAGES = [
    ("matte-velvet-lipstick", [
        ("Matte lipsticks in ruby red, rose nude and berry", "matte-velvet-lipstick-3-ai.jpg"),
    ]),
    ("hydrating-lip-balm", [
        ("Cherry-tinted lip balm on soft lips", "hydrating-lip-balm-3-ai.jpg"),
    ]),
    ("second-skin-foundation", [
        ("Foundation bottles from ivory to cocoa with swatches", "second-skin-foundation-2-ai.jpg"),
        ("Woman blending foundation with a pink sponge", "second-skin-foundation-3-ai.jpg"),
    ]),
    ("blush-stick", [
        ("Peach and pink blush sticks with swatches", "blush-stick-2-ai.jpg"),
        ("Smiling woman with a peach-pink blush", "blush-stick-3-ai.jpg"),
    ]),
    ("smudge-proof-kajal", [
        ("Eye lined with jet black kajal", "smudge-proof-kajal-2-ai.jpg"),
        ("Black kajal pencil with a swatch", "smudge-proof-kajal-3-ai.jpg"),
    ]),
    ("volume-mascara", [
        ("Mascara wand combing through full lashes", "volume-mascara-2-ai.jpg"),
        ("Black mascara tube with its wand", "volume-mascara-3-ai.jpg"),
    ]),
    ("vitamin-c-glow-serum", [
        ("Vitamin C serum drops beside fresh oranges", "vitamin-c-glow-serum-3-ai.jpg"),
    ]),
    ("daily-sunscreen-spf-50", [
        ("Sunscreen tube with a sun hat and sunglasses", "daily-sunscreen-spf-50-2-ai.jpg"),
        ("Woman applying dots of sunscreen outdoors", "daily-sunscreen-spf-50-3-ai.jpg"),
    ]),
    ("gentle-foaming-face-wash", [
        ("Face wash tube with water droplets and leaves", "gentle-foaming-face-wash-1-ai.jpg"),
        ("Hands holding a soft cleanser foam", "gentle-foaming-face-wash-2-ai.jpg"),
        ("Woman rinsing her face over a basin", "gentle-foaming-face-wash-3-ai.jpg"),
    ]),
    ("rose-water-toner", [
        ("Rose water mist bottle with rose petals", "rose-water-toner-1-ai.jpg"),
        ("Toner mist sprayed onto glowing skin", "rose-water-toner-2-ai.jpg"),
        ("Cotton pads with rose toner and petals", "rose-water-toner-3-ai.jpg"),
    ]),
    ("oil-free-gel-moisturiser", [
        ("Open jar of clear gel moisturiser", "oil-free-gel-moisturiser-1-ai.jpg"),
        ("Swirl of light gel moisturiser texture", "oil-free-gel-moisturiser-2-ai.jpg"),
        ("Woman smoothing gel moisturiser onto her cheek", "oil-free-gel-moisturiser-3-ai.jpg"),
    ]),
    ("overnight-repair-cream", [
        ("Night cream jar on a bedside table", "overnight-repair-cream-1-ai.jpg"),
        ("Rich whipped night cream texture", "overnight-repair-cream-2-ai.jpg"),
        ("Woman applying night cream before bed", "overnight-repair-cream-3-ai.jpg"),
    ]),
    ("repair-hair-oil", [
        ("Hair oil drop with hibiscus and almonds", "repair-hair-oil-2-ai.jpg"),
        ("Long, glossy, smooth dark hair", "repair-hair-oil-3-ai.jpg"),
    ]),
    ("shea-body-lotion", [
        ("Body lotion pump bottle with shea butter", "shea-body-lotion-2-ai.jpg"),
        ("Hand smoothing body lotion onto an arm", "shea-body-lotion-3-ai.jpg"),
    ]),
    ("blending-sponge", [
        ("Two pink teardrop blending sponges", "blending-sponge-2-ai.jpg"),
        ("Damp pink sponge with a dot of foundation", "blending-sponge-3-ai.jpg"),
    ]),
]

# Category tiles blend these over a gradient (multiply), so each photo is cropped to the product and
# its light background is lifted to pure white.
# (category slug, source page, download URL, crop box as fractions (left, top, right, bottom), white point)
CATEGORY_IMAGES = [
    ("lips",
     "https://www.rawpixel.com/image/5904904/photo-image-face-white-background-public-domain",
     "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4ODM2OTU3LWltYWdlLWt3dnV3dXhiLmpwZw.jpg",
     (0.08, 0.03, 0.55, 0.97), 250),
    ("face",
     "https://www.rawpixel.com/image/5947501/free-public-domain-cc0-photo",
     "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg2NjAzNjItaW1hZ2Uta3d5b3Z0YjUuanBn.jpg",
     (0.05, 0.08, 1.0, 1.0), 228),
    ("eyes",
     "https://www.rawpixel.com/image/5950999/free-public-domain-cc0-photo",
     "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHgyNjUzMDUtaW1hZ2Uta3d5cGV6bzAuanBn.jpg",
     (0.22, 0.2, 0.82, 0.8), 232),
    ("skincare",
     "https://www.rawpixel.com/image/11515770/dropper-bottle-blank-retro-label",
     "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMjMzLWltYWdlLmpwZw.jpg",
     (0.3, 0.05, 0.72, 0.8), 250),
    ("haircare",
     "https://www.rawpixel.com/image/11515788/bottles-beard-oil-blank-label",
     "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMjM4LWltYWdlLmpwZw.jpg",
     (0.25, 0.05, 0.75, 0.82), 250),
    ("body-care",
     "https://www.rawpixel.com/image/11524180/open-container-activated-charcoal-facemask",
     "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzODk2LWltYWdlLmpwZw.jpg",
     (0.27, 0.15, 0.73, 0.88), 250),
    ("accessories",
     "https://stocksnap.io/photo/brush-makeup-W55QEDBEXB",
     OPENVERSE_THUMB.format("5745d945-c1ff-4e96-b4ea-cf3c4f2daf46"),
     (0.08, 0.0, 0.92, 1.0), 238),
]

MAX_SIDE = 1200


def fetch_image(url, crop=None, white_point=255):
    """Download an image and return it as JPEG bytes, at most MAX_SIDE pixels on its longest side.

    crop is (left, top, right, bottom) as fractions of the image; channel values at or above
    white_point become pure white. Network and image-decoding failures raise OSError.
    """
    request = Request(url, headers={"User-Agent": "JordanBeautyHub-dev/1.0"})
    with urlopen(request, timeout=30) as response:
        data = response.read()
    image = Image.open(BytesIO(data)).convert("RGB")
    if crop:
        left, top, right, bottom = crop
        width, height = image.size
        image = image.crop((int(left * width), int(top * height), int(right * width), int(bottom * height)))
    if white_point < 255:
        image = image.point(lambda value: min(255, value * 255 // white_point))
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    output = BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def planned_photos(slug):
    """The sample photos for a product, in order, as (alt text, file name, source, download URL).

    Downloaded photos have no file name; local AI photos have no URL.
    """
    downloads = dict(SAMPLE_IMAGES).get(slug, [])
    local = dict(AI_IMAGES).get(slug, [])
    return [(alt, "", source, url) for alt, source, url in downloads] + [
        (alt, filename, str(SAMPLE_IMAGE_DIR / filename), None) for alt, filename in local
    ]


class Command(BaseCommand):
    help = (
        f"Give the sample products created by seed_catalog up to {MAX_PRODUCT_IMAGES} placeholder photos "
        "each, and the categories a tile photo. Photos already attached are not added again."
    )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("attach_sample_images is for development only (DJANGO_DEBUG must be True).")

        attached = 0
        for slug in dict.fromkeys(slug for slug, _ in SAMPLE_IMAGES + AI_IMAGES):
            product = Product.objects.filter(slug=slug).first()
            if product is None:
                self.stdout.write(f"Skipped {slug}: product not found.")
                continue
            count = product.images.count()
            existing_alts = set(product.images.values_list("alt_text", flat=True))
            for alt_text, filename, source, url in planned_photos(slug):
                if count >= MAX_PRODUCT_IMAGES:
                    break
                if alt_text in existing_alts:
                    continue
                try:
                    content = fetch_image(url) if url else Path(source).read_bytes()
                except OSError as error:
                    self.stderr.write(f"Could not load {source}: {error}")
                    continue
                photo = ProductImage(product=product, alt_text=alt_text, sort_order=count)
                photo.image.save(filename or f"{slug}-{count + 1}.jpg", ContentFile(content), save=True)
                count += 1
                attached += 1

        for slug, source, url, crop, white_point in CATEGORY_IMAGES:
            category = Category.objects.filter(slug=slug).first()
            if category is None or category.image:
                continue
            try:
                content = fetch_image(url, crop=crop, white_point=white_point)
            except OSError as error:
                self.stderr.write(f"Could not download {source}: {error}")
                continue
            category.image.save(f"category-{slug}.jpg", ContentFile(content), save=True)
            attached += 1

        self.stdout.write(self.style.SUCCESS(f"Attached {attached} sample images."))
