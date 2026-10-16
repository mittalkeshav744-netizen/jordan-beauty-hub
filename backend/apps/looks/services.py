from apps.catalog.services import annotated_products, bag_summary, cheapest_available_variant

from .models import Look, LookStep


def active_looks():
    return Look.objects.filter(is_active=True)


def look_with_products(look):
    """
    The look's steps whose product is on sale, each with its product and chosen shade,
    plus the variants and total price for an "add the full look to bag" button.
    """
    step_list = list(LookStep.objects.filter(look=look).select_related("variant"))
    products = {
        product.pk: product
        for product in annotated_products().filter(pk__in=[step.product_id for step in step_list])
    }

    steps = []
    bag_variants = []
    for step in step_list:
        product = products.get(step.product_id)
        if product is None:
            continue
        variant = step.variant
        if variant is not None and (not variant.is_active or variant.product_id != product.pk):
            variant = None
        steps.append({"step": step, "product": product, "variant": variant})
        if variant is None:
            bag_variants.append(cheapest_available_variant(product))
        elif variant.stock_quantity > 0:
            bag_variants.append(variant)
        # A sold-out chosen shade is left out rather than swapped for a different shade.

    variant_ids, total = bag_summary(bag_variants)
    return {"steps": steps, "bag_variant_ids": variant_ids, "total_price": total}
