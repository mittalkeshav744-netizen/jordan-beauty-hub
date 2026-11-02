from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import services
from .serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    EnrollmentSerializer,
)


class IsAuthenticatedOrReadOnly(permissions.IsAuthenticatedOrReadOnly):
    pass


class CourseViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    GET  /api/courses/              published courses
    GET  /api/courses/{slug}/       course detail (media gated by enrollment)
    POST /api/courses/{slug}/enroll/  enroll current user (auth)
    GET  /api/courses/mine/         my active enrollments (auth)
    """

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        return services.published_courses_queryset()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CourseDetailSerializer
        return CourseListSerializer

    def retrieve(self, request, *args, **kwargs):
        course = services.course_with_curriculum(kwargs["slug"])
        if not course.is_published or not course.is_active:
            if not (request.user.is_authenticated and request.user.is_staff):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        enrolled = services.user_has_active_enrollment(request.user, course)
        context = {"request": request, "enrolled": enrolled}
        return Response(CourseDetailSerializer(course, context=context).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, slug=None):
        course = services.course_with_curriculum(slug)
        enrollment = services.enroll_user(request.user, course)
        enrolled_course = services.course_with_curriculum(course.slug)
        context = {"request": request, "enrolled": True}
        return Response(
            {
                "enrollment": EnrollmentSerializer(
                    enrollment, context={"request": request}
                ).data,
                "course": CourseDetailSerializer(enrolled_course, context=context).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        qs = services.my_enrollments_queryset(request.user).prefetch_related(
            "course__modules__lessons"
        )
        data = []
        for enrollment in qs:
            row = EnrollmentSerializer(enrollment, context={"request": request}).data
            course = enrollment.course
            course_data = CourseListSerializer(course, context={"request": request}).data
            course_data["module_count"] = course.modules.count()
            course_data["lesson_count"] = sum(m.lessons.count() for m in course.modules.all())
            course_data["enrolled"] = True
            row["course"] = course_data
            data.append(row)
        return Response(data)
