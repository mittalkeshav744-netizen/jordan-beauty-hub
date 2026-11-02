from rest_framework import serializers

from .models import Course, CourseEnrollment, CourseLesson, CourseModule
from .services import user_has_active_enrollment


class PublicLessonSerializer(serializers.ModelSerializer):
    """Lesson payload for enrolled learners (full media)."""

    class Meta:
        model = CourseLesson
        fields = [
            "id",
            "title",
            "lesson_type",
            "body",
            "video_url",
            "video_file",
            "attachment",
            "external_url",
            "duration_minutes",
            "sort_order",
        ]


class PublicLessonTeaserSerializer(serializers.ModelSerializer):
    """Lesson titles only — no media until enrolled."""

    class Meta:
        model = CourseLesson
        fields = ["id", "title", "lesson_type", "duration_minutes", "sort_order"]


class PublicModuleSerializer(serializers.ModelSerializer):
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = CourseModule
        fields = ["id", "title", "sort_order", "lessons"]

    def get_lessons(self, obj):
        enrolled = self.context.get("enrolled", False)
        ser = PublicLessonSerializer if enrolled else PublicLessonTeaserSerializer
        return ser(obj.lessons.all(), many=True, context=self.context).data


class CourseListSerializer(serializers.ModelSerializer):
    module_count = serializers.IntegerField(read_only=True, default=0)
    lesson_count = serializers.IntegerField(read_only=True, default=0)
    enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "cover_image",
            "price",
            "module_count",
            "lesson_count",
            "enrolled",
            "sort_order",
        ]

    def get_enrolled(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return user_has_active_enrollment(user, obj)


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()
    enrolled = serializers.SerializerMethodField()
    module_count = serializers.SerializerMethodField()
    lesson_count = serializers.SerializerMethodField()

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
            "enrolled",
            "module_count",
            "lesson_count",
            "modules",
        ]

    def get_enrolled(self, obj):
        return bool(self.context.get("enrolled", False))

    def get_modules(self, obj):
        return PublicModuleSerializer(
            obj.modules.all(), many=True, context=self.context
        ).data

    def get_module_count(self, obj):
        return obj.modules.count()

    def get_lesson_count(self, obj):
        return CourseLesson.objects.filter(module__course=obj).count()


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = ["id", "status", "amount_paid", "created_at", "course"]


class PortalLessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseLesson
        fields = [
            "id",
            "title",
            "lesson_type",
            "body",
            "video_url",
            "video_file",
            "attachment",
            "external_url",
            "duration_minutes",
            "sort_order",
        ]


class PortalModuleSerializer(serializers.ModelSerializer):
    lessons = PortalLessonSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = ["id", "title", "sort_order", "lessons"]


class PortalCourseSerializer(serializers.ModelSerializer):
    modules = PortalModuleSerializer(many=True, read_only=True)
    module_count = serializers.IntegerField(read_only=True, default=0)
    lesson_count = serializers.IntegerField(read_only=True, default=0)
    enrollment_count = serializers.IntegerField(read_only=True, default=0)

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
            "module_count",
            "lesson_count",
            "enrollment_count",
            "modules",
            "created_at",
            "updated_at",
        ]


class PortalCourseWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=160)
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)
    short_description = serializers.CharField(max_length=280, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    is_published = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    sort_order = serializers.IntegerField(required=False, min_value=0)
    modules = serializers.ListField(child=serializers.DictField(), required=False)
