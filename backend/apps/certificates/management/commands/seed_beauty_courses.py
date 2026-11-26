"""Seed sample beauty academy courses (DEBUG only)."""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from apps.certificates.models import CertificateTemplate, EmailTemplate, InstituteSettings
from apps.certificates.services import ensure_template_version
from apps.courses.models import Course, CourseLesson, CourseModule


BEAUTY_COURSES = [
    {
        "title": "Bridal Makeup Masterclass",
        "code": "BRD-101",
        "category": "Makeup",
        "duration_text": "6 weeks",
        "short_description": "Complete bridal makeup artistry from skin prep to lasting finish.",
        "description": (
            "Learn professional bridal makeup techniques including base work, eye looks, "
            "and long-wear finishing for Indian and destination weddings."
        ),
        "price": "12999.00",
        "modules": [
            ("Foundations", ["Skin prep & priming", "Base & colour correction"]),
            ("Eyes & Finish", ["Bridal eye looks", "Setting & photography"]),
        ],
    },
    {
        "title": "Skin Care Essentials",
        "code": "SKN-201",
        "category": "Skincare",
        "duration_text": "4 weeks",
        "short_description": "Build healthy routines for every skin type and concern.",
        "description": (
            "A practical academy course covering cleansing, actives, sun care and "
            "consultation skills for beauty professionals."
        ),
        "price": "7999.00",
        "modules": [
            ("Skin science", ["Skin types & barriers", "Common concerns"]),
            ("Routines", ["Morning & night protocols", "Client consultations"]),
        ],
    },
    {
        "title": "Professional Nail Art",
        "code": "NAIL-110",
        "category": "Nails",
        "duration_text": "5 weeks",
        "short_description": "Manicure, gel systems and creative nail art for salons.",
        "description": (
            "Hands-on nail artistry covering hygiene, gel application, design motifs "
            "and client finishing standards."
        ),
        "price": "8999.00",
        "modules": [
            ("Core skills", ["Hygiene & prep", "Gel application"]),
            ("Design", ["Motifs & trends", "Salon finishing"]),
        ],
    },
    {
        "title": "Hair Styling Studio",
        "code": "HAIR-120",
        "category": "Hair",
        "duration_text": "8 weeks",
        "short_description": "Cuts, blow-dry finishing and occasion styling.",
        "description": (
            "Develop salon-ready hair styling skills for everyday and occasion looks "
            "with professional finishing techniques."
        ),
        "price": "14999.00",
        "modules": [
            ("Technique", ["Sectioning & blow-dry", "Occasion updos"]),
            ("Salon flow", ["Consultation", "Finishing & photography"]),
        ],
    },
]


class Command(BaseCommand):
    help = "Seed beauty courses, a default certificate template, and institute settings (DEBUG only)."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_beauty_courses only runs when DJANGO_DEBUG=True.")

        InstituteSettings.load()
        template, created = CertificateTemplate.objects.get_or_create(
            name="Classic Academy Landscape",
            defaults={
                "description": "Default Jordan Beauty Hub completion certificate.",
                "source_type": CertificateTemplate.SourceType.EDITOR,
                "is_default": True,
                "orientation": "landscape",
            },
        )
        if created or not template.versions.exists():
            ensure_template_version(template)
            if not template.is_default:
                template.is_default = True
                template.save(update_fields=["is_default"])
        CertificateTemplate.objects.exclude(pk=template.pk).filter(is_default=True).update(
            is_default=False
        )

        EmailTemplate.objects.get_or_create(
            name="Default completion email",
            defaults={
                "subject": "Congratulations! Your Course Completion Certificate",
                "body": InstituteSettings.load().default_email_body,
                "is_default": True,
            },
        )

        created_courses = 0
        for spec in BEAUTY_COURSES:
            slug = slugify(spec["title"])
            course, was_created = Course.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": spec["title"],
                    "short_description": spec["short_description"],
                    "description": spec["description"],
                    "price": spec["price"],
                    "is_published": True,
                    "is_active": True,
                    "code": spec["code"],
                    "category": spec["category"],
                    "duration_text": spec["duration_text"],
                    "default_certificate_template": template,
                    "sort_order": created_courses,
                },
            )
            if was_created:
                created_courses += 1
                for mi, (module_title, lessons) in enumerate(spec["modules"]):
                    module = CourseModule.objects.create(
                        course=course, title=module_title, sort_order=mi
                    )
                    for li, lesson_title in enumerate(lessons):
                        CourseLesson.objects.create(
                            module=module,
                            title=lesson_title,
                            lesson_type=CourseLesson.LessonType.TEXT,
                            body=f"Lesson content for {lesson_title}.",
                            sort_order=li,
                        )
            else:
                updated = False
                for field in ("code", "category", "duration_text"):
                    if not getattr(course, field) and spec.get(field):
                        setattr(course, field, spec[field])
                        updated = True
                if not course.default_certificate_template_id:
                    course.default_certificate_template = template
                    updated = True
                if updated:
                    course.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Beauty courses ready (new courses created: {created_courses}). "
                f"Default template: {template.name}."
            )
        )
