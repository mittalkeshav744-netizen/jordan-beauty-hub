from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.test_factories import make_user

from .models import Course, CourseEnrollment, CourseLesson, CourseModule
from .services import enroll_user, replace_curriculum


def make_course(**extra):
    data = {
        "title": "Bridal Makeup Foundations",
        "slug": "bridal-makeup-foundations",
        "short_description": "Learn bridal looks step by step.",
        "description": "Full curriculum.",
        "price": Decimal("999.00"),
        "is_published": True,
        "is_active": True,
    }
    data.update(extra)
    return Course.objects.create(**data)


class CoursePublicApiTests(APITestCase):
    def setUp(self):
        self.course = make_course()
        replace_curriculum(
            self.course,
            [
                {
                    "title": "Getting started",
                    "lessons": [
                        {
                            "title": "Welcome",
                            "lesson_type": "text",
                            "body": "Hello learners.",
                        },
                        {
                            "title": "Watch demo",
                            "lesson_type": "video",
                            "video_url": "https://example.com/video.mp4",
                        },
                        {
                            "title": "Reference sheet",
                            "lesson_type": "link",
                            "external_url": "https://example.com/sheet",
                        },
                    ],
                }
            ],
        )
        self.user = make_user()

    def test_list_shows_published_only(self):
        make_course(title="Draft", slug="draft-course", is_published=False)
        response = self.client.get("/api/courses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [row["slug"] for row in response.data]
        self.assertIn(self.course.slug, slugs)
        self.assertNotIn("draft-course", slugs)

    def test_detail_hides_media_until_enrolled(self):
        response = self.client.get(f"/api/courses/{self.course.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["enrolled"])
        lesson = response.data["modules"][0]["lessons"][0]
        self.assertNotIn("body", lesson)
        self.assertNotIn("video_url", lesson)

    def test_enroll_is_separate_from_cart(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f"/api/courses/{self.course.slug}/enroll/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["course"]["enrolled"])
        lesson = response.data["course"]["modules"][0]["lessons"][1]
        self.assertEqual(lesson["video_url"], "https://example.com/video.mp4")
        self.assertTrue(
            CourseEnrollment.objects.filter(
                user=self.user, course=self.course, status=CourseEnrollment.Status.ACTIVE
            ).exists()
        )
        # Cart remains untouched — enrollment is not a cart line
        cart = self.client.get("/api/cart/")
        self.assertEqual(cart.status_code, status.HTTP_200_OK)
        self.assertEqual(cart.data.get("items"), [])
        self.assertEqual(cart.data.get("item_count"), 0)

    def test_mine_lists_enrollments(self):
        enroll_user(self.user, self.course)
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/courses/mine/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course"]["slug"], self.course.slug)


class PortalCourseApiTests(APITestCase):
    def setUp(self):
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.client.force_authenticate(self.staff)

    def test_owner_can_create_and_edit_curriculum(self):
        create = self.client.post(
            "/api/portal/courses/",
            {
                "title": "Skin Prep Masterclass",
                "short_description": "Prep like a pro",
                "price": "499.00",
                "is_published": True,
                "modules": [
                    {
                        "title": "Module 1",
                        "lessons": [
                            {"title": "Intro", "lesson_type": "text", "body": "Start here"},
                            {
                                "title": "Demo clip",
                                "lesson_type": "video",
                                "video_url": "https://example.com/a.mp4",
                            },
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED, create.data)
        course_id = create.data["id"]
        self.assertEqual(create.data["module_count"], 1)
        self.assertEqual(create.data["lesson_count"], 2)

        patch = self.client.patch(
            f"/api/portal/courses/{course_id}/",
            {
                "title": "Skin Prep Masterclass Updated",
                "modules": [
                    {
                        "title": "Only module",
                        "lessons": [
                            {
                                "title": "PDF pack",
                                "lesson_type": "file",
                                "body": "Download after enroll",
                            },
                            {
                                "title": "External lab",
                                "lesson_type": "link",
                                "external_url": "https://example.com/lab",
                            },
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK, patch.data)
        self.assertEqual(patch.data["title"], "Skin Prep Masterclass Updated")
        self.assertEqual(len(patch.data["modules"][0]["lessons"]), 2)
        self.assertEqual(CourseModule.objects.filter(course_id=course_id).count(), 1)
        self.assertEqual(CourseLesson.objects.filter(module__course_id=course_id).count(), 2)
