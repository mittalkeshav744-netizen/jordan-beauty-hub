from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 48


class CertificatePagination(PageNumberPagination):
    """Staff certificate portal may load larger pickers (courses, students, templates)."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 500
