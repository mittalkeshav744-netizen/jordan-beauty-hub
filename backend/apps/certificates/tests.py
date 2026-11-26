from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.certificates.models import (
    Certificate,
    CertificateEnrollment,
    CertificateStudent,
    CertificateTemplate,
    StudentGroup,
)
from apps.certificates.services import (
    ensure_template_version,
    issue_certificate,
    next_certificate_public_id,
    revoke_certificate,
)
from apps.courses.models import Course

User = get_user_model()


class CertificateApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="certstaff@example.com",
            password="pass12345",
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            email="cust@example.com",
            password="pass12345",
        )
        self.course = Course.objects.create(
            title="Bridal Makeup Masterclass",
            slug="bridal-makeup-masterclass-test",
            code="BRD-T1",
            is_published=True,
            is_active=True,
        )
        self.template = CertificateTemplate.objects.create(
            name="Test Template",
            is_default=True,
            orientation="landscape",
        )
        self.version = ensure_template_version(self.template)
        self.student = CertificateStudent.objects.create(
            full_name="Asha Rao",
            email="asha@example.com",
            enrollment_number="ENR-001",
        )
        CertificateEnrollment.objects.create(
            student=self.student,
            course=self.course,
            status=CertificateEnrollment.Status.COMPLETED,
        )

    def test_staff_dashboard_and_customer_forbidden(self):
        self.client.force_authenticate(self.customer)
        denied = self.client.get("/api/certificates/dashboard/")
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.staff)
        ok = self.client.get("/api/certificates/dashboard/")
        self.assertEqual(ok.status_code, 200)
        self.assertIn("total_students", ok.data)

    def test_unique_public_ids(self):
        a = next_certificate_public_id()
        b = next_certificate_public_id()
        self.assertNotEqual(a, b)
        self.assertTrue(a.startswith("JBH-"))

    def test_issue_revoke_and_verify(self):
        cert = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            user=self.staff,
        )
        self.assertEqual(cert.status, Certificate.Status.ISSUED)
        self.assertTrue(cert.pdf.name.endswith(".pdf"))

        with self.assertRaises(ValueError):
            issue_certificate(
                student=self.student,
                course=self.course,
                template_version=self.version,
                user=self.staff,
            )

        verify = self.client.get(f"/api/certificates/verify/{cert.public_id}/")
        self.assertEqual(verify.status_code, 200)
        self.assertTrue(verify.data["valid"])
        self.assertEqual(verify.data["student_name"], "Asha Rao")
        self.assertEqual(verify.data["course_name"], self.course.title)
        self.assertEqual(verify.data["enrollment_number"], "ENR-001")
        self.assertIn("completion_date", verify.data)
        self.assertIn("grade", verify.data)
        self.assertIn("replaces", verify.data)
        self.assertIn("superseded_by", verify.data)
        self.assertNotIn("email", verify.data)
        self.assertNotIn("phone", verify.data)

        revoke_certificate(cert, user=self.staff, reason="Test revoke")
        verify2 = self.client.get(f"/api/certificates/verify/{cert.public_id}/")
        self.assertEqual(verify2.status_code, 200)
        self.assertFalse(verify2.data["valid"])
        self.assertEqual(verify2.data["status"], "revoked")

    def test_student_import_skips_duplicates(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(self.staff)
        csv_body = (
            "enrollment_number,full_name,email\n"
            "ENR-001,Asha Rao,asha@example.com\n"
            "ENR-002,Ravi Kumar,ravi@example.com\n"
        ).encode("utf-8")
        upload = SimpleUploadedFile("students.csv", csv_body, content_type="text/csv")
        response = self.client.post(
            "/api/certificates/students/import_csv/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(len(response.data["skipped"]), 1)

    def test_import_preview_and_mapped_import(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(self.staff)
        csv_body = (
            "Reg No,Student,Mail\n"
            "ENR-MAP-1,Mapped Student,mapped@example.com\n"
        ).encode("utf-8")
        upload = SimpleUploadedFile("custom.csv", csv_body, content_type="text/csv")
        preview = self.client.post(
            "/api/certificates/students/import_preview/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(preview.status_code, 200, preview.data)
        self.assertIn("Reg No", preview.data["headers"])

        upload2 = SimpleUploadedFile("custom.csv", csv_body, content_type="text/csv")
        imported = self.client.post(
            "/api/certificates/students/import_csv/",
            {
                "file": upload2,
                "mapping": (
                    '{"enrollment_number":"Reg No","full_name":"Student","email":"Mail"}'
                ),
            },
            format="multipart",
        )
        self.assertEqual(imported.status_code, 200, imported.data)
        self.assertEqual(imported.data["created"], 1)

    def test_reports_export_csv(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(
            "/api/certificates/reports/export/?type=issued&file_format=csv"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("certificate_id", response.content.decode("utf-8"))

    def test_group_membership_and_generate_job(self):
        self.client.force_authenticate(self.staff)
        group = StudentGroup.objects.create(name="Batch A", course=self.course)
        add = self.client.post(
            f"/api/certificates/groups/{group.id}/members/",
            {"student_ids": [self.student.id]},
            format="json",
        )
        self.assertEqual(add.status_code, 201)

        job = self.client.post(
            "/api/certificates/issued/generate/",
            {
                "course_id": self.course.id,
                "template_id": self.template.id,
                "student_ids": [self.student.id],
                "group_id": group.id,
                # JSON dates arrive as strings — must not crash ID allocation.
                "completion_date": "2026-11-20",
                "issue_date": "2026-11-20",
                "send_email": False,
            },
            format="json",
        )
        self.assertEqual(job.status_code, 202)
        # Allow background thread to finish
        import time

        for _ in range(30):
            if Certificate.objects.filter(student=self.student, course=self.course).exists():
                break
            time.sleep(0.1)
        self.assertTrue(
            Certificate.objects.filter(
                student=self.student, course=self.course, status=Certificate.Status.ISSUED
            ).exists()
        )


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class CertificateEmailTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="mailstaff@example.com",
            password="pass12345",
            is_staff=True,
        )
        self.course = Course.objects.create(
            title="Skin Care Essentials",
            slug="skin-care-essentials-mail",
            is_published=True,
        )
        self.template = CertificateTemplate.objects.create(name="Mail Template")
        self.version = ensure_template_version(self.template)
        self.student = CertificateStudent.objects.create(
            full_name="Neha",
            email="neha@example.com",
            enrollment_number="ENR-MAIL-1",
        )

    def test_send_email_attaches_pdf(self):
        from django.core import mail

        from apps.certificates.services import send_certificate_email

        cert = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            user=self.staff,
        )
        send_certificate_email(cert, user=self.staff)
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(mail.outbox[0].attachments)


class DesignerPdfAndVerifyTests(TestCase):
    @classmethod
    def setUpClass(cls):
        import tempfile
        from pathlib import Path

        super().setUpClass()
        cls._media_tmpdir = tempfile.TemporaryDirectory()
        cls._media_root = Path(cls._media_tmpdir.name)

    @classmethod
    def tearDownClass(cls):
        cls._media_tmpdir.cleanup()
        super().tearDownClass()

    def setUp(self):
        self._media_override = override_settings(MEDIA_ROOT=str(self._media_root))
        self._media_override.enable()
        self.addCleanup(self._media_override.disable)

        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="designer@example.com",
            password="pass12345",
            is_staff=True,
        )
        self.course = Course.objects.create(
            title="Nail Art Pro",
            slug="nail-art-pro-test",
            code="NAP-T1",
            duration_text="6 weeks",
            is_published=True,
            is_active=True,
        )
        self.template = CertificateTemplate.objects.create(
            name="Designer Template",
            orientation="landscape",
        )
        self.version = ensure_template_version(self.template)
        self.student = CertificateStudent.objects.create(
            full_name="Meera Shah",
            email="meera@example.com",
            enrollment_number="ENR-DSN-1",
        )

    def test_pdf_honors_color_image_and_qr_layout(self):
        import io

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        from apps.certificates.services import generate_certificate_pdf_bytes

        asset_dir = self._media_root / "certificates" / "template_assets"
        asset_dir.mkdir(parents=True, exist_ok=True)
        img = Image.new("RGB", (40, 40), color=(200, 40, 80))
        img.save(asset_dir / "sig.png", format="PNG")

        self.version.layout_json = {
            "elements": [
                {
                    "id": "t1",
                    "type": "text",
                    "text": "Appreciation",
                    "x": 50,
                    "y": 20,
                    "fontSize": 24,
                    "fontWeight": "bold",
                    "fontFamily": "times",
                    "align": "center",
                    "color": "#c42850",
                    "zIndex": 1,
                },
                {
                    "id": "img1",
                    "type": "image",
                    "src": "certificates/template_assets/sig.png",
                    "x": 50,
                    "y": 70,
                    "width": 12,
                    "zIndex": 2,
                },
                {
                    "id": "qr1",
                    "type": "qr",
                    "x": 88,
                    "y": 82,
                    "width": 10,
                    "zIndex": 3,
                },
            ]
        }
        self.version.save(update_fields=["layout_json"])

        cert = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            user=self.staff,
            grade="A",
        )
        pdf_bytes = generate_certificate_pdf_bytes(cert)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 500)

        self.client.force_authenticate(self.staff)
        buf = io.BytesIO()
        Image.new("RGB", (16, 16), color=(10, 20, 30)).save(buf, format="PNG")
        upload = SimpleUploadedFile("overlay.png", buf.getvalue(), content_type="image/png")
        response = self.client.post(
            f"/api/certificates/templates/{self.template.id}/upload_asset/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("path", response.data)
        self.assertTrue(response.data["path"].startswith("certificates/template_assets/"))

    def test_pdf_draws_cover_rect_elements(self):
        from apps.certificates.services import generate_certificate_pdf_bytes

        self.version.layout_json = {
            "elements": [
                {
                    "id": "cover1",
                    "type": "cover",
                    "x": 50,
                    "y": 40,
                    "width": 40,
                    "height": 12,
                    "fill": "#ffffff",
                    "zIndex": 1,
                },
                {
                    "id": "t1",
                    "type": "text",
                    "text": "Covered area",
                    "x": 50,
                    "y": 40,
                    "fontSize": 18,
                    "fontFamily": "cormorant",
                    "align": "center",
                    "color": "#1a2744",
                    "zIndex": 2,
                },
            ]
        }
        self.version.save(update_fields=["layout_json"])
        cert = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            user=self.staff,
        )
        pdf_bytes = generate_certificate_pdf_bytes(cert)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 400)

    def test_verify_reissue_chain_fields(self):
        first = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            user=self.staff,
        )
        second = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            user=self.staff,
            force_reissue=True,
        )
        first.refresh_from_db()
        self.assertEqual(first.status, Certificate.Status.REISSUED)
        self.assertEqual(second.replaces_id, first.id)

        old = self.client.get(f"/api/certificates/verify/{first.public_id}/")
        self.assertEqual(old.status_code, 200)
        self.assertFalse(old.data["valid"])
        self.assertEqual(old.data["status"], "reissued")
        self.assertEqual(old.data["superseded_by"], second.public_id)
        self.assertEqual(old.data["duration"], "6 weeks")

        new = self.client.get(f"/api/certificates/verify/{second.public_id}/")
        self.assertEqual(new.status_code, 200)
        self.assertTrue(new.data["valid"])
        self.assertEqual(new.data["replaces"], first.public_id)


class ShopEnrollmentSyncApiTests(TestCase):
    def setUp(self):
        from apps.courses.models import CourseEnrollment
        from apps.test_factories import make_user

        self.client = APIClient()
        self.staff = make_user(email="syncstaff@example.com", is_staff=True)
        self.buyer = make_user(email="buyer@example.com", first_name="Riya")
        self.course = Course.objects.create(
            title="Shop Sync Course",
            slug="shop-sync-course",
            is_published=True,
            is_active=True,
        )
        CourseEnrollment.objects.create(
            user=self.buyer,
            course=self.course,
            status=CourseEnrollment.Status.ACTIVE,
        )

    def test_staff_can_sync_existing_shop_enrollments(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post("/api/certificates/students/sync-from-shop/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["linked_enrollments"], 1)
        student = CertificateStudent.objects.get(user=self.buyer)
        self.assertTrue(
            CertificateEnrollment.objects.filter(student=student, course=self.course).exists()
        )


class CertificatePrintBundleTests(TestCase):
    def setUp(self):
        from apps.test_factories import make_user

        self.client = APIClient()
        self.staff = make_user(email="printstaff@example.com", is_staff=True)
        self.customer = make_user(email="printcust@example.com", is_staff=False)
        self.course = Course.objects.create(
            title="Bundle Print Course",
            slug="bundle-print-course",
            is_published=True,
            is_active=True,
        )
        self.template = CertificateTemplate.objects.create(name="Print Template", is_default=True)
        self.version = ensure_template_version(self.template)
        self.student1 = CertificateStudent.objects.create(
            full_name="Meera Patel",
            email="meera@example.com",
            enrollment_number="ENR-PRT-1",
        )
        self.student2 = CertificateStudent.objects.create(
            full_name="Kavya Sharma",
            email="kavya@example.com",
            enrollment_number="ENR-PRT-2",
        )

    def test_staff_can_merge_certificates_into_print_bundle(self):
        import io
        from pypdf import PdfReader

        c1 = issue_certificate(
            student=self.student1,
            course=self.course,
            template_version=self.version,
            user=self.staff,
        )
        c2 = issue_certificate(
            student=self.student2,
            course=self.course,
            template_version=self.version,
            user=self.staff,
        )

        self.client.force_authenticate(self.customer)
        forbidden = self.client.post(
            "/api/certificates/issued/print-bundle/",
            {"certificate_ids": [c1.id, c2.id]},
            format="json",
        )
        self.assertEqual(forbidden.status_code, 403)

        self.client.force_authenticate(self.staff)
        empty = self.client.post("/api/certificates/issued/print-bundle/", {}, format="json")
        self.assertEqual(empty.status_code, 400)

        resp = self.client.post(
            "/api/certificates/issued/print-bundle/",
            {"certificate_ids": [c1.id, c2.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "application/pdf")
        reader = PdfReader(io.BytesIO(resp.content))
        self.assertEqual(len(reader.pages), 2)

        by_public = self.client.post(
            "/api/certificates/issued/print-bundle/",
            {"public_ids": [c2.public_id]},
            format="json",
        )
        self.assertEqual(by_public.status_code, 200)
        self.assertEqual(len(PdfReader(io.BytesIO(by_public.content)).pages), 1)


class CertificateFieldApiTests(TestCase):
    def setUp(self):
        from apps.test_factories import make_user

        self.client = APIClient()
        self.staff = make_user(email="fieldstaff@example.com", is_staff=True)
        self.customer = make_user(email="fieldcust@example.com", is_staff=False)
        self.course = Course.objects.create(
            title="Custom Field Course",
            slug="custom-field-course",
            is_published=True,
            is_active=True,
        )
        self.template = CertificateTemplate.objects.create(name="Field Template", is_default=True)
        self.version = ensure_template_version(self.template)
        self.student = CertificateStudent.objects.create(
            full_name="Zoya Khan",
            email="zoya@example.com",
            enrollment_number="ENR-FLD-1",
        )

    def test_staff_crud_fields_and_placeholder_context(self):
        from apps.certificates.services import placeholder_context

        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/certificates/fields/").status_code, 403)

        self.client.force_authenticate(self.staff)
        listed = self.client.get("/api/certificates/fields/")
        self.assertEqual(listed.status_code, 200)
        keys = [item["key"] for item in listed.data]
        self.assertIn("student_name", keys)

        created = self.client.post(
            "/api/certificates/fields/",
            {
                "label": "Instructor Name",
                "key": "Instructor Name",
                "source": "custom",
                "default_value": "Meera Kapoor",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["key"], "instructor_name")
        field_id = created.data["id"]

        cert = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            custom_data={"instructor_name": "Riya Verma"},
            user=self.staff,
        )
        ctx = placeholder_context(cert)
        self.assertEqual(ctx["instructor_name"], "Riya Verma")

        updated = self.client.patch(
            f"/api/certificates/fields/{field_id}/",
            {"default_value": "Asha Nair"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)

        cert2 = issue_certificate(
            student=self.student,
            course=self.course,
            template_version=self.version,
            force_reissue=True,
            user=self.staff,
        )
        self.assertEqual(placeholder_context(cert2)["instructor_name"], "Asha Nair")

        deleted = self.client.delete(f"/api/certificates/fields/{field_id}/")
        self.assertEqual(deleted.status_code, 204)

        restored = self.client.post("/api/certificates/fields/restore-defaults/")
        self.assertEqual(restored.status_code, 200)
        self.assertTrue(any(item["key"] == "student_name" for item in restored.data))
