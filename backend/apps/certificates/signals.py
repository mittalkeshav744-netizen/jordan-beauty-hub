"""Keep Certificate Studio in sync with shop course enrollments."""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="courses.CourseEnrollment")
def sync_certificate_roster_on_shop_enrollment(sender, instance, **kwargs):
    from apps.courses.models import CourseEnrollment

    from .services import sync_shop_enrollment_to_certificate

    if instance.status != CourseEnrollment.Status.ACTIVE:
        return
    sync_shop_enrollment_to_certificate(instance)
