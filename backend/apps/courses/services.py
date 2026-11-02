from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils.text import slugify
from rest_framework.exceptions import NotFound, ValidationError

from .models import Course, CourseEnrollment, CourseLesson, CourseModule


def published_courses_queryset():
    return (
        Course.objects.filter(is_published=True, is_active=True)
        .annotate(
            module_count=Count("modules", distinct=True),
            lesson_count=Count("modules__lessons", distinct=True),
        )
        .order_by("sort_order", "-created_at")
    )


def course_with_curriculum(slug):
    modules = Prefetch(
        "modules",
        queryset=CourseModule.objects.prefetch_related("lessons").order_by("sort_order", "id"),
    )
    try:
        return Course.objects.prefetch_related(modules).get(slug=slug)
    except Course.DoesNotExist as exc:
        raise NotFound("Course not found.") from exc


def user_has_active_enrollment(user, course):
    if not user or not user.is_authenticated:
        return False
    return CourseEnrollment.objects.filter(
        user=user, course=course, status=CourseEnrollment.Status.ACTIVE
    ).exists()


@transaction.atomic
def enroll_user(user, course):
    if not course.is_published or not course.is_active:
        raise ValidationError({"detail": "This course is not available for enrollment."})

    enrollment, created = CourseEnrollment.objects.select_for_update().get_or_create(
        user=user,
        course=course,
        defaults={
            "status": CourseEnrollment.Status.ACTIVE,
            "amount_paid": course.price or Decimal("0.00"),
        },
    )
    if not created:
        if enrollment.status == CourseEnrollment.Status.ACTIVE:
            raise ValidationError({"detail": "You are already enrolled in this course."})
        enrollment.status = CourseEnrollment.Status.ACTIVE
        enrollment.amount_paid = course.price or Decimal("0.00")
        enrollment.save(update_fields=["status", "amount_paid", "updated_at"])
    return enrollment


def my_enrollments_queryset(user):
    return (
        CourseEnrollment.objects.filter(user=user, status=CourseEnrollment.Status.ACTIVE)
        .select_related("course")
        .order_by("-created_at")
    )


def unique_course_slug(title, exclude_pk=None):
    base = slugify(title)[:160] or "course"
    slug = base
    n = 2
    while True:
        qs = Course.objects.filter(slug=slug)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        if not qs.exists():
            return slug
        slug = f"{base}-{n}"
        n += 1


@transaction.atomic
def create_course(*, title, **fields):
    slug = fields.pop("slug", None) or unique_course_slug(title)
    return Course.objects.create(title=title, slug=slug, **fields)


@transaction.atomic
def update_course(course, **fields):
    if "title" in fields and fields["title"] and not fields.get("slug"):
        # Keep existing slug unless explicitly changed
        pass
    if "slug" in fields and fields["slug"]:
        fields["slug"] = unique_course_slug(fields["slug"], exclude_pk=course.pk)
    for key, value in fields.items():
        setattr(course, key, value)
    course.save()
    return course


@transaction.atomic
def replace_curriculum(course, modules_data):
    """
    Replace the full curriculum for a course.

    modules_data: list of {title, sort_order?, lessons: [{title, lesson_type, ...}]}
    """
    CourseModule.objects.filter(course=course).delete()
    for mi, module_data in enumerate(modules_data or []):
        title = (module_data.get("title") or "").strip()
        if not title:
            continue
        module = CourseModule.objects.create(
            course=course,
            title=title,
            sort_order=module_data.get("sort_order", mi),
        )
        for li, lesson_data in enumerate(module_data.get("lessons") or []):
            lesson_title = (lesson_data.get("title") or "").strip()
            if not lesson_title:
                continue
            lesson_type = lesson_data.get("lesson_type") or CourseLesson.LessonType.TEXT
            if lesson_type not in CourseLesson.LessonType.values:
                raise ValidationError({"lessons": f"Invalid lesson type: {lesson_type}"})
            CourseLesson.objects.create(
                module=module,
                title=lesson_title,
                lesson_type=lesson_type,
                body=lesson_data.get("body") or "",
                video_url=lesson_data.get("video_url") or "",
                external_url=lesson_data.get("external_url") or "",
                duration_minutes=int(lesson_data.get("duration_minutes") or 0),
                sort_order=lesson_data.get("sort_order", li),
            )
    return course


def portal_courses_queryset(search=""):
    qs = Course.objects.annotate(
        module_count=Count("modules", distinct=True),
        lesson_count=Count("modules__lessons", distinct=True),
        enrollment_count=Count(
            "enrollments",
            filter=Q(enrollments__status=CourseEnrollment.Status.ACTIVE),
            distinct=True,
        ),
    ).order_by("sort_order", "-created_at")
    search = (search or "").strip()
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(slug__icontains=search))
    return qs
