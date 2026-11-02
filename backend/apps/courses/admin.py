from django.contrib import admin

from .models import Course, CourseEnrollment, CourseLesson, CourseModule


class CourseLessonInline(admin.TabularInline):
    model = CourseLesson
    extra = 0


class CourseModuleInline(admin.TabularInline):
    model = CourseModule
    extra = 0
    show_change_link = True


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "price", "is_published", "is_active", "sort_order")
    list_filter = ("is_published", "is_active")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "slug")
    inlines = [CourseModuleInline]


@admin.register(CourseModule)
class CourseModuleAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "sort_order")
    inlines = [CourseLessonInline]


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "status", "amount_paid", "created_at")
    list_filter = ("status",)
    search_fields = ("user__email", "course__title")
