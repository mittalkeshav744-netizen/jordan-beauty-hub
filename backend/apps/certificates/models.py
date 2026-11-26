from django.conf import settings
from django.core.validators import FileExtensionValidator, RegexValidator
from django.db import models


class InstituteSettings(models.Model):
    """Singleton institute branding for certificates."""

    institute_name = models.CharField(max_length=160, default="Jordan Beauty Hub")
    institute_address = models.TextField(blank=True)
    logo = models.ImageField(upload_to="certificates/institute/", blank=True)
    authorized_signatory = models.CharField(max_length=120, blank=True)
    signature_image = models.ImageField(upload_to="certificates/institute/", blank=True)
    stamp_image = models.ImageField(upload_to="certificates/institute/", blank=True)
    certificate_id_prefix = models.CharField(max_length=20, default="JBH")
    default_email_subject = models.CharField(
        max_length=200,
        default="Congratulations! Your Course Completion Certificate",
    )
    default_email_body = models.TextField(
        blank=True,
        default=(
            "Dear {{student_name}},\n\n"
            "Congratulations on successfully completing {{course_name}}.\n\n"
            "We are pleased to share your course completion certificate.\n\n"
            "Your certificate is attached to this email. You can also verify its "
            "authenticity using the QR code printed on the certificate.\n\n"
            "Best wishes,\nJordan Beauty Hub"
        ),
    )
    verification_base_url = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional override. Empty uses FRONTEND_URL + /certificate/verify/.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Institute settings"
        verbose_name_plural = "Institute settings"

    def __str__(self):
        return self.institute_name

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class CertificateIdCounter(models.Model):
    """Per-year sequence for public certificate IDs (JBH-2026-000001)."""

    year = models.PositiveIntegerField(unique=True)
    last_value = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.year}:{self.last_value}"


class CertificateTemplate(models.Model):
    class SourceType(models.TextChoices):
        UPLOAD = "upload", "Uploaded file"
        EDITOR = "editor", "Visual editor"

    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    source_type = models.CharField(
        max_length=20, choices=SourceType.choices, default=SourceType.EDITOR
    )
    is_default = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    orientation = models.CharField(
        max_length=12,
        choices=[("portrait", "Portrait"), ("landscape", "Landscape")],
        default="landscape",
    )
    page_size = models.CharField(max_length=8, default="A4")
    background_file = models.FileField(
        upload_to="certificates/templates/",
        blank=True,
        validators=[FileExtensionValidator(["png", "jpg", "jpeg", "webp", "pdf"])],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CertificateTemplateAsset(models.Model):
    """Overlay images used by the visual template designer (signatures, icons, etc.)."""

    template = models.ForeignKey(
        CertificateTemplate, on_delete=models.CASCADE, related_name="assets"
    )
    file = models.ImageField(
        upload_to="certificates/template_assets/",
        validators=[FileExtensionValidator(["png", "jpg", "jpeg", "webp"])],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Asset {self.pk} for {self.template_id}"


class CertificateTemplateVersion(models.Model):
    """Immutable snapshot of a template layout used by issued certificates."""

    template = models.ForeignKey(
        CertificateTemplate, on_delete=models.CASCADE, related_name="versions"
    )
    version_number = models.PositiveIntegerField()
    layout_json = models.JSONField(default=dict, blank=True)
    background_file = models.FileField(
        upload_to="certificates/template_versions/",
        blank=True,
        validators=[FileExtensionValidator(["png", "jpg", "jpeg", "webp", "pdf"])],
    )
    orientation = models.CharField(max_length=12, default="landscape")
    page_size = models.CharField(max_length=8, default="A4")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificate_template_versions",
    )

    class Meta:
        ordering = ["-version_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["template", "version_number"],
                name="uniq_certificate_template_version",
            ),
        ]

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"


class CertificateStudent(models.Model):
    full_name = models.CharField(max_length=160)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    enrollment_number = models.CharField(max_length=40, unique=True)
    profile_image = models.ImageField(upload_to="certificates/students/", blank=True)
    notes = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificate_profiles",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} ({self.enrollment_number})"


class StudentGroup(models.Model):
    name = models.CharField(max_length=120)
    course = models.ForeignKey(
        "courses.Course", on_delete=models.CASCADE, related_name="certificate_groups"
    )
    description = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    certificate_template = models.ForeignKey(
        CertificateTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="groups",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["course", "name"], name="uniq_group_name_per_course"
            ),
        ]

    def __str__(self):
        return f"{self.course.title} · {self.name}"


class GroupMembership(models.Model):
    group = models.ForeignKey(StudentGroup, on_delete=models.CASCADE, related_name="memberships")
    student = models.ForeignKey(
        CertificateStudent, on_delete=models.CASCADE, related_name="group_memberships"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "student"], name="uniq_student_in_group"
            ),
        ]

    def __str__(self):
        return f"{self.student} in {self.group}"


class CertificateEnrollment(models.Model):
    class Status(models.TextChoices):
        ENROLLED = "enrolled", "Enrolled"
        COMPLETED = "completed", "Completed"
        WITHDRAWN = "withdrawn", "Withdrawn"

    student = models.ForeignKey(
        CertificateStudent, on_delete=models.CASCADE, related_name="enrollments"
    )
    course = models.ForeignKey(
        "courses.Course", on_delete=models.CASCADE, related_name="certificate_enrollments"
    )
    group = models.ForeignKey(
        StudentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments",
    )
    enrollment_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    grade = models.CharField(max_length=40, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ENROLLED, db_index=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course"],
                condition=~models.Q(status="withdrawn"),
                name="uniq_active_student_course_enrollment",
            ),
        ]

    def __str__(self):
        return f"{self.student} → {self.course} ({self.status})"


class Certificate(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ISSUED = "issued", "Issued"
        REVOKED = "revoked", "Revoked"
        REISSUED = "reissued", "Reissued"

    public_id = models.CharField(max_length=40, unique=True, db_index=True)
    student = models.ForeignKey(
        CertificateStudent, on_delete=models.PROTECT, related_name="certificates"
    )
    course = models.ForeignKey(
        "courses.Course", on_delete=models.PROTECT, related_name="certificates"
    )
    group = models.ForeignKey(
        StudentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificates",
    )
    enrollment = models.ForeignKey(
        CertificateEnrollment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificates",
    )
    template_version = models.ForeignKey(
        CertificateTemplateVersion,
        on_delete=models.PROTECT,
        related_name="certificates",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    grade = models.CharField(max_length=40, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    custom_data = models.JSONField(default=dict, blank=True)
    pdf = models.FileField(upload_to="certificates/issued/", blank=True)
    replaces = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reissues",
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_certificates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course"],
                condition=models.Q(status="issued"),
                name="uniq_issued_certificate_per_student_course",
            ),
        ]

    def __str__(self):
        return self.public_id


class CertificateAuditLog(models.Model):
    certificate = models.ForeignKey(
        Certificate, on_delete=models.CASCADE, related_name="audit_logs"
    )
    action = models.CharField(max_length=40)
    detail = models.TextField(blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class EmailTemplate(models.Model):
    name = models.CharField(max_length=120)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CertificateEmailLog(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENDING = "sending", "Sending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    certificate = models.ForeignKey(
        Certificate, on_delete=models.CASCADE, related_name="email_logs"
    )
    to_email = models.EmailField()
    subject = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    attempts = models.PositiveIntegerField(default=0)
    provider_message_id = models.CharField(max_length=120, blank=True)
    error_message = models.TextField(blank=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class CertificateJob(models.Model):
    class JobType(models.TextChoices):
        GENERATE = "generate", "Generate PDFs"
        EMAIL = "email", "Send emails"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    job_type = models.CharField(max_length=20, choices=JobType.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    total = models.PositiveIntegerField(default=0)
    current = models.PositiveIntegerField(default=0)
    payload = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class CertificateField(models.Model):
    """Configurable dynamic placeholders shown in the template editor's Insert field menu."""

    key = models.CharField(
        max_length=60,
        unique=True,
        validators=[
            RegexValidator(
                r"^[a-z][a-z0-9_]*$",
                "Key must start with a letter and use lowercase letters, numbers, or underscores.",
            )
        ],
    )
    label = models.CharField(max_length=100)
    source = models.CharField(max_length=40, default="custom")
    default_value = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "label", "id"]

    def __str__(self):
        return f"{{{{{self.key}}}}} ({self.label})"
