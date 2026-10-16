from django.db import migrations

SKIN_TYPES = [
    ("Normal", "normal", "Balanced: not too oily, not too dry."),
    ("Oily", "oily", "Shiny by midday, visible pores, prone to breakouts."),
    ("Dry", "dry", "Feels tight or flaky, especially after washing."),
    ("Combination", "combination", "Oily T-zone with normal or dry cheeks."),
    ("Sensitive", "sensitive", "Easily red, itchy or irritated by new products."),
]


def add_skin_types(apps, schema_editor):
    SkinType = apps.get_model("catalog", "SkinType")
    for order, (name, slug, description) in enumerate(SKIN_TYPES):
        SkinType.objects.get_or_create(
            slug=slug, defaults={"name": name, "description": description, "sort_order": order}
        )


def remove_skin_types(apps, schema_editor):
    SkinType = apps.get_model("catalog", "SkinType")
    SkinType.objects.filter(slug__in=[slug for _, slug, _ in SKIN_TYPES], products__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0003_concern_skintype_product_routine_step_and_more"),
    ]

    operations = [
        migrations.RunPython(add_skin_types, remove_skin_types),
    ]
