from django.contrib import admin

from . import models


@admin.register(models.InstituteSettings)
class InstituteSettingsAdmin(admin.ModelAdmin):
    list_display = ("institute_name", "certificate_id_prefix", "updated_at")


@admin.register(models.CertificateStudent)
class CertificateStudentAdmin(admin.ModelAdmin):
    list_display = ("enrollment_number", "full_name", "email", "is_active")
    search_fields = ("enrollment_number", "full_name", "email")


@admin.register(models.Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("public_id", "student", "course", "status", "issue_date")
    list_filter = ("status",)
    search_fields = ("public_id", "student__full_name", "student__enrollment_number")


admin.site.register(models.CertificateTemplate)
admin.site.register(models.StudentGroup)
admin.site.register(models.CertificateEnrollment)
admin.site.register(models.CertificateEmailLog)
admin.site.register(models.EmailTemplate)
admin.site.register(models.CertificateJob)
