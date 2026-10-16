from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path

from config.spa import serve_frontend

admin.site.site_header = "Jordan Beauty Hub administration"
admin.site.site_title = "Jordan Beauty Hub admin"
admin.site.index_title = "Store management"


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/catalog/", include("apps.catalog.urls")),
    path("api/cart/", include("apps.cart.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/wishlist/", include("apps.wishlist.urls")),
    path("api/store/", include("apps.store.urls")),
    path("api/looks/", include("apps.looks.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Keep last: React build from frontend/dist/ (after `npm run build`). API/admin/media win.
urlpatterns += [
    re_path(r"^(?P<path>.*)$", serve_frontend),
]
