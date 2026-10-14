from io import BytesIO
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


class Command(BaseCommand):
    help = "Attach CC0 placeholder photos to the sample products and categories created by seed_catalog."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("attach_sample_images is for development only (DJANGO_DEBUG must be True).")

        attached = 0
        for slug, images in SAMPLE_IMAGES:
            product = Product.objects.filter(slug=slug).first()
            if product is None:
                self.stdout.write(f"Skipped {slug}: product not found.")
                continue
            if product.images.exists():
                self.stdout.write(f"Skipped {slug}: already has images.")
                continue
            for order, (alt_text, source, url) in enumerate(images):
                try:
                    content = fetch_image(url)
                except OSError as error:
                    self.stderr.write(f"Could not download {source}: {error}")
                    continue
                photo = ProductImage(product=product, alt_text=alt_text, sort_order=order)
                photo.image.save(f"{slug}-{order + 1}.jpg", ContentFile(content), save=True)
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
