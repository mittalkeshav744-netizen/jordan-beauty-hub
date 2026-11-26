from rest_framework import serializers

from apps.courses.models import Course

from .models import (
    Certificate,
    CertificateAuditLog,
    CertificateEmailLog,
    CertificateEnrollment,
    CertificateField,
    CertificateJob,
    CertificateStudent,
    CertificateTemplate,
    CertificateTemplateAsset,
    CertificateTemplateVersion,
    EmailTemplate,
    GroupMembership,
    InstituteSettings,
    StudentGroup,
)


class CourseCertSerializer(serializers.ModelSerializer):
    enrollment_count = serializers.IntegerField(read_only=True, required=False, default=0)
    issued_count = serializers.IntegerField(read_only=True, required=False, default=0)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "cover_image",
            "price",
            "is_published",
            "is_active",
            "sort_order",
            "code",
            "category",
            "duration_text",
            "start_date",
            "end_date",
            "default_certificate_template",
            "enrollment_count",
            "issued_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at", "enrollment_count", "issued_count"]


class CourseCertWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            "title",
            "short_description",
            "description",
            "price",
            "is_published",
            "is_active",
            "sort_order",
            "code",
            "category",
            "duration_text",
            "start_date",
            "end_date",
            "default_certificate_template",
            "cover_image",
        ]


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateStudent
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "enrollment_number",
            "profile_image",
            "notes",
            "user",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True, default="")

    class Meta:
        model = CertificateEnrollment
        fields = [
            "id",
            "student",
            "student_name",
            "course",
            "course_title",
            "group",
            "group_name",
            "enrollment_date",
            "completion_date",
            "grade",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "student_name", "course_title", "group_name"]


class GroupSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_count = serializers.IntegerField(read_only=True, required=False, default=0)
    completed_count = serializers.IntegerField(read_only=True, required=False, default=0)

    class Meta:
        model = StudentGroup
        fields = [
            "id",
            "name",
            "course",
            "course_title",
            "description",
            "start_date",
            "end_date",
            "certificate_template",
            "is_active",
            "student_count",
            "completed_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "course_title",
            "student_count",
            "completed_count",
            "created_at",
            "updated_at",
        ]


class GroupMembershipSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    enrollment_number = serializers.CharField(source="student.enrollment_number", read_only=True)

    class Meta:
        model = GroupMembership
        fields = ["id", "group", "student", "student_name", "enrollment_number", "joined_at"]
        read_only_fields = ["id", "joined_at", "student_name", "enrollment_number"]


class TemplateSerializer(serializers.ModelSerializer):
    latest_version = serializers.SerializerMethodField()
    background_file_url = serializers.SerializerMethodField()

    class Meta:
        model = CertificateTemplate
        fields = [
            "id",
            "name",
            "description",
            "source_type",
            "is_default",
            "is_active",
            "orientation",
            "page_size",
            "background_file",
            "background_file_url",
            "latest_version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "latest_version", "background_file_url"]
        extra_kwargs = {"background_file": {"write_only": True, "required": False}}

    def get_background_file_url(self, obj):
        if not obj.background_file:
            return ""
        request = self.context.get("request")
        url = obj.background_file.url
        return request.build_absolute_uri(url) if request else url

    def get_latest_version(self, obj):
        version = obj.versions.order_by("-version_number").first()
        if not version:
            return None
        return {
            "id": version.id,
            "version_number": version.version_number,
            "layout_json": version.layout_json,
        }


class TemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateTemplateVersion
        fields = [
            "id",
            "template",
            "version_number",
            "layout_json",
            "background_file",
            "orientation",
            "page_size",
            "created_at",
        ]
        read_only_fields = fields


class CertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True, default="")
    template_name = serializers.CharField(
        source="template_version.template.name", read_only=True
    )
    email_status = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            "id",
            "public_id",
            "student",
            "student_name",
            "course",
            "course_title",
            "group",
            "group_name",
            "enrollment",
            "template_version",
            "template_name",
            "status",
            "grade",
            "completion_date",
            "issue_date",
            "pdf_url",
            "email_status",
            "replaces",
            "issued_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [f for f in fields if f not in ("grade",)]

    def get_email_status(self, obj):
        log = obj.email_logs.order_by("-created_at").first()
        return log.status if log else "none"

    def get_pdf_url(self, obj):
        request = self.context.get("request")
        if obj.pdf and request:
            return request.build_absolute_uri(obj.pdf.url)
        if obj.pdf:
            return obj.pdf.url
        return None


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = CertificateAuditLog
        fields = ["id", "action", "detail", "actor", "actor_name", "created_at"]

    def get_actor_name(self, obj):
        if not obj.actor:
            return ""
        return obj.actor.get_full_name() or obj.actor.email


class EmailLogSerializer(serializers.ModelSerializer):
    certificate_public_id = serializers.CharField(source="certificate.public_id", read_only=True)
    student_name = serializers.CharField(source="certificate.student.full_name", read_only=True)

    class Meta:
        model = CertificateEmailLog
        fields = [
            "id",
            "certificate",
            "certificate_public_id",
            "student_name",
            "to_email",
            "subject",
            "body",
            "status",
            "attempts",
            "provider_message_id",
            "error_message",
            "scheduled_for",
            "sent_at",
            "created_at",
        ]


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = ["id", "name", "subject", "body", "is_default", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class InstituteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    signature_image_url = serializers.SerializerMethodField()
    stamp_image_url = serializers.SerializerMethodField()

    class Meta:
        model = InstituteSettings
        fields = [
            "institute_name",
            "institute_address",
            "logo",
            "logo_url",
            "authorized_signatory",
            "signature_image",
            "signature_image_url",
            "stamp_image",
            "stamp_image_url",
            "certificate_id_prefix",
            "default_email_subject",
            "default_email_body",
            "verification_base_url",
            "updated_at",
        ]
        read_only_fields = ["updated_at", "logo_url", "signature_image_url", "stamp_image_url"]
        extra_kwargs = {
            "logo": {"write_only": True, "required": False},
            "signature_image": {"write_only": True, "required": False},
            "stamp_image": {"write_only": True, "required": False},
        }

    def _url(self, field):
        if not field:
            return ""
        request = self.context.get("request")
        url = field.url
        return request.build_absolute_uri(url) if request else url

    def get_logo_url(self, obj):
        return self._url(obj.logo)

    def get_signature_image_url(self, obj):
        return self._url(obj.signature_image)

    def get_stamp_image_url(self, obj):
        return self._url(obj.stamp_image)


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateJob
        fields = [
            "id",
            "job_type",
            "status",
            "total",
            "current",
            "payload",
            "result",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PublicVerifySerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    status = serializers.CharField()
    certificate_id = serializers.CharField()
    student_name = serializers.CharField(allow_blank=True)
    course_name = serializers.CharField(allow_blank=True)
    institute_name = serializers.CharField(allow_blank=True)
    issue_date = serializers.DateField(allow_null=True)
    completion_date = serializers.DateField(allow_null=True, required=False)
    grade = serializers.CharField(allow_blank=True, required=False)
    enrollment_number = serializers.CharField(allow_blank=True, required=False)
    duration = serializers.CharField(allow_blank=True, required=False)
    replaces = serializers.CharField(allow_blank=True, required=False)
    superseded_by = serializers.CharField(allow_blank=True, required=False)
    message = serializers.CharField()


class TemplateAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    path = serializers.SerializerMethodField()

    class Meta:
        model = CertificateTemplateAsset
        fields = ["id", "url", "path", "created_at"]
        read_only_fields = fields

    def get_url(self, obj):
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def get_path(self, obj):
        # Relative media path for layout_json image src (stable for PDF render).
        name = getattr(obj.file, "name", "") or ""
        return name


class CertificateFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateField
        fields = [
            "id",
            "key",
            "label",
            "source",
            "default_value",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_internal_value(self, data):
        import re

        if isinstance(data, dict) and "key" in data and data["key"] is not None:
            data = dict(data)
            normalized = re.sub(r"[\s-]+", "_", str(data["key"]).strip().lower())
            data["key"] = re.sub(r"[^a-z0-9_]", "", normalized)
        return super().to_internal_value(data)
