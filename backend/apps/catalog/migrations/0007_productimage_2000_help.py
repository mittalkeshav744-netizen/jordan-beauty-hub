from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_homepage_picks_and_fit_signals"),
    ]

    operations = [
        migrations.AlterField(
            model_name="productimage",
            name="image",
            field=models.ImageField(
                help_text=(
                    "Saved as a 2000×2000 JPEG for sharper product zoom. A wide or tall photo is "
                    "cropped from the centre, so keep the product in the middle on a light background. "
                    "Re-upload older photos to regenerate them at the new size."
                ),
                upload_to="products/",
            ),
        ),
    ]
