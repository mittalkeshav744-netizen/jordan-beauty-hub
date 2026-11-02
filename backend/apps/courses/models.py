from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


class Course(models.Model):
    """A sellable beauty course with modules and mixed lesson media."""

    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    short_description = models.CharField(max_length=280, blank=True)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="courses/", blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_published = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title


class CourseModule(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=160)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.course.title} · {self.title}"


class CourseLesson(models.Model):
    class LessonType(models.TextChoices):
        VIDEO = "video", "Video"
        FILE = "file", "File"
        LINK = "link", "Link"
        TEXT = "text", "Text"

    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=160)
    lesson_type = models.CharField(
        max_length=10, choices=LessonType.choices, default=LessonType.TEXT
    )
    body = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    video_file = models.FileField(
        upload_to="courses/videos/",
        blank=True,
        validators=[FileExtensionValidator(["mp4", "webm"])],
    )
    attachment = models.FileField(upload_to="courses/files/", blank=True)
    external_url = models.URLField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.title


class CourseEnrollment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_enrollments"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_user_course_enrollment"),
        ]

    def __str__(self):
        return f"{self.user} → {self.course} ({self.status})"
