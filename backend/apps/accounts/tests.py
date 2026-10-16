import re

from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import Address
from apps.test_factories import DEFAULT_PASSWORD, make_address, make_user


class AuthenticationTests(APITestCase):
    def test_register_creates_user_and_logs_in(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "New@Example.com",
                "first_name": "Asha",
                "last_name": "Rao",
                "password": DEFAULT_PASSWORD,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "new@example.com")
        self.assertNotIn("password", response.data)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_200_OK)

    def test_register_without_last_name(self):
        response = self.client.post(
            "/api/auth/register/",
            {"email": "solo@example.com", "first_name": "Asha", "password": DEFAULT_PASSWORD},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["last_name"], "")

    def test_register_rejects_duplicate_email_and_weak_password(self):
        make_user(email="taken@example.com")
        response = self.client.post(
            "/api/auth/register/",
            {"email": "taken@example.com", "first_name": "A", "last_name": "B", "password": "123"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["errors"])
        self.assertTrue(response.data["detail"])

    def test_login_with_wrong_password_fails(self):
        make_user(email="asha@example.com")
        response = self.client.post(
            "/api/auth/login/", {"email": "asha@example.com", "password": "wrong-password"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Incorrect email or password.")

    def test_login_and_logout(self):
        make_user(email="asha@example.com")
        response = self.client.post(
            "/api/auth/login/", {"email": "ASHA@example.com", "password": DEFAULT_PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    def test_me_requires_authentication(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    def test_session_reports_signed_out_and_signed_in_user(self):
        response = self.client.get("/api/auth/session/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["user"])

        user = make_user(email="asha@example.com")
        self.client.force_authenticate(user)
        response = self.client.get("/api/auth/session/")
        self.assertEqual(response.data["user"]["email"], "asha@example.com")
        self.assertNotIn("password", response.data["user"])

    def test_login_enforces_csrf_for_browser_clients(self):
        make_user(email="asha@example.com")
        client = APIClient(enforce_csrf_checks=True)
        response = client.post(
            "/api/auth/login/", {"email": "asha@example.com", "password": DEFAULT_PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_change_own_staff_flag(self):
        user = make_user()
        self.client.force_authenticate(user)
        self.client.patch("/api/auth/me/", {"is_staff": True, "first_name": "Riya"})
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.assertEqual(user.first_name, "Riya")


@override_settings(FRONTEND_URL="https://shop.example.com")
class PasswordResetTests(APITestCase):
    def request_reset(self, email):
        return self.client.post("/api/auth/password-reset/", {"email": email})

    def reset_link_parts(self):
        match = re.search(r"https://shop\.example\.com/reset-password/([^/\s]+)/([^/\s]+)", mail.outbox[-1].body)
        return match.group(1), match.group(2)

    def confirm(self, uid, token, new_password="An0ther-strong-phrase!"):
        return self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": new_password},
        )

    def test_unknown_email_gets_the_same_reply_and_no_email(self):
        make_user(email="asha@example.com")
        known = self.request_reset("ASHA@example.com")
        unknown = self.request_reset("nobody@example.com")
        self.assertEqual(known.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data["detail"], unknown.data["detail"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["asha@example.com"])

    def test_reset_link_changes_password_once(self):
        user = make_user(email="asha@example.com")
        self.request_reset("asha@example.com")
        uid, token = self.reset_link_parts()

        self.assertEqual(self.confirm(uid, token).status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("An0ther-strong-phrase!"))
        self.assertEqual(self.confirm(uid, token, "Third-str0ng-phrase!").status_code, 400)

    def test_rejects_bad_token_and_weak_password(self):
        user = make_user(email="asha@example.com")
        self.request_reset("asha@example.com")
        uid, token = self.reset_link_parts()

        self.assertEqual(self.confirm(uid, "wrong-token").status_code, 400)
        self.assertEqual(self.confirm("bm90LWEtdXNlcg", token).status_code, 400)
        weak = self.confirm(uid, token, "12345678")
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", weak.data["errors"])
        user.refresh_from_db()
        self.assertTrue(user.check_password(DEFAULT_PASSWORD))


class AddressTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(self.user)

    def address_payload(self, **extra):
        payload = {
            "full_name": "Asha Rao",
            "phone": "98765 43210",
            "line1": "12 MG Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
        }
        payload.update(extra)
        return payload

    def test_first_address_becomes_default(self):
        response = self.client.post("/api/auth/addresses/", self.address_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_default"])
        self.assertEqual(response.data["phone"], "9876543210")

    def test_new_default_address_replaces_old_default(self):
        first = make_address(self.user)
        self.client.post("/api/auth/addresses/", self.address_payload(is_default=True))
        first.refresh_from_db()
        self.assertFalse(first.is_default)
        self.assertEqual(Address.objects.filter(user=self.user, is_default=True).count(), 1)

    def test_invalid_pin_code_rejected(self):
        response = self.client.post("/api/auth/addresses/", self.address_payload(postal_code="12"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("postal_code", response.data["errors"])

    def test_cannot_access_another_users_address(self):
        other_address = make_address(make_user())
        response = self.client.get(f"/api/auth/addresses/{other_address.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        response = self.client.delete(f"/api/auth/addresses/{other_address.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
