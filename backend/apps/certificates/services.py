from __future__ import annotations

import csv
import io
import sys
import threading
from datetime import date, datetime
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import connection, transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.accounts.mail import send_store_email
from apps.courses.models import Course

from .models import (
    Certificate,
    CertificateAuditLog,
    CertificateEmailLog,
    CertificateEnrollment,
    CertificateField,
    CertificateIdCounter,
    CertificateJob,
    CertificateStudent,
    CertificateTemplate,
    CertificateTemplateVersion,
    InstituteSettings,
    StudentGroup,
)


def get_institute():
    return InstituteSettings.load()


def coerce_date(value):
    """Accept date, datetime, or YYYY-MM-DD string from JSON payloads."""
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        parsed = parse_date(value.strip()[:10])
        if parsed is None:
            raise ValueError(f"Invalid date: {value}")
        return parsed
    raise ValueError(f"Invalid date: {value}")


def _student_display_name(user) -> str:
    name = f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip()
    if name:
        return name[:160]
    email = (getattr(user, "email", "") or "").strip()
    if email and "@" in email:
        return email.split("@", 1)[0][:160]
    phone = (getattr(user, "phone", "") or "").strip()
    return phone[:160] or f"Student {user.pk}"


def _unique_shop_enrollment_number(user_id: int) -> str:
    base = f"SHOP-{int(user_id):06d}"
    candidate = base
    n = 2
    while CertificateStudent.objects.filter(enrollment_number=candidate).exists():
        candidate = f"{base}-{n}"
        n += 1
    return candidate


@transaction.atomic
def sync_shop_enrollment_to_certificate(course_enrollment):
    """
    Mirror a shop CourseEnrollment into Certificate Studio.

    Certificates are issued for courses sold/enrolled on the storefront, so every
    active shop enrollment must have a CertificateStudent + CertificateEnrollment.
    """
    from apps.courses.models import CourseEnrollment

    if course_enrollment is None:
        return None, None
    if course_enrollment.status != CourseEnrollment.Status.ACTIVE:
        return None, None

    user = course_enrollment.user
    course = course_enrollment.course
    if user is None or course is None:
        return None, None

    student = CertificateStudent.objects.filter(user=user).first()
    if student is None:
        email = (user.email or "").strip()
        if email:
            student = CertificateStudent.objects.filter(email__iexact=email).first()
            if student is not None and student.user_id is None:
                student.user = user
                updates = ["user", "updated_at"]
                if not student.phone and getattr(user, "phone", ""):
                    student.phone = user.phone
                    updates.append("phone")
                student.save(update_fields=updates)

    if student is None:
        email = (user.email or "").strip()
        if not email:
            # Phone-only accounts still need an email key on CertificateStudent.
            digits = "".join(ch for ch in (user.phone or "") if ch.isdigit()) or str(user.pk)
            email = f"phone.{digits}@users.jordanbeauty.local"
        student = CertificateStudent.objects.create(
            full_name=_student_display_name(user),
            email=email,
            phone=(getattr(user, "phone", "") or "")[:20],
            enrollment_number=_unique_shop_enrollment_number(user.pk),
            user=user,
            is_active=True,
            notes="Synced from shop course enrollment",
        )
    else:
        touch = []
        if not student.is_active:
            student.is_active = True
            touch.append("is_active")
        if student.user_id != user.pk:
            student.user = user
            touch.append("user")
        phone = (getattr(user, "phone", "") or "")[:20]
        if phone and student.phone != phone:
            student.phone = phone
            touch.append("phone")
        if touch:
            touch.append("updated_at")
            student.save(update_fields=touch)

    enrollment_date = None
    if getattr(course_enrollment, "created_at", None):
        enrollment_date = timezone.localdate(course_enrollment.created_at)

    cert_enrollment = (
        CertificateEnrollment.objects.filter(student=student, course=course)
        .exclude(status=CertificateEnrollment.Status.WITHDRAWN)
        .first()
    )
    if cert_enrollment is None:
        withdrawn = CertificateEnrollment.objects.filter(
            student=student,
            course=course,
            status=CertificateEnrollment.Status.WITHDRAWN,
        ).first()
        if withdrawn is not None:
            withdrawn.status = CertificateEnrollment.Status.ENROLLED
            withdrawn.enrollment_date = withdrawn.enrollment_date or enrollment_date
            withdrawn.save(update_fields=["status", "enrollment_date", "updated_at"])
            cert_enrollment = withdrawn
        else:
            cert_enrollment = CertificateEnrollment.objects.create(
                student=student,
                course=course,
                status=CertificateEnrollment.Status.ENROLLED,
                enrollment_date=enrollment_date,
            )
    return student, cert_enrollment


def sync_all_shop_course_enrollments():
    """Backfill Certificate Studio from every active shop CourseEnrollment."""
    from apps.courses.models import CourseEnrollment

    before_ids = set(CertificateStudent.objects.values_list("id", flat=True))
    linked_enrollments = 0
    qs = (
        CourseEnrollment.objects.filter(status=CourseEnrollment.Status.ACTIVE)
        .select_related("user", "course")
        .order_by("id")
    )
    shop_count = qs.count()
    for shop_enrollment in qs.iterator():
        student, cert_enrollment = sync_shop_enrollment_to_certificate(shop_enrollment)
        if student is None:
            continue
        if cert_enrollment is not None:
            linked_enrollments += 1
    created_students = CertificateStudent.objects.exclude(id__in=before_ids).count()
    return {
        "shop_enrollments": shop_count,
        "linked_enrollments": linked_enrollments,
        "students_created": created_students,
    }


@transaction.atomic
def next_certificate_public_id(issue_date=None):
    """Allocate JBH-YYYY-000001 under a row lock (safe under concurrent issuers)."""
    when = coerce_date(issue_date) or timezone.localdate()
    year = when.year
    institute = get_institute()
    prefix = (institute.certificate_id_prefix or "JBH").strip().upper() or "JBH"
    counter, _ = CertificateIdCounter.objects.select_for_update().get_or_create(
        year=year, defaults={"last_value": 0}
    )
    counter.last_value += 1
    counter.save(update_fields=["last_value"])
    return f"{prefix}-{year}-{counter.last_value:06d}"


def verification_url(public_id):
    institute = get_institute()
    base = (institute.verification_base_url or "").strip()
    if not base:
        front = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        base = f"{front}/certificate/verify"
    return f"{base.rstrip('/')}/{public_id}"


def qr_download_url(public_id):
    """Public URL encoded inside the certificate QR code to download the issued PDF directly."""
    from urllib.parse import urlsplit

    institute = get_institute()
    base = (institute.verification_base_url or "").strip()
    origin = ""
    if base:
        parsed = urlsplit(base)
        if parsed.scheme and parsed.netloc:
            origin = f"{parsed.scheme}://{parsed.netloc}"
    if not origin:
        origin = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return f"{origin}/api/certificates/verify/{public_id}/download/"


def dashboard_stats():
    students = CertificateStudent.objects.filter(is_active=True).count()
    courses = Course.objects.filter(is_active=True).count()
    active_courses = Course.objects.filter(is_active=True, is_published=True).count()
    completed = CertificateEnrollment.objects.filter(
        status=CertificateEnrollment.Status.COMPLETED
    ).count()
    issued = Certificate.objects.filter(status=Certificate.Status.ISSUED).count()
    pending = CertificateEnrollment.objects.filter(
        status=CertificateEnrollment.Status.COMPLETED
    ).exclude(
        certificates__status=Certificate.Status.ISSUED,
    ).distinct().count()
    emails_sent = CertificateEmailLog.objects.filter(
        status=CertificateEmailLog.Status.SENT
    ).count()
    emails_failed = CertificateEmailLog.objects.filter(
        status=CertificateEmailLog.Status.FAILED
    ).count()

    recent_certificates = list(
        Certificate.objects.select_related("student", "course")
        .order_by("-created_at")[:8]
        .values(
            "id",
            "public_id",
            "status",
            "issue_date",
            "created_at",
            "student__full_name",
            "course__title",
        )
    )
    recent_enrollments = list(
        CertificateEnrollment.objects.select_related("student", "course")
        .order_by("-created_at")[:8]
        .values(
            "id",
            "status",
            "enrollment_date",
            "created_at",
            "student__full_name",
            "course__title",
        )
    )
    course_stats = list(
        Course.objects.filter(is_active=True)
        .annotate(
            certificate_count=Count(
                "certificates",
                filter=Q(certificates__status=Certificate.Status.ISSUED),
            ),
            enrollment_count=Count("certificate_enrollments"),
        )
        .order_by("-certificate_count", "title")[:10]
        .values("id", "title", "code", "certificate_count", "enrollment_count")
    )
    group_stats = list(
        StudentGroup.objects.filter(is_active=True)
        .annotate(
            student_count=Count("memberships", distinct=True),
            completed_count=Count(
                "enrollments",
                filter=Q(enrollments__status=CertificateEnrollment.Status.COMPLETED),
                distinct=True,
            ),
        )
        .order_by("-student_count")[:10]
        .values("id", "name", "course__title", "student_count", "completed_count")
    )

    return {
        "total_students": students,
        "total_courses": courses,
        "active_courses": active_courses,
        "completed_students": completed,
        "total_issued_certificates": issued,
        "pending_certificates": pending,
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "recent_certificates": recent_certificates,
        "recent_enrollments": recent_enrollments,
        "course_stats": course_stats,
        "group_stats": group_stats,
    }


def ensure_template_version(template, user=None):
    latest = template.versions.order_by("-version_number").first()
    if latest:
        return latest
    return CertificateTemplateVersion.objects.create(
        template=template,
        version_number=1,
        layout_json=_default_layout(),
        orientation=template.orientation,
        page_size=template.page_size,
        created_by=user,
    )


def publish_template_version(template, layout_json, user=None):
    latest = template.versions.order_by("-version_number").first()
    next_n = (latest.version_number + 1) if latest else 1
    version = CertificateTemplateVersion.objects.create(
        template=template,
        version_number=next_n,
        layout_json=layout_json or _default_layout(),
        orientation=template.orientation,
        page_size=template.page_size,
        created_by=user,
    )
    if template.background_file:
        version.background_file = template.background_file
        version.save(update_fields=["background_file"])
    return version


def _default_layout():
    return {
        "elements": [
            {
                "id": "title",
                "type": "text",
                "text": "Certificate of Completion",
                "x": 50,
                "y": 18,
                "fontSize": 32,
                "fontWeight": "bold",
                "fontFamily": "cormorant",
                "align": "center",
                "color": "#1a2744",
            },
            {
                "id": "student",
                "type": "dynamic",
                "placeholder": "{{student_name}}",
                "x": 50,
                "y": 42,
                "fontSize": 26,
                "fontWeight": "bold",
                "fontFamily": "cormorant",
                "align": "center",
                "color": "#1a2744",
            },
            {
                "id": "course",
                "type": "dynamic",
                "placeholder": "{{course_name}}",
                "x": 50,
                "y": 55,
                "fontSize": 16,
                "fontFamily": "cormorant",
                "align": "center",
                "color": "#4a5568",
            },
            {
                "id": "meta",
                "type": "dynamic",
                "placeholder": "Certificate {{certificate_id}} · Issued {{issue_date}}",
                "x": 50,
                "y": 78,
                "fontSize": 11,
                "fontFamily": "helvetica",
                "align": "center",
                "color": "#718096",
            },
        ]
    }


BUILTIN_FIELD_SOURCES = [
    ("custom", "Custom text (default / per-batch value)"),
    ("student_name", "Student full name"),
    ("course_name", "Course title"),
    ("certificate_id", "Certificate serial ID"),
    ("completion_date", "Completion date"),
    ("issue_date", "Issue date"),
    ("institute_name", "Institute name"),
    ("grade", "Grade"),
    ("duration", "Course duration"),
    ("enrollment_number", "Student enrollment number"),
    ("authorized_signatory", "Authorized signatory"),
    ("institute_address", "Institute address"),
    ("group_name", "Group / batch name"),
    ("course_code", "Course code"),
    ("student_email", "Student email"),
    ("student_phone", "Student phone"),
]

DEFAULT_CERTIFICATE_FIELDS = [
    ("student_name", "Student name", "student_name", 10),
    ("course_name", "Course name", "course_name", 20),
    ("certificate_id", "Certificate ID", "certificate_id", 30),
    ("completion_date", "Completion date", "completion_date", 40),
    ("issue_date", "Issue date", "issue_date", 50),
    ("institute_name", "Institute name", "institute_name", 60),
    ("grade", "Grade", "grade", 70),
    ("duration", "Duration", "duration", 80),
    ("enrollment_number", "Enrollment number", "enrollment_number", 90),
]


def ensure_default_fields():
    if CertificateField.objects.exists():
        return
    for key, label, source, order in DEFAULT_CERTIFICATE_FIELDS:
        CertificateField.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "source": source,
                "sort_order": order,
                "is_active": True,
            },
        )


def restore_default_fields():
    for key, label, source, order in DEFAULT_CERTIFICATE_FIELDS:
        obj, created = CertificateField.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "source": source,
                "sort_order": order,
                "is_active": True,
            },
        )
        if not created and not obj.is_active:
            obj.is_active = True
            obj.save(update_fields=["is_active", "updated_at"])


def placeholder_context(certificate):
    institute = get_institute()
    builtins = {
        "student_name": certificate.student.full_name,
        "course_name": certificate.course.title,
        "certificate_id": certificate.public_id,
        "completion_date": _fmt_date(certificate.completion_date),
        "issue_date": _fmt_date(certificate.issue_date),
        "institute_name": institute.institute_name,
        "grade": certificate.grade or "",
        "duration": certificate.course.duration_text or "",
        "enrollment_number": certificate.student.enrollment_number,
        "authorized_signatory": institute.authorized_signatory or "",
        "institute_address": institute.institute_address or "",
        "group_name": certificate.group.name if certificate.group else "",
        "course_code": certificate.course.code or "",
        "student_email": certificate.student.email or "",
        "student_phone": certificate.student.phone or "",
    }
    ctx = dict(builtins)
    for field in CertificateField.objects.filter(is_active=True):
        if field.source == "custom":
            ctx[field.key] = field.default_value or ""
        elif field.source in builtins:
            ctx[field.key] = builtins[field.source] or field.default_value or ""
        else:
            ctx[field.key] = field.default_value or ""
    for k, v in (getattr(certificate, "custom_data", None) or {}).items():
        if v not in (None, ""):
            ctx[str(k)] = str(v)
    return ctx


def _fmt_date(value):
    if not value:
        return ""
    if isinstance(value, date):
        return value.strftime("%d %B %Y")
    return str(value)


def render_placeholder(text, context):
    out = text or ""
    for key, value in context.items():
        out = out.replace("{{" + key + "}}", str(value))
    return out


def _read_background_bytes(bg_field):
    if not bg_field:
        return b"", ""
    name = (bg_field.name or "").lower()
    try:
        bg_field.open("rb")
        data = bg_field.read()
    except OSError:
        return b"", name
    finally:
        try:
            bg_field.close()
        except OSError:
            pass
    return data, name


def _normalized_page_metrics(page):
    """Return (left, bottom, width, height) after applying any /Rotate entry cleanly."""
    if getattr(page, "rotation", 0):
        page.transfer_rotation_to_content()
    box = page.cropbox or page.mediabox
    left = float(box.left)
    bottom = float(box.bottom)
    width = max(1.0, float(box.width))
    height = max(1.0, float(box.height))
    return left, bottom, width, height


def _merge_pdf_background(background_pdf: bytes, overlay_pdf: bytes, target_page=None) -> bytes:
    from pypdf import PageObject, PdfReader, PdfWriter, Transformation
    from reportlab.lib.pagesizes import A4, landscape

    bg_reader = PdfReader(io.BytesIO(background_pdf))
    overlay_reader = PdfReader(io.BytesIO(overlay_pdf))
    if not bg_reader.pages or not overlay_reader.pages:
        return overlay_pdf

    bg_page = bg_reader.pages[0]
    overlay_page = overlay_reader.pages[0]
    default_w, default_h = target_page or landscape(A4)
    _, _, ov_w, ov_h = _normalized_page_metrics(overlay_page)
    target_w = float(default_w or ov_w)
    target_h = float(default_h or ov_h)

    left, bottom, bg_w, bg_h = _normalized_page_metrics(bg_page)
    canvas_page = PageObject.create_blank_page(width=target_w, height=target_h)
    bg_transform = Transformation().translate(-left, -bottom).scale(target_w / bg_w, target_h / bg_h)
    canvas_page.merge_transformed_page(bg_page, bg_transform)
    canvas_page.merge_page(overlay_page)

    writer = PdfWriter()
    writer.add_page(canvas_page)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def fit_pdf_for_a4_print(pdf_bytes: bytes, margin_mm: float = 5.0) -> bytes:
    """Normalize every page to ISO A4 with safe printable margins so printers do not crop edges."""
    from pypdf import PageObject, PdfReader, PdfWriter, Transformation
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm

    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    margin = max(0.0, float(margin_mm)) * mm

    for src_page in reader.pages:
        left, bottom, src_w, src_h = _normalized_page_metrics(src_page)
        target_w, target_h = landscape(A4) if src_w >= src_h else A4
        usable_w = max(10.0, target_w - 2.0 * margin)
        usable_h = max(10.0, target_h - 2.0 * margin)
        scale = min(usable_w / src_w, usable_h / src_h)
        offset_x = (target_w - src_w * scale) / 2.0
        offset_y = (target_h - src_h * scale) / 2.0

        dest_page = PageObject.create_blank_page(width=target_w, height=target_h)
        transform = Transformation().translate(-left, -bottom).scale(scale, scale).translate(offset_x, offset_y)
        dest_page.merge_transformed_page(src_page, transform)
        writer.add_page(dest_page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def merge_certificate_pdfs(certificates) -> bytes:
    """Merge individual certificate PDFs into one multi-page PDF for batch printing."""
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter()
    pages_added = 0
    for cert in certificates:
        if not cert.pdf:
            continue
        try:
            cert.pdf.open("rb")
            raw = cert.pdf.read()
        except OSError:
            continue
        finally:
            try:
                cert.pdf.close()
            except OSError:
                pass
        if not raw:
            continue
        reader = PdfReader(io.BytesIO(raw))
        for page in reader.pages:
            writer.add_page(page)
            pages_added += 1
    if pages_added == 0:
        raise ValueError("No certificate PDFs available to print.")
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def _parse_hex_color(value, fallback=(0.1, 0.15, 0.27)):
    raw = (value or "").strip()
    if raw.startswith("#") and len(raw) in (4, 7):
        try:
            if len(raw) == 4:
                r = int(raw[1] * 2, 16) / 255.0
                g = int(raw[2] * 2, 16) / 255.0
                b = int(raw[3] * 2, 16) / 255.0
            else:
                r = int(raw[1:3], 16) / 255.0
                g = int(raw[3:5], 16) / 255.0
                b = int(raw[5:7], 16) / 255.0
            return r, g, b
        except ValueError:
            return fallback
    return fallback


_FONTS_INITIALIZED = False
_REGISTERED_TTF_NAMES = set()

# Canonical font key -> (TTF filename prefix under fonts/, built-in PDF fallback family)
_CUSTOM_FONT_SPECS = {
    "open-sans": ("OpenSans", "Helvetica"),
    "poppins": ("Poppins", "Helvetica"),
    "roboto": ("Roboto", "Helvetica"),
    "lato": ("Lato", "Helvetica"),
    "montserrat": ("Montserrat", "Helvetica"),
    "inter": ("Inter", "Helvetica"),
    "nunito": ("Nunito", "Helvetica"),
    "raleway": ("Raleway", "Helvetica"),
    "cormorant": ("CormorantGaramond", "Times"),
    "playfair": ("PlayfairDisplay", "Times"),
    "merriweather": ("Merriweather", "Times"),
    "lora": ("Lora", "Times"),
    "cinzel": ("Cinzel", "Times"),
    "libre-baskerville": ("LibreBaskerville", "Times"),
    "script": ("GreatVibes", "Times"),
    "dancing-script": ("DancingScript", "Times"),
    "alex-brush": ("AlexBrush", "Times"),
    "pacifico": ("Pacifico", "Times"),
    "allura": ("Allura", "Times"),
    "oswald": ("Oswald", "Helvetica"),
    "bricolage": ("BricolageGrotesque", "Helvetica"),
    "roboto-mono": ("RobotoMono", "Courier"),
}

_FONT_ALIASES = {
    "opensans": "open-sans",
    "open sans": "open-sans",
    "sans": "open-sans",
    "sans-serif": "helvetica",
    "cormorant-garamond": "cormorant",
    "cormorant garamond": "cormorant",
    "garamond": "cormorant",
    "cormorantgaramond": "cormorant",
    "playfair-display": "playfair",
    "playfair display": "playfair",
    "playfairdisplay": "playfair",
    "libre baskerville": "libre-baskerville",
    "librebaskerville": "libre-baskerville",
    "great-vibes": "script",
    "great vibes": "script",
    "greatvibes": "script",
    "cursive": "script",
    "dancing script": "dancing-script",
    "dancingscript": "dancing-script",
    "alex brush": "alex-brush",
    "alexbrush": "alex-brush",
    "bricolage-grotesque": "bricolage",
    "bricolage grotesque": "bricolage",
    "bricolagegrotesque": "bricolage",
    "roboto mono": "roboto-mono",
    "robotomono": "roboto-mono",
    "times-roman": "times",
    "times new roman": "times",
    "serif": "times",
    "mono": "courier",
    "monospace": "courier",
}

_BUILTIN_PDF_FAMILIES = {
    "helvetica": {
        (False, False): "Helvetica",
        (True, False): "Helvetica-Bold",
        (False, True): "Helvetica-Oblique",
        (True, True): "Helvetica-BoldOblique",
    },
    "times": {
        (False, False): "Times-Roman",
        (True, False): "Times-Bold",
        (False, True): "Times-Italic",
        (True, True): "Times-BoldItalic",
    },
    "courier": {
        (False, False): "Courier",
        (True, False): "Courier-Bold",
        (False, True): "Courier-Oblique",
        (True, True): "Courier-BoldOblique",
    },
}


def _register_certificate_fonts():
    """Register all bundled TTFs in apps/certificates/fonts/ once for ReportLab."""
    global _FONTS_INITIALIZED
    if _FONTS_INITIALIZED:
        return
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    fonts_dir = Path(__file__).resolve().parent / "fonts"
    for font_path in sorted(fonts_dir.glob("*.ttf")):
        font_name = font_path.stem
        try:
            pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
            _REGISTERED_TTF_NAMES.add(font_name)
        except Exception:  # noqa: BLE001 — fall back cleanly if a font file cannot load
            continue
    _FONTS_INITIALIZED = True


def _normalize_font_key(raw_family):
    key = (raw_family or "helvetica").strip().lower().replace("_", "-")
    if key in _FONT_ALIASES:
        return _FONT_ALIASES[key]
    spaced = key.replace("-", " ")
    if spaced in _FONT_ALIASES:
        return _FONT_ALIASES[spaced]
    return key


def _variant_suffix_candidates(bold, italic):
    if bold and italic:
        return ("BoldItalic", "Bold", "Italic", "Regular")
    if bold:
        return ("Bold", "Regular")
    if italic:
        return ("Italic", "Regular")
    return ("Regular", "Bold")


def _pdf_font_name(el):
    _register_certificate_fonts()
    family = _normalize_font_key(el.get("fontFamily"))
    bold = str(el.get("fontWeight") or "").strip().lower() in ("bold", "600", "700", "800")
    italic = str(el.get("fontStyle") or "").strip().lower() == "italic"

    spec = _CUSTOM_FONT_SPECS.get(family)
    if spec is not None:
        prefix, fallback_family = spec
        for suffix in _variant_suffix_candidates(bold, italic):
            candidate = f"{prefix}-{suffix}"
            if candidate in _REGISTERED_TTF_NAMES:
                return candidate
        return _BUILTIN_PDF_FAMILIES[fallback_family.lower()][(bold, italic)]

    builtin = _BUILTIN_PDF_FAMILIES.get(family, _BUILTIN_PDF_FAMILIES["helvetica"])
    return builtin[(bold, italic)]


def _sorted_layout_elements(layout_json):
    elements = list((layout_json or {}).get("elements") or _default_layout()["elements"])
    return sorted(elements, key=lambda el: int(el.get("zIndex") or 0))


def _resolve_image_bytes(el):
    """Load overlay image bytes from media path or absolute filesystem path."""
    path = (el.get("src") or el.get("path") or "").strip()
    if not path:
        return None
    candidates = []
    if path.startswith("/media/"):
        candidates.append(Path(settings.MEDIA_ROOT) / path[len("/media/") :])
    elif path.startswith("media/"):
        candidates.append(Path(settings.MEDIA_ROOT) / path[len("media/") :])
    else:
        candidates.append(Path(settings.MEDIA_ROOT) / path.lstrip("/"))
        candidates.append(Path(path))
    for candidate in candidates:
        try:
            if candidate.is_file():
                return candidate.read_bytes()
        except OSError:
            continue
    return None


def _draw_wrapped_text(c, text, x, y, *, font_name, font_size, align, max_width):
    from reportlab.pdfbase.pdfmetrics import stringWidth

    lines = []
    for paragraph in (text or "").split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            trial = f"{current} {word}"
            if stringWidth(trial, font_name, font_size) <= max_width:
                current = trial
            else:
                lines.append(current)
                current = word
        lines.append(current)
    if not any(lines):
        return
    line_height = font_size * 1.25
    # Anchor at vertical center of the block for multi-line.
    # x is the box center; left/right align to the box edges.
    if align == "left":
        anchor_x = x - max_width / 2.0
    elif align == "right":
        anchor_x = x + max_width / 2.0
    else:
        anchor_x = x
    start_y = y + ((len(lines) - 1) * line_height) / 2.0
    for index, line in enumerate(lines):
        ly = start_y - index * line_height
        if align == "right":
            c.drawRightString(anchor_x, ly, line)
        elif align == "left":
            c.drawString(anchor_x, ly, line)
        else:
            c.drawCentredString(anchor_x, ly, line)


def _draw_qr(c, certificate, x, y, size):
    from reportlab.lib.utils import ImageReader

    import qrcode

    qr = qrcode.QRCode(box_size=4, border=1)
    qr.add_data(qr_download_url(certificate.public_id))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    qr_buf = io.BytesIO()
    img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    c.drawImage(
        ImageReader(qr_buf),
        x - size / 2.0,
        y - size / 2.0,
        size,
        size,
        mask="auto",
        preserveAspectRatio=True,
    )


def generate_certificate_pdf_bytes(certificate):
    """Render an A4 PDF with background, layout elements (text/image/qr), and placeholders."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    version = certificate.template_version
    page = landscape(A4) if version.orientation == "landscape" else A4
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=page)
    width, height = page
    ctx = placeholder_context(certificate)

    bg_bytes, bg_name = _read_background_bytes(version.background_file)
    use_pdf_background = bool(bg_bytes) and bg_name.endswith(".pdf")
    background_drawn = False

    if bg_bytes and bg_name.endswith((".png", ".jpg", ".jpeg", ".webp")):
        try:
            c.drawImage(
                ImageReader(io.BytesIO(bg_bytes)),
                0,
                0,
                width=width,
                height=height,
                preserveAspectRatio=False,
                mask="auto",
            )
            background_drawn = True
        except Exception:  # noqa: BLE001 — fall back to framed layout
            background_drawn = False

    if not background_drawn and not use_pdf_background:
        c.setFillColorRGB(0.98, 0.96, 0.93)
        c.rect(0, 0, width, height, fill=1, stroke=0)
        c.setStrokeColorRGB(0.72, 0.58, 0.36)
        c.setLineWidth(2)
        c.rect(12 * mm, 12 * mm, width - 24 * mm, height - 24 * mm, fill=0, stroke=1)

    elements = _sorted_layout_elements(version.layout_json)
    has_qr_element = any((el.get("type") or "") == "qr" for el in elements)

    for el in elements:
        el_type = (el.get("type") or "text").lower()
        x_pct = float(el.get("x", 50)) / 100.0
        y_pct = float(el.get("y", 50)) / 100.0
        x = width * x_pct
        y = height * (1 - y_pct)
        width_pct = float(el.get("width") or 0)

        if el_type == "cover":
            # Non-destructive erase: opaque rect above the background photo.
            box_w = (width_pct / 100.0) * width if width_pct > 0 else width * 0.2
            height_pct = float(el.get("height") or 0)
            box_h = (height_pct / 100.0) * height if height_pct > 0 else box_w * 0.35
            c.setFillColorRGB(*_parse_hex_color(el.get("fill") or el.get("color") or "#ffffff", (1, 1, 1)))
            c.rect(x - box_w / 2.0, y - box_h / 2.0, box_w, box_h, fill=1, stroke=0)
            continue

        if el_type == "image":
            raw = _resolve_image_bytes(el)
            if not raw:
                continue
            draw_w = (width_pct / 100.0) * width if width_pct > 0 else min(width, height) * 0.18
            try:
                reader = ImageReader(io.BytesIO(raw))
                img_w, img_h = reader.getSize()
                draw_h = draw_w * (img_h / img_w) if img_w else draw_w
                c.drawImage(
                    reader,
                    x - draw_w / 2.0,
                    y - draw_h / 2.0,
                    draw_w,
                    draw_h,
                    mask="auto",
                    preserveAspectRatio=True,
                )
            except Exception:  # noqa: BLE001
                continue
            continue

        if el_type == "qr":
            box = (width_pct / 100.0) * width if width_pct > 0 else 28 * mm
            _draw_qr(c, certificate, x, y, box)
            continue

        text = el.get("text") or el.get("placeholder") or ""
        text = render_placeholder(text, ctx)
        if not text:
            continue
        size = float(el.get("fontSize", 14))
        font_name = _pdf_font_name(el)
        align = el.get("align", "center")
        c.setFillColorRGB(*_parse_hex_color(el.get("color")))
        c.setFont(font_name, size)
        # Letter spacing is applied via a text object when ReportLab supports it.
        letter_spacing = float(el.get("letterSpacing") or 0)
        max_width = (width_pct / 100.0) * width if width_pct > 0 else width * 0.8
        if width_pct > 0 or "\n" in text or len(text) > 48:
            _draw_wrapped_text(
                c,
                text.replace("\n", " "),
                x,
                y,
                font_name=font_name,
                font_size=size,
                align=align,
                max_width=max_width,
            )
        elif letter_spacing:
            text_obj = c.beginText()
            text_obj.setTextOrigin(x, y)
            text_obj.setFont(font_name, size)
            if hasattr(text_obj, "setCharSpace"):
                text_obj.setCharSpace(letter_spacing)
            if align == "center":
                text_obj.setTextOrigin(x - c.stringWidth(text, font_name, size) / 2.0, y)
            elif align == "right":
                text_obj.setTextOrigin(x - c.stringWidth(text, font_name, size), y)
            text_obj.textLine(text)
            c.drawText(text_obj)
        elif align == "center":
            c.drawCentredString(x, y, text)
        elif align == "right":
            c.drawRightString(x, y, text)
        else:
            c.drawString(x, y, text)

    # Legacy templates without an explicit QR element still get a bottom-right QR.
    if not has_qr_element:
        _draw_qr(c, certificate, width - 31 * mm, 32 * mm, 28 * mm)
        c.setFillColorRGB(0.1, 0.15, 0.27)
        c.setFont("Helvetica", 8)
        c.drawCentredString(width - 31 * mm, 15 * mm, "Verify")

    c.showPage()
    c.save()
    overlay = buffer.getvalue()
    if use_pdf_background:
        try:
            return _merge_pdf_background(bg_bytes, overlay, target_page=page)
        except Exception:  # noqa: BLE001
            return overlay
    return overlay


@transaction.atomic
def issue_certificate(
    *,
    student,
    course,
    template_version,
    group=None,
    enrollment=None,
    grade="",
    completion_date=None,
    issue_date=None,
    custom_data=None,
    user=None,
    force_reissue=False,
):
    existing = (
        Certificate.objects.select_for_update()
        .filter(student=student, course=course, status=Certificate.Status.ISSUED)
        .first()
    )
    if existing and not force_reissue:
        raise ValueError(
            f"An issued certificate already exists for this student and course ({existing.public_id})."
        )

    if existing and force_reissue:
        existing.status = Certificate.Status.REISSUED
        existing.save(update_fields=["status", "updated_at"])
        CertificateAuditLog.objects.create(
            certificate=existing,
            action="reissued_superseded",
            detail="Superseded by a new certificate.",
            actor=user,
        )

    when = coerce_date(issue_date) or timezone.localdate()
    completed = (
        coerce_date(completion_date)
        or (enrollment.completion_date if enrollment else None)
        or when
    )
    public_id = next_certificate_public_id(when)
    cert = Certificate.objects.create(
        public_id=public_id,
        student=student,
        course=course,
        group=group,
        enrollment=enrollment,
        template_version=template_version,
        status=Certificate.Status.ISSUED,
        grade=grade or (enrollment.grade if enrollment else ""),
        completion_date=completed,
        issue_date=when,
        custom_data=dict(custom_data or {}),
        replaces=existing,
        issued_by=user,
    )
    pdf_bytes = generate_certificate_pdf_bytes(cert)
    cert.pdf.save(f"{public_id}.pdf", ContentFile(pdf_bytes), save=True)
    CertificateAuditLog.objects.create(
        certificate=cert,
        action="issued",
        detail="Certificate issued and PDF generated.",
        actor=user,
    )
    return cert


def revoke_certificate(certificate, user=None, reason=""):
    if certificate.status == Certificate.Status.REVOKED:
        return certificate
    certificate.status = Certificate.Status.REVOKED
    certificate.save(update_fields=["status", "updated_at"])
    CertificateAuditLog.objects.create(
        certificate=certificate,
        action="revoked",
        detail=reason or "Certificate revoked.",
        actor=user,
    )
    return certificate


@transaction.atomic
def delete_certificate(certificate):
    """Permanently remove a mistakenly issued certificate record and its generated PDF."""
    if certificate.pdf:
        certificate.pdf.delete(save=False)
    certificate.delete()


def _deliver_certificate_email_log(log):
    """Send (or resend) using an existing email log row — no duplicate log."""
    certificate = log.certificate
    attachments = []
    if certificate.pdf:
        try:
            certificate.pdf.open("rb")
            attachments.append(
                (Path(certificate.pdf.name).name, certificate.pdf.read(), "application/pdf")
            )
            certificate.pdf.close()
        except OSError as exc:
            log.status = CertificateEmailLog.Status.FAILED
            log.error_message = str(exc)
            log.attempts = (log.attempts or 0) + 1
            log.save(update_fields=["status", "error_message", "attempts", "updated_at"])
            raise

    log.status = CertificateEmailLog.Status.SENDING
    log.attempts = (log.attempts or 0) + 1
    log.save(update_fields=["status", "attempts", "updated_at"])

    ok = send_store_email(
        subject=log.subject,
        to=[log.to_email or certificate.student.email],
        text_body=log.body,
        attachments=attachments or None,
    )
    if ok:
        log.status = CertificateEmailLog.Status.SENT
        log.sent_at = timezone.now()
        log.error_message = ""
    else:
        log.status = CertificateEmailLog.Status.FAILED
        log.error_message = "Email backend reported failure."
    log.save(update_fields=["status", "sent_at", "error_message", "updated_at"])
    if not ok:
        raise ValueError(log.error_message)
    return log


def send_certificate_email(certificate, *, subject=None, body=None, user=None, force=False):
    if certificate.status != Certificate.Status.ISSUED:
        raise ValueError("Only issued certificates can be emailed.")
    if not certificate.student.email:
        raise ValueError("Student has no email address.")
    if not force and CertificateEmailLog.objects.filter(
        certificate=certificate, status=CertificateEmailLog.Status.SENT
    ).exists():
        raise ValueError(
            "This certificate was already emailed. Pass force to resend explicitly."
        )

    institute = get_institute()
    ctx = placeholder_context(certificate)
    subj = render_placeholder(subject or institute.default_email_subject, ctx)
    msg = render_placeholder(body or institute.default_email_body, ctx)
    log = CertificateEmailLog.objects.create(
        certificate=certificate,
        to_email=certificate.student.email,
        subject=subj,
        body=msg,
        status=CertificateEmailLog.Status.PENDING,
        attempts=0,
        created_by=user,
    )
    return _deliver_certificate_email_log(log)


def start_job(job_type, payload, user=None):
    job = CertificateJob.objects.create(
        job_type=job_type,
        payload=payload or {},
        created_by=user,
        status=CertificateJob.Status.PENDING,
    )

    def runner():
        # New thread needs its own DB connection (SQLite locks if the request conn is shared).
        connection.close()
        _run_job(job.id)

    # Run inline under tests so SQLite + threads do not race the test transaction.
    if "test" in sys.argv or getattr(settings, "CERTIFICATE_JOBS_SYNC", False):
        runner()
    else:
        threading.Thread(target=runner, daemon=True).start()
    return job


def _run_job(job_id):
    try:
        job = CertificateJob.objects.get(pk=job_id)
    except CertificateJob.DoesNotExist:
        return
    job.status = CertificateJob.Status.RUNNING
    job.save(update_fields=["status", "updated_at"])
    try:
        if job.job_type == CertificateJob.JobType.GENERATE:
            _run_generate_job(job)
        elif job.job_type == CertificateJob.JobType.EMAIL:
            _run_email_job(job)
        else:
            raise ValueError(f"Unknown job type {job.job_type}")
        job.status = CertificateJob.Status.COMPLETED
        job.save(update_fields=["status", "updated_at"])
    except Exception as exc:  # noqa: BLE001 — surface to job record
        job.status = CertificateJob.Status.FAILED
        job.error_message = str(exc)
        job.save(update_fields=["status", "error_message", "updated_at"])


def _run_generate_job(job):
    from apps.courses.models import Course

    payload = job.payload or {}
    student_ids = payload.get("student_ids") or []
    course = Course.objects.get(pk=payload["course_id"])
    template = CertificateTemplate.objects.get(pk=payload["template_id"])
    version = ensure_template_version(template, user=job.created_by)
    group = None
    if payload.get("group_id"):
        group = StudentGroup.objects.get(pk=payload["group_id"])
    students = list(CertificateStudent.objects.filter(id__in=student_ids))
    job.total = len(students)
    job.current = 0
    job.save(update_fields=["total", "current", "updated_at"])
    created = []
    created_items = []
    emailed = []
    errors = []
    completion = coerce_date(payload.get("completion_date"))
    issue = coerce_date(payload.get("issue_date"))
    send_email = bool(payload.get("send_email", True))
    for student in students:
        try:
            enrollment = CertificateEnrollment.objects.filter(
                student=student, course=course
            ).exclude(status=CertificateEnrollment.Status.WITHDRAWN).first()
            if enrollment is None:
                enrollment = CertificateEnrollment.objects.create(
                    student=student,
                    course=course,
                    group=group,
                    status=CertificateEnrollment.Status.COMPLETED,
                    completion_date=completion or timezone.localdate(),
                    grade=payload.get("grade") or "",
                )
            elif group and enrollment.group_id != group.id:
                enrollment.group = group
                enrollment.save(update_fields=["group", "updated_at"])
            cert = issue_certificate(
                student=student,
                course=course,
                template_version=version,
                group=group,
                enrollment=enrollment,
                grade=payload.get("grade") or "",
                completion_date=completion,
                issue_date=issue,
                custom_data=payload.get("custom_data") or {},
                user=job.created_by,
                force_reissue=bool(payload.get("force_reissue")),
            )
            created.append(cert.public_id)
            created_items.append(
                {
                    "id": cert.id,
                    "public_id": cert.public_id,
                    "student_name": student.full_name,
                }
            )
            if send_email:
                try:
                    send_certificate_email(cert, user=job.created_by, force=True)
                    emailed.append(cert.public_id)
                except Exception as mail_exc:  # noqa: BLE001
                    errors.append(
                        {
                            "student_id": student.id,
                            "error": f"Issued {cert.public_id} but email failed: {mail_exc}",
                        }
                    )
        except Exception as exc:  # noqa: BLE001
            errors.append({"student_id": student.id, "error": str(exc)})
        job.current += 1
        job.result = {
            "created": created,
            "created_items": created_items,
            "emailed": emailed,
            "errors": errors,
        }
        job.save(update_fields=["current", "result", "updated_at"])


def _run_email_job(job):
    payload = job.payload or {}
    cert_ids = payload.get("certificate_ids") or []
    certs = list(Certificate.objects.filter(id__in=cert_ids))
    job.total = len(certs)
    job.current = 0
    job.save(update_fields=["total", "current", "updated_at"])
    sent = []
    errors = []
    for cert in certs:
        try:
            send_certificate_email(
                cert,
                subject=payload.get("subject"),
                body=payload.get("body"),
                user=job.created_by,
                force=bool(payload.get("force")),
            )
            sent.append(cert.public_id)
        except Exception as exc:  # noqa: BLE001
            errors.append({"certificate_id": cert.id, "error": str(exc)})
        job.current += 1
        job.result = {"sent": sent, "errors": errors}
        job.save(update_fields=["current", "result", "updated_at"])


STUDENT_IMPORT_FIELDS = (
    "enrollment_number",
    "full_name",
    "email",
    "phone",
    "notes",
)


def read_tabular_upload(uploaded_file):
    """Return (headers, rows_as_dicts) from CSV or XLSX upload."""
    name = (getattr(uploaded_file, "name", "") or "").lower()
    raw = uploaded_file.read()
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    if name.endswith(".xlsx") or name.endswith(".xls"):
        from openpyxl import load_workbook

        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        sheet = wb.active
        rows_iter = sheet.iter_rows(values_only=True)
        try:
            header_row = next(rows_iter)
        except StopIteration:
            return [], []
        headers = [str(h).strip() if h is not None else "" for h in header_row]
        rows = []
        for values in rows_iter:
            if values is None or all(v is None or str(v).strip() == "" for v in values):
                continue
            row = {}
            for idx, header in enumerate(headers):
                if not header:
                    continue
                value = values[idx] if idx < len(values) else ""
                row[header] = "" if value is None else str(value).strip()
            rows.append(row)
        return [h for h in headers if h], rows

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("CSV must be UTF-8 encoded.") from exc
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return [], []
    headers = [h.strip() for h in reader.fieldnames if h and h.strip()]
    rows = []
    for row in reader:
        cleaned = {k.strip(): (v or "").strip() for k, v in row.items() if k}
        if any(cleaned.values()):
            rows.append(cleaned)
    return headers, rows


def preview_student_import(uploaded_file, limit=8):
    headers, rows = read_tabular_upload(uploaded_file)
    if not headers:
        raise ValueError("No header row found in the uploaded file.")
    suggested = {}
    lower_map = {h.lower().replace(" ", "_"): h for h in headers}
    aliases = {
        "enrollment_number": ["enrollment_number", "enrollment", "enr", "reg_no", "registration"],
        "full_name": ["full_name", "name", "student_name", "student"],
        "email": ["email", "email_address", "e_mail"],
        "phone": ["phone", "mobile", "phone_number"],
        "notes": ["notes", "note", "remarks"],
    }
    for field, keys in aliases.items():
        for key in keys:
            if key in lower_map:
                suggested[field] = lower_map[key]
                break
    return {
        "headers": headers,
        "suggested_mapping": suggested,
        "preview_rows": rows[:limit],
        "row_count": len(rows),
        "fields": list(STUDENT_IMPORT_FIELDS),
    }


def import_students_with_mapping(uploaded_file, mapping):
    """Import students using {field: source_header} mapping. Never overwrite duplicates."""
    headers, rows = read_tabular_upload(uploaded_file)
    mapping = {k: v for k, v in (mapping or {}).items() if v}
    for required in ("enrollment_number", "full_name", "email"):
        if required not in mapping:
            raise ValueError(f"Mapping must include {required}.")
        if mapping[required] not in headers:
            raise ValueError(f"Column '{mapping[required]}' not found in file.")

    created = 0
    skipped = []
    errors = []
    for index, row in enumerate(rows, start=2):
        enr = row.get(mapping["enrollment_number"], "").strip()
        name = row.get(mapping["full_name"], "").strip()
        email = row.get(mapping["email"], "").strip()
        phone = row.get(mapping.get("phone", ""), "").strip() if mapping.get("phone") else ""
        notes = row.get(mapping.get("notes", ""), "").strip() if mapping.get("notes") else ""
        if not enr or not name or not email:
            errors.append({"row": index, "error": "Missing required fields."})
            continue
        if CertificateStudent.objects.filter(
            Q(enrollment_number=enr) | Q(email__iexact=email)
        ).exists():
            skipped.append(
                {
                    "row": index,
                    "enrollment_number": enr,
                    "reason": "Duplicate enrollment number or email — not overwritten.",
                }
            )
            continue
        try:
            CertificateStudent.objects.create(
                enrollment_number=enr,
                full_name=name,
                email=email,
                phone=phone,
                notes=notes,
            )
            created += 1
        except IntegrityError as exc:
            errors.append({"row": index, "error": str(exc)})
    return {"created": created, "skipped": skipped, "errors": errors}


def build_report_rows(report_type):
    if report_type == "emails":
        return [
            [
                log.certificate.public_id,
                log.certificate.student.full_name,
                log.to_email,
                log.status,
                log.attempts,
                log.sent_at.isoformat() if log.sent_at else "",
                log.error_message,
            ]
            for log in CertificateEmailLog.objects.select_related(
                "certificate", "certificate__student"
            ).order_by("-created_at")
        ], [
            "certificate_id",
            "student_name",
            "to_email",
            "status",
            "attempts",
            "sent_at",
            "error",
        ]
    if report_type == "courses":
        rows = []
        for course in Course.objects.filter(is_active=True).annotate(
            certificate_count=Count(
                "certificates",
                filter=Q(certificates__status=Certificate.Status.ISSUED),
            ),
            enrollment_count=Count("certificate_enrollments"),
        ):
            rows.append(
                [
                    course.code,
                    course.title,
                    course.category,
                    course.enrollment_count,
                    course.certificate_count,
                ]
            )
        return rows, ["code", "title", "category", "enrollments", "issued_certificates"]

    # default: issued certificates
    return [
        [
            cert.public_id,
            cert.student.full_name,
            cert.student.enrollment_number,
            cert.course.title,
            cert.group.name if cert.group_id else "",
            cert.status,
            cert.issue_date.isoformat() if cert.issue_date else "",
            cert.grade,
        ]
        for cert in Certificate.objects.select_related("student", "course", "group").order_by(
            "-created_at"
        )
    ], [
        "certificate_id",
        "student_name",
        "enrollment_number",
        "course",
        "group",
        "status",
        "issue_date",
        "grade",
    ]


def export_report_file(report_type="issued", file_format="csv"):
    rows, headers = build_report_rows(report_type)
    if file_format == "xlsx":
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = report_type[:31]
        ws.append(headers)
        for row in rows:
            ws.append(row)
        buffer = io.BytesIO()
        wb.save(buffer)
        return buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{report_type}-report.xlsx"

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8"), "text/csv", f"{report_type}-report.csv"


def process_due_scheduled_emails(limit=50):
    """Send pending emails whose scheduled_for is due. Returns counts."""
    now = timezone.now()
    due = list(
        CertificateEmailLog.objects.filter(
            status=CertificateEmailLog.Status.PENDING,
            scheduled_for__isnull=False,
            scheduled_for__lte=now,
        ).select_related("certificate", "certificate__student")[:limit]
    )
    sent = 0
    failed = 0
    for log in due:
        try:
            _deliver_certificate_email_log(log)
            sent += 1
        except Exception as exc:  # noqa: BLE001
            log.status = CertificateEmailLog.Status.FAILED
            log.error_message = str(exc)
            log.save(update_fields=["status", "error_message", "updated_at"])
            failed += 1
    return {"processed": len(due), "sent": sent, "failed": failed}


def schedule_certificate_email(
    certificate, *, subject=None, body=None, scheduled_for=None, user=None, force=False
):
    if certificate.status != Certificate.Status.ISSUED:
        raise ValueError("Only issued certificates can be emailed.")
    if not certificate.student.email:
        raise ValueError("Student has no email address.")
    institute = get_institute()
    ctx = placeholder_context(certificate)
    subj = render_placeholder(subject or institute.default_email_subject, ctx)
    msg = render_placeholder(body or institute.default_email_body, ctx)
    if scheduled_for and scheduled_for > timezone.now():
        return CertificateEmailLog.objects.create(
            certificate=certificate,
            to_email=certificate.student.email,
            subject=subj,
            body=msg,
            status=CertificateEmailLog.Status.PENDING,
            scheduled_for=scheduled_for,
            created_by=user,
        )
    return send_certificate_email(
        certificate, subject=subj, body=msg, user=user, force=force
    )
