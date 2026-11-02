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


# Missing hashed assets must 404 — never return index.html (that blanks lazy routes).
_STATIC_SUFFIXES = {
    ".js",
    ".css",
    ".map",
    ".json",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".txt",
    ".webmanifest",
}


def _with_asset_cache(response):
    """Hashed build files can be cached hard; HTML must not (or iframe previews go blank after rebuild)."""
    response["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


def _with_html_no_cache(response):
    response["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response


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
            response = static_serve(request, relative, document_root=dist)
            if Path(relative).suffix.lower() in _STATIC_SUFFIXES or relative.startswith("assets/"):
                return _with_asset_cache(response)
            if candidate.name == "index.html":
                return _with_html_no_cache(response)
            return response
        # Stale chunk after rebuild (e.g. /assets/ReviewsPage-oldhash.js).
        if Path(relative).suffix.lower() in _STATIC_SUFFIXES or relative.startswith("assets/"):
            raise Http404(f"Missing frontend file: {relative}")

    index = dist / "index.html"
    if not index.is_file():
        raise Http404("frontend/dist/index.html is missing. Run npm run build again.")
    return _with_html_no_cache(static_serve(request, "index.html", document_root=dist))
