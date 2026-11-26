from django.core.management.base import BaseCommand

from apps.certificates.services import sync_all_shop_course_enrollments


class Command(BaseCommand):
    help = "Sync active shop course enrollments into Certificate Studio students."

    def handle(self, *args, **options):
        result = sync_all_shop_course_enrollments()
        self.stdout.write(
            self.style.SUCCESS(
                "Shop enrollments: {shop_enrollments}; "
                "linked: {linked_enrollments}; "
                "new students: {students_created}".format(**result)
            )
        )
