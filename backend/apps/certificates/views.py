import csv
import io

from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status, viewsets
from rest_framework.decorators import (
    action,
    api_view,
    parser_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.courses.models import Course
from apps.portal.permissions import IsStaffUser
from config.pagination import CertificatePagination

from .models import (
    Certificate,
    CertificateEmailLog,
    CertificateEnrollment,
    CertificateField,
    CertificateJob,
    CertificateStudent,
    CertificateTemplate,
    EmailTemplate,
    GroupMembership,
    InstituteSettings,
    StudentGroup,
)
from .serializers import (
    AuditLogSerializer,
    CertificateFieldSerializer,
    CertificateSerializer,
    CourseCertSerializer,
    CourseCertWriteSerializer,
    EmailLogSerializer,
    EmailTemplateSerializer,
    EnrollmentSerializer,
    GroupMembershipSerializer,
    GroupSerializer,
    InstituteSettingsSerializer,
    JobSerializer,
    PublicVerifySerializer,
    StudentSerializer,
    TemplateSerializer,
)
from . import services


class VerifyThrottle(AnonRateThrottle):
    rate = "30/min"


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def dashboard(request):
    return Response(services.dashboard_stats())


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = CertificatePagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        qs = Course.objects.all().annotate(
            enrollment_count=Count("certificate_enrollments", distinct=True),
            issued_count=Count(
                "certificates",
                filter=Q(certificates__status=Certificate.Status.ISSUED),
                distinct=True,
            ),
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(code__icontains=search)
                | Q(category__icontains=search)
            )
        status_filter = self.request.query_params.get("status")
        if status_filter == "active":
            qs = qs.filter(is_active=True, is_published=True)
        elif status_filter == "inactive":
            qs = qs.filter(Q(is_active=False) | Q(is_published=False))
        return qs.order_by("sort_order", "title")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CourseCertWriteSerializer
        return CourseCertSerializer

    def perform_create(self, serializer):
        title = serializer.validated_data["title"]
        base = slugify(title)[:160] or "course"
        slug = base
        n = 1
        while Course.objects.filter(slug=slug).exists():
            n += 1
            slug = f"{base}-{n}"
        serializer.save(slug=slug)


class StudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = CertificatePagination
    serializer_class = StudentSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    queryset = CertificateStudent.objects.all()

    def get_queryset(self):
        qs = CertificateStudent.objects.all()
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(enrollment_number__icontains=search)
            )
        if self.request.query_params.get("active") == "1":
            qs = qs.filter(is_active=True)
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(enrollments__course_id=course_id).distinct()
        group_id = self.request.query_params.get("group")
        if group_id:
            qs = qs.filter(group_memberships__group_id=group_id).distinct()
        return qs

    @action(detail=True, methods=["get"])
    def certificates(self, request, pk=None):
        student = self.get_object()
        qs = student.certificates.select_related("course", "group", "template_version__template")
        return Response(CertificateSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="students.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["enrollment_number", "full_name", "email", "phone", "notes", "is_active"]
        )
        for s in self.get_queryset().iterator():
            writer.writerow(
                [
                    s.enrollment_number,
                    s.full_name,
                    s.email,
                    s.phone,
                    s.notes,
                    "1" if s.is_active else "0",
                ]
            )
        return response

    @action(detail=False, methods=["post"], url_path="sync-from-shop")
    def sync_from_shop(self, request):
        """Pull active storefront course enrollments into the certificate student roster."""
        result = services.sync_all_shop_course_enrollments()
        return Response(
            {
                "detail": (
                    f"Synced {result['linked_enrollments']} shop enrollment(s) "
                    f"into Certificate Studio."
                ),
                **result,
            }
        )

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def import_preview(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload a CSV or Excel (.xlsx) file."}, status=400)
        try:
            return Response(services.preview_student_import(upload))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_csv(self, request):
        """Import with optional column mapping. Accepts CSV/XLSX."""
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload a CSV or Excel (.xlsx) file."}, status=400)
        mapping = request.data.get("mapping")
        if isinstance(mapping, str):
            import json

            try:
                mapping = json.loads(mapping)
            except json.JSONDecodeError:
                return Response({"detail": "Invalid mapping JSON."}, status=400)
        if not mapping:
            # Backward-compatible: expect exact column names
            mapping = {
                "enrollment_number": "enrollment_number",
                "full_name": "full_name",
                "email": "email",
                "phone": "phone",
                "notes": "notes",
            }
        try:
            result = services.import_students_with_mapping(upload, mapping)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(result)


class EnrollmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = CertificatePagination
    serializer_class = EnrollmentSerializer
    queryset = CertificateEnrollment.objects.select_related("student", "course", "group")

    def get_queryset(self):
        qs = super().get_queryset()
        for key, field in (
            ("course", "course_id"),
            ("group", "group_id"),
            ("student", "student_id"),
            ("status", "status"),
        ):
            value = self.request.query_params.get(key)
            if value:
                qs = qs.filter(**{field: value})
        return qs


class GroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = CertificatePagination
    serializer_class = GroupSerializer

    def get_queryset(self):
        qs = StudentGroup.objects.select_related("course").annotate(
            student_count=Count("memberships", distinct=True),
            completed_count=Count(
                "enrollments",
                filter=Q(enrollments__status=CertificateEnrollment.Status.COMPLETED),
                distinct=True,
            ),
        )
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(course__title__icontains=search))
        return qs

    @action(detail=True, methods=["get", "post", "delete"])
    def members(self, request, pk=None):
        group = self.get_object()
        if request.method == "GET":
            ms = group.memberships.select_related("student")
            search = request.query_params.get("search", "").strip()
            if search:
                ms = ms.filter(
                    Q(student__full_name__icontains=search)
                    | Q(student__enrollment_number__icontains=search)
                )
            return Response(GroupMembershipSerializer(ms, many=True).data)

        student_ids = request.data.get("student_ids") or []
        if request.method == "POST":
            added = []
            for sid in student_ids:
                membership, created = GroupMembership.objects.get_or_create(
                    group=group, student_id=sid
                )
                if created:
                    added.append(membership.id)
                # Ensure one active enrollment row for course
                CertificateEnrollment.objects.get_or_create(
                    student_id=sid,
                    course=group.course,
                    defaults={
                        "group": group,
                        "enrollment_date": timezone.localdate(),
                        "status": CertificateEnrollment.Status.ENROLLED,
                    },
                )
                CertificateEnrollment.objects.filter(
                    student_id=sid, course=group.course
                ).exclude(status=CertificateEnrollment.Status.WITHDRAWN).update(group=group)
            return Response({"added": len(added)}, status=201)

        deleted, _ = GroupMembership.objects.filter(
            group=group, student_id__in=student_ids
        ).delete()
        return Response({"removed": deleted})


class TemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = CertificatePagination
    serializer_class = TemplateSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    queryset = CertificateTemplate.objects.all()

    def perform_create(self, serializer):
        template = serializer.save()
        services.ensure_template_version(template, user=self.request.user)
        if template.is_default:
            CertificateTemplate.objects.exclude(pk=template.pk).update(is_default=False)

    def perform_update(self, serializer):
        template = serializer.save()
        if template.is_default:
            CertificateTemplate.objects.exclude(pk=template.pk).update(is_default=False)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        template = self.get_object()
        layout = request.data.get("layout_json") or {}
        orientation = request.data.get("orientation")
        if orientation:
            template.orientation = orientation
            template.save(update_fields=["orientation", "updated_at"])
        version = services.publish_template_version(template, layout, user=request.user)
        return Response(
            {
                "id": version.id,
                "version_number": version.version_number,
                "layout_json": version.layout_json,
            }
        )

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_asset(self, request, pk=None):
        """Upload an overlay image for the visual designer."""
        from .models import CertificateTemplateAsset
        from .serializers import TemplateAssetSerializer

        template = self.get_object()
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Choose an image file (PNG, JPG, or WebP)."}, status=400)
        asset = CertificateTemplateAsset.objects.create(template=template, file=upload)
        return Response(
            TemplateAssetSerializer(asset, context={"request": request}).data,
            status=201,
        )

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        template = self.get_object()
        latest = template.versions.order_by("-version_number").first()
        clone = CertificateTemplate.objects.create(
            name=f"{template.name} (copy)",
            description=template.description,
            source_type=template.source_type,
            orientation=template.orientation,
            page_size=template.page_size,
            is_default=False,
            is_active=True,
        )
        if template.background_file:
            clone.background_file = template.background_file
            clone.save(update_fields=["background_file"])
        services.publish_template_version(
            clone, (latest.layout_json if latest else None), user=request.user
        )
        return Response(TemplateSerializer(clone, context={"request": request}).data, status=201)


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = CertificatePagination
    serializer_class = CertificateSerializer
    queryset = Certificate.objects.select_related(
        "student", "course", "group", "template_version__template"
    )

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(public_id__icontains=search)
                | Q(student__full_name__icontains=search)
                | Q(course__title__icontains=search)
            )
        for key, field in (
            ("status", "status"),
            ("course", "course_id"),
            ("group", "group_id"),
        ):
            value = self.request.query_params.get(key)
            if value:
                qs = qs.filter(**{field: value})
        return qs

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Start a bulk/individual generation job."""
        data = request.data
        required = ["course_id", "template_id", "student_ids"]
        missing = [k for k in required if not data.get(k)]
        if missing:
            return Response({"detail": f"Missing: {', '.join(missing)}"}, status=400)
        job = services.start_job(
            CertificateJob.JobType.GENERATE,
            {
                "course_id": data["course_id"],
                "template_id": data["template_id"],
                "student_ids": data["student_ids"],
                "group_id": data.get("group_id"),
                "grade": data.get("grade") or "",
                "completion_date": data.get("completion_date"),
                "issue_date": data.get("issue_date"),
                "custom_data": data.get("custom_data") or {},
                "force_reissue": bool(data.get("force_reissue")),
                # Default on: certificates are for shop course graduates and should be emailed.
                "send_email": bool(data.get("send_email", True)),
            },
            user=request.user,
        )
        return Response(JobSerializer(job).data, status=202)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        cert = self.get_object()
        if not cert.pdf:
            return Response({"detail": "PDF not available."}, status=404)
        return FileResponse(cert.pdf.open("rb"), as_attachment=True, filename=f"{cert.public_id}.pdf")

    @action(detail=False, methods=["post"], url_path="print-bundle")
    def print_bundle(self, request):
        """Return one merged PDF for all requested certificates so staff can print in one dialog."""
        cert_ids = request.data.get("certificate_ids") or []
        public_ids = request.data.get("public_ids") or []
        if not cert_ids and not public_ids:
            return Response({"detail": "Select at least one certificate to print."}, status=400)

        qs = self.get_queryset()
        if cert_ids:
            try:
                parsed_ids = [int(cid) for cid in cert_ids]
            except (TypeError, ValueError):
                return Response({"detail": "Invalid certificate IDs."}, status=400)
            by_id = {c.id: c for c in qs.filter(id__in=parsed_ids)}
            ordered = [by_id[cid] for cid in parsed_ids if cid in by_id]
        else:
            by_pub = {c.public_id: c for c in qs.filter(public_id__in=public_ids)}
            ordered = [by_pub[str(pid)] for pid in public_ids if str(pid) in by_pub]

        if not ordered:
            return Response({"detail": "No matching certificates found."}, status=404)
        try:
            merged = services.merge_certificate_pdfs(ordered)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=404)

        response = HttpResponse(merged, content_type="application/pdf")
        response["Content-Disposition"] = 'inline; filename="certificates-bundle.pdf"'
        return response

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        cert = self.get_object()
        services.revoke_certificate(cert, user=request.user, reason=request.data.get("reason", ""))
        return Response(CertificateSerializer(cert, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def reissue(self, request, pk=None):
        cert = self.get_object()
        new_cert = services.issue_certificate(
            student=cert.student,
            course=cert.course,
            template_version=cert.template_version,
            group=cert.group,
            enrollment=cert.enrollment,
            grade=request.data.get("grade") or cert.grade,
            completion_date=request.data.get("completion_date") or cert.completion_date,
            issue_date=request.data.get("issue_date"),
            custom_data=request.data.get("custom_data") or cert.custom_data,
            user=request.user,
            force_reissue=True,
        )
        return Response(
            CertificateSerializer(new_cert, context={"request": request}).data, status=201
        )

    @action(detail=True, methods=["get"])
    def audit(self, request, pk=None):
        cert = self.get_object()
        return Response(AuditLogSerializer(cert.audit_logs.all(), many=True).data)

    @action(detail=True, methods=["post"])
    def email(self, request, pk=None):
        cert = self.get_object()
        scheduled_raw = request.data.get("scheduled_for")
        scheduled_for = None
        if scheduled_raw:
            from django.utils.dateparse import parse_datetime

            scheduled_for = parse_datetime(str(scheduled_raw))
            if scheduled_for is None:
                return Response({"detail": "Invalid scheduled_for datetime."}, status=400)
            if timezone.is_naive(scheduled_for):
                scheduled_for = timezone.make_aware(scheduled_for, timezone.get_current_timezone())
        try:
            log = services.schedule_certificate_email(
                cert,
                subject=request.data.get("subject"),
                body=request.data.get("body"),
                scheduled_for=scheduled_for,
                user=request.user,
                force=bool(request.data.get("force")),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(EmailLogSerializer(log).data)


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = CertificatePagination
    serializer_class = EmailLogSerializer
    queryset = CertificateEmailLog.objects.select_related(
        "certificate", "certificate__student"
    )

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(to_email__icontains=search)
                | Q(certificate__public_id__icontains=search)
                | Q(certificate__student__full_name__icontains=search)
            )
        return qs

    @action(detail=False, methods=["post"])
    def bulk_send(self, request):
        ids = request.data.get("certificate_ids") or []
        if not ids:
            return Response({"detail": "certificate_ids required."}, status=400)
        job = services.start_job(
            CertificateJob.JobType.EMAIL,
            {
                "certificate_ids": ids,
                "subject": request.data.get("subject"),
                "body": request.data.get("body"),
                "force": bool(request.data.get("force")),
            },
            user=request.user,
        )
        return Response(JobSerializer(job).data, status=202)

    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        log = self.get_object()
        try:
            new_log = services.send_certificate_email(
                log.certificate,
                subject=log.subject,
                body=log.body,
                user=request.user,
                force=True,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(EmailLogSerializer(new_log).data)


class EmailTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    serializer_class = EmailTemplateSerializer
    queryset = EmailTemplate.objects.all()

    def perform_create(self, serializer):
        obj = serializer.save()
        if obj.is_default:
            EmailTemplate.objects.exclude(pk=obj.pk).update(is_default=False)

    def perform_update(self, serializer):
        obj = serializer.save()
        if obj.is_default:
            EmailTemplate.objects.exclude(pk=obj.pk).update(is_default=False)


class FieldViewSet(viewsets.ModelViewSet):
    """CRUD for dynamic certificate placeholders shown in Insert field."""

    permission_classes = [IsAuthenticated, IsStaffUser]
    pagination_class = None
    serializer_class = CertificateFieldSerializer
    queryset = CertificateField.objects.all()

    def list(self, request, *args, **kwargs):
        services.ensure_default_fields()
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def sources(self, request):
        return Response(
            [{"value": val, "label": label} for val, label in services.BUILTIN_FIELD_SOURCES]
        )

    @action(detail=False, methods=["post"], url_path="restore-defaults")
    def restore_defaults(self, request):
        services.restore_default_fields()
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)


class JobViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffUser]
    serializer_class = JobSerializer
    queryset = CertificateJob.objects.all()


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, IsStaffUser])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def settings_view(request):
    obj = InstituteSettings.load()
    if request.method == "GET":
        return Response(InstituteSettingsSerializer(obj, context={"request": request}).data)
    serializer = InstituteSettingsSerializer(
        obj, data=request.data, partial=True, context={"request": request}
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsStaffUser])
def process_queue(request):
    """Manually send due scheduled certificate emails (same as management command)."""
    limit = int(request.data.get("limit") or 50)
    result = services.process_due_scheduled_emails(limit=max(1, min(limit, 200)))
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def reports_summary(request):
    stats = services.dashboard_stats()
    by_status = {
        row["status"]: row["c"]
        for row in Certificate.objects.values("status").annotate(c=Count("id"))
    }
    email_by_status = {
        row["status"]: row["c"]
        for row in CertificateEmailLog.objects.values("status").annotate(c=Count("id"))
    }
    return Response({**stats, "certificates_by_status": by_status, "emails_by_status": email_by_status})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffUser])
def reports_export(request):
    report_type = (request.query_params.get("type") or "issued").strip().lower()
    # Use file_format — DRF treats query param "format" as content negotiation and 404s.
    file_format = (
        request.query_params.get("file_format")
        or request.query_params.get("export_format")
        or "csv"
    ).strip().lower()
    if report_type not in {"issued", "emails", "courses"}:
        return Response({"detail": "type must be issued, emails, or courses."}, status=400)
    if file_format not in {"csv", "xlsx"}:
        return Response({"detail": "file_format must be csv or xlsx."}, status=400)
    content, content_type, filename = services.export_report_file(report_type, file_format)
    response = HttpResponse(content, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _public_verify_payload(cert, institute, *, valid, message):
    superseded = (
        Certificate.objects.filter(replaces=cert, status=Certificate.Status.ISSUED)
        .order_by("-issue_date", "-id")
        .first()
    )
    return {
        "valid": valid,
        "status": cert.status,
        "certificate_id": cert.public_id,
        "student_name": cert.student.full_name,
        "course_name": cert.course.title,
        "institute_name": institute.institute_name,
        "issue_date": cert.issue_date,
        "completion_date": cert.completion_date,
        "grade": cert.grade or "",
        "enrollment_number": cert.student.enrollment_number or "",
        "duration": getattr(cert.course, "duration_text", "") or "",
        "replaces": cert.replaces.public_id if cert.replaces_id else "",
        "superseded_by": superseded.public_id if superseded else "",
        "message": message,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([VerifyThrottle])
def verify_certificate(request, public_id):
    institute = services.get_institute()
    try:
        cert = Certificate.objects.select_related(
            "student", "course", "replaces"
        ).get(public_id__iexact=public_id.strip())
    except Certificate.DoesNotExist:
        payload = {
            "valid": False,
            "status": "not_found",
            "certificate_id": public_id,
            "student_name": "",
            "course_name": "",
            "institute_name": institute.institute_name,
            "issue_date": None,
            "completion_date": None,
            "grade": "",
            "enrollment_number": "",
            "duration": "",
            "replaces": "",
            "superseded_by": "",
            "message": "No certificate was found for this serial number.",
        }
        return Response(PublicVerifySerializer(payload).data, status=404)

    if cert.status == Certificate.Status.ISSUED:
        payload = _public_verify_payload(
            cert,
            institute,
            valid=True,
            message="This certificate is authentic and was issued by Jordan Beauty Hub.",
        )
        return Response(PublicVerifySerializer(payload).data)

    if cert.status == Certificate.Status.REVOKED:
        message = "This certificate has been revoked and is no longer valid."
    elif cert.status == Certificate.Status.REISSUED:
        message = "This certificate was superseded by a newer reissue."
    else:
        message = f"This certificate is not currently valid (status: {cert.status})."
    payload = _public_verify_payload(cert, institute, valid=False, message=message)
    return Response(PublicVerifySerializer(payload).data)
