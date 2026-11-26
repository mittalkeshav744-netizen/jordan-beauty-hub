"""Send due scheduled certificate emails.

Generate / bulk-email jobs run in-process via start_job (threads), not this command.

Schedule on Windows Task Scheduler or cron, e.g. every minute:

    python manage.py process_certificate_queue
"""

from django.core.management.base import BaseCommand

from apps.certificates import services


class Command(BaseCommand):
    help = "Send due scheduled certificate emails."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        result = services.process_due_scheduled_emails(limit=options["limit"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Scheduled emails: processed={result['processed']} "
                f"sent={result['sent']} failed={result['failed']}"
            )
        )
