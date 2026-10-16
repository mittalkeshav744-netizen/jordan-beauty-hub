"""Serve the React production build from frontend/dist/.

After `npm run build` in the frontend folder, Django can host the shop on the same
origin as the API (e.g. http://127.0.0.1:8000/). Development with Vite on :5173 is
unchanged.
"""

from pathlib import Path

from django.conf import settings
from django.http import Http404, HttpResponse
from django.views.static import serve as static_serve


def _dist_root():
    return Path(settings.FRONTEND_DIST).resolve()


def serve_frontend(request, path=""):
    """Serve a file from the build, or index.html for React Router paths."""
    dist = _dist_root()
    if not dist.is_dir():
        return HttpResponse(
            "Frontend is not built yet.\n"
            "From the frontend folder run: npm run build\n"
            "Then open this address again (or keep using the Vite server on port 5173).",
            status=503,
            content_type="text/plain; charset=utf-8",
        )

    relative = path.lstrip("/")
    if relative:
        candidate = (dist / relative).resolve()
        try:
            candidate.relative_to(dist)
        except ValueError as error:
            raise Http404 from error
        if candidate.is_file():
            return static_serve(request, relative, document_root=dist)

    index = dist / "index.html"
    if not index.is_file():
        raise Http404("frontend/dist/index.html is missing. Run npm run build again.")
    return static_serve(request, "index.html", document_root=dist)
