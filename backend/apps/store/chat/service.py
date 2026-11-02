"""Orchestrate Mira replies: guest gate, policy FAQs, Gemini (+ tools), product cards."""

from __future__ import annotations

import re

from django.conf import settings

from .cards import (
    page_context_block,
    polish_reply,
    product_cards,
    product_paths_from_text,
    suggested_replies,
    whatsapp_chat_url,
)
from .exceptions import ChatNotConfigured, ChatProviderError
from .gemini import generate_reply, prepare_then_stream
from .prompts import (
    GUEST_PRODUCT_REPLY,
    GUEST_RULES,
    MEMBER_RULES,
    POLICY_ACCOUNT,
    POLICY_CANCEL,
    POLICY_COD,
    POLICY_DELIVERY,
    POLICY_RETURNS,
    STORE_FACTS,
)

MAX_HISTORY_TURNS = 6

_PRODUCT_INTENT = re.compile(
    r"("
    r"product|products|makeup|make-up|skincare|skin\s*care|suggest|suggestion|recommend|"
    r"routine|serum|lipstick|foundation|blush|kajal|mascara|moisturi[sz]er|cream|toner|"
    r"sunscreen|glow|shade|buy|shopping|catalogue|catalog|best\s+for|gift|"
    r"mughe|mujhe|chaiye|chahiye|"
    r"brown\s+skin|indian\s+skin|dry\s+skin|oily\s+skin|acne|routine|look"
    r")",
    re.IGNORECASE,
)

_POLICY_ONLY = re.compile(
    r"("
    r"\bcod\b|cash\s+on\s+delivery|payment|pay|deliver|shipping|return|refund|cancel|"
    r"order\s+status|track|whatsapp|account|login|register|sign\s*in|sign\s*up|policy|"
    r"pin\s*code|free\s+shipping"
    r")",
    re.IGNORECASE,
)

# Clear FAQ patterns → instant local reply (no Gemini). Order matters (first match wins).
_POLICY_FAQ_RULES = (
    (
        re.compile(
            r"\bcod\b|cash\s+on\s+delivery|how\s+(do|can)\s+i\s+pay|payment\s+method|"
            r"upi|debit\s+card|credit\s+card|online\s+payment|only\s+cash",
            re.IGNORECASE,
        ),
        POLICY_COD,
    ),
    (
        re.compile(
            r"deliver|shipping|ship\s+to|free\s+shipping|pin\s*code|across\s+india|"
            r"how\s+long.*(?:order|deliver)|courier",
            re.IGNORECASE,
        ),
        POLICY_DELIVERY,
    ),
    (
        re.compile(
            r"return|refund|replac|damaged|wrong\s+item|missing\s+item|exchange",
            re.IGNORECASE,
        ),
        POLICY_RETURNS,
    ),
    (
        re.compile(
            r"\bcancel\b|cancellation|cancel\s+(my\s+)?order",
            re.IGNORECASE,
        ),
        POLICY_CANCEL,
    ),
    (
        re.compile(
            r"create\s+(an\s+)?account|how\s+(do|can)\s+i\s+(sign\s*in|sign\s*up|register|log\s*in)|"
            r"sign\s*up|register|need\s+(an\s+)?account",
            re.IGNORECASE,
        ),
        POLICY_ACCOUNT,
    ),
)


def chat_is_configured():
    return bool(settings.GOOGLE_GEMINI_API_KEY)


def wants_product_advice(message: str) -> bool:
    text = (message or "").strip()
    if not text:
        return False
    if _PRODUCT_INTENT.search(text):
        if _POLICY_ONLY.search(text) and not re.search(
            r"makeup|skincare|serum|lipstick|foundation|blush|kajal|suggest|recommend|"
            r"routine|brown|glow|gift|look",
            text,
            re.IGNORECASE,
        ):
            return False
        return True
    return False


def policy_faq_reply(message: str) -> str | None:
    """
    Instant store-policy answers without calling Gemini.
    Skips when the customer is clearly asking for product advice.
    """
    text = (message or "").strip()
    if not text or wants_product_advice(text):
        return None
    for pattern, reply in _POLICY_FAQ_RULES:
        if pattern.search(text):
            return reply
    return None


def _trim_history(history):
    history = history or []
    if len(history) <= MAX_HISTORY_TURNS:
        return history
    return history[-MAX_HISTORY_TURNS:]


def _system_instruction(is_authenticated: bool, page_path: str = ""):
    whatsapp = settings.STORE_WHATSAPP_NUMBER
    contact = (
        f"WhatsApp on file: +{whatsapp}. Invite the chat header WhatsApp link for a human."
        if whatsapp
        else "No WhatsApp number is configured; point customers to the footer or My orders."
    )
    page_block = page_context_block(page_path, is_authenticated)
    if is_authenticated:
        return f"{MEMBER_RULES}\n\n{STORE_FACTS}\n\n{contact}\n\n{page_block}"
    return f"{GUEST_RULES}\n\n{STORE_FACTS}\n\n{contact}\n\n{page_block}"


def _gemini_contents(message, history):
    contents = []
    for turn in _trim_history(history):
        role = "user" if turn["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def _build_response(
    *,
    reply,
    requires_auth,
    product_paths=None,
    is_authenticated=False,
    page_path="",
    request=None,
    extra_slugs=None,
):
    paths = product_paths or []
    raw_reply = reply or ""
    products = (
        product_cards(paths, raw_reply, request=request, extra_slugs=extra_slugs)
        if is_authenticated and not requires_auth
        else []
    )
    if requires_auth:
        products = []
        paths = ["/register", "/login"]
        display_reply = raw_reply
    else:
        display_reply = polish_reply(raw_reply)
        if products:
            paths = [card["path"] for card in products]
    return {
        "reply": display_reply,
        "requires_auth": requires_auth,
        "product_paths": paths,
        "products": products,
        "suggested_replies": suggested_replies(
            is_authenticated=is_authenticated, page_path=page_path
        ),
        "whatsapp_url": whatsapp_chat_url(),
    }


def _instant_response(
    message,
    *,
    is_authenticated,
    page_path,
    request,
):
    """Guest product gate or policy FAQ — no Gemini."""
    if not is_authenticated and wants_product_advice(message):
        return _build_response(
            reply=GUEST_PRODUCT_REPLY,
            requires_auth=True,
            product_paths=["/register", "/login"],
            is_authenticated=False,
            page_path=page_path,
            request=request,
        )
    faq = policy_faq_reply(message)
    if faq:
        return _build_response(
            reply=faq,
            requires_auth=False,
            is_authenticated=is_authenticated,
            page_path=page_path,
            request=request,
        )
    return None


def ask_beauty_assistant(
    message,
    history=None,
    *,
    is_authenticated=False,
    page_path="",
    request=None,
    user=None,
):
    """
    Guests asking for products → register/login gate.
    Clear policy FAQs → instant local reply (no Gemini).
    Members / other questions → Gemini with catalogue tools; product cards without prices.
    """
    history = history or []
    page_path = (page_path or "").strip()
    if user is None and request is not None:
        user = getattr(request, "user", None)

    # Policy FAQs + guest product gate work without Gemini.
    instant = _instant_response(
        message,
        is_authenticated=is_authenticated,
        page_path=page_path,
        request=request,
    )
    if instant is not None:
        return instant

    if not chat_is_configured():
        raise ChatNotConfigured()

    slug_bucket = []
    text, last_error = generate_reply(
        system_instruction=_system_instruction(is_authenticated, page_path),
        contents=_gemini_contents(message, history),
        use_tools=is_authenticated,
        user=user if is_authenticated else None,
        slug_bucket=slug_bucket,
    )
    if not text:
        raise ChatProviderError(
            detail="The beauty assistant is busy right now. Please try again in a moment."
        ) from last_error

    paths = product_paths_from_text(text) if is_authenticated else []
    return _build_response(
        reply=text,
        requires_auth=False,
        product_paths=paths,
        is_authenticated=is_authenticated,
        page_path=page_path,
        request=request,
        extra_slugs=slug_bucket if is_authenticated else None,
    )


def iter_beauty_assistant(
    message,
    history=None,
    *,
    is_authenticated=False,
    page_path="",
    request=None,
    user=None,
):
    """
    Streaming variant. Yields event dicts:
      {"type": "status", "message": "..."}
      {"type": "token", "text": "..."}
      {"type": "done", ...full response fields...}
      {"type": "error", "detail": "..."}
    """
    history = history or []
    page_path = (page_path or "").strip()
    if user is None and request is not None:
        user = getattr(request, "user", None)

    instant = _instant_response(
        message,
        is_authenticated=is_authenticated,
        page_path=page_path,
        request=request,
    )
    if instant is not None:
        yield {"type": "done", **instant}
        return

    if not chat_is_configured():
        raise ChatNotConfigured()

    slug_bucket = []
    collected = []
    try:
        for kind, value in prepare_then_stream(
            system_instruction=_system_instruction(is_authenticated, page_path),
            contents=_gemini_contents(message, history),
            use_tools=is_authenticated,
            user=user if is_authenticated else None,
            slug_bucket=slug_bucket,
        ):
            if kind == "status":
                yield {"type": "status", "message": value}
            elif kind == "token":
                collected.append(value)
                yield {"type": "token", "text": value}
            elif kind == "error":
                yield {"type": "error", "detail": value}
                return
    except ChatProviderError as error:
        yield {"type": "error", "detail": str(error)}
        return

    text = "".join(collected).strip()
    if not text:
        yield {
            "type": "error",
            "detail": "The beauty assistant is busy right now. Please try again in a moment.",
        }
        return

    paths = product_paths_from_text(text) if is_authenticated else []
    done = _build_response(
        reply=text,
        requires_auth=False,
        product_paths=paths,
        is_authenticated=is_authenticated,
        page_path=page_path,
        request=request,
        extra_slugs=slug_bucket if is_authenticated else None,
    )
    yield {"type": "done", **done}
