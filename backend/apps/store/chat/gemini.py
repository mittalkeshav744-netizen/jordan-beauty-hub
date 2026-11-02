"""Low-level Gemini HTTP client with optional function-calling loop and SSE streaming."""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.request

from django.conf import settings

from .exceptions import ChatProviderError
from .tools import execute_tool, member_tool_declarations

logger = logging.getLogger(__name__)

# Prefer fast, widely available Flash Lite; keep aliases as last resort.
_MODEL_FALLBACKS = (
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
)

# Keep tool loops short — each round is another full Gemini round-trip.
MAX_TOOL_ROUNDS = 2
MAX_OUTPUT_TOKENS = 768
HTTP_TIMEOUT = 35


def model_candidates():
    preferred = (settings.GEMINI_MODEL or "").strip()
    seen = set()
    for name in (preferred, *_MODEL_FALLBACKS):
        if name and name not in seen:
            seen.add(name)
            yield name


def _generation_config():
    # Do not send thinkingConfig — several Flash Lite models reject it with 400.
    return {
        "temperature": 0.35,
        "maxOutputTokens": MAX_OUTPUT_TOKENS,
    }


def _call_gemini(model, payload):
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={settings.GOOGLE_GEMINI_API_KEY}"
    )
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "JordanBeautyHub/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


def _without_thinking(payload):
    generation = dict(payload.get("generationConfig") or {})
    generation.pop("thinkingConfig", None)
    return {**payload, "generationConfig": generation}


def _generate_once(model, payload):
    """
    One generateContent call with light retries.
    Returns (data, error). data is None when this model should be skipped.
    """
    active = payload
    last_error = None
    for attempt in range(3):
        try:
            return _call_gemini(model, active), None
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            last_error = error
            if (
                error.code == 400
                and "thinkingConfig" in active.get("generationConfig", {})
            ):
                # Lite models often return a generic "invalid argument" for thinking.
                active = _without_thinking(active)
                continue
            if error.code in {401, 403}:
                raise ChatProviderError(
                    detail="The beauty assistant is busy right now. Please try again in a moment."
                ) from error
            if error.code == 404:
                return None, error
            if error.code in {429, 500, 502, 503} and attempt < 2:
                time.sleep(0.45 * (attempt + 1))
                continue
            # Skip this model (overloaded / bad args) so callers can try the next one.
            if error.code in {400, 429, 500, 502, 503}:
                logger.info("Gemini model %s skipped (%s)", model, error.code)
                return None, error
            raise ChatProviderError(
                detail="The beauty assistant is busy right now. Please try again in a moment."
            ) from error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.45 * (attempt + 1))
                continue
            logger.info("Gemini model %s timed out or network error", model)
            return None, error
    return None, last_error


def _extract_text(data):
    candidate = (data.get("candidates") or [{}])[0]
    parts = candidate.get("content", {}).get("parts") or []
    chunks = [part.get("text", "") for part in parts if part.get("text")]
    text = "\n".join(chunk.strip() for chunk in chunks if chunk.strip()).strip()
    finish = candidate.get("finishReason") or candidate.get("finish_reason")
    return text, finish


def _extract_stream_delta(data):
    """Incremental text from a streamGenerateContent SSE chunk (do not strip mid-stream)."""
    candidate = (data.get("candidates") or [{}])[0]
    parts = candidate.get("content", {}).get("parts") or []
    return "".join(part.get("text", "") for part in parts if part.get("text"))


def _function_calls(data):
    candidate = (data.get("candidates") or [{}])[0]
    parts = candidate.get("content", {}).get("parts") or []
    calls = []
    for part in parts:
        call = part.get("functionCall") or part.get("function_call")
        if call and call.get("name"):
            calls.append(call)
    return calls, candidate.get("content")


def _base_payload(system_instruction, contents, *, use_tools=False):
    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": list(contents),
        "generationConfig": _generation_config(),
    }
    if use_tools:
        payload["tools"] = [{"functionDeclarations": member_tool_declarations()}]
    return payload


def _apply_tool_calls(payload, calls, model_content, *, user, slug_bucket):
    if model_content:
        payload["contents"].append(model_content)
    response_parts = []
    for call in calls:
        name = call.get("name")
        args = call.get("args") or call.get("arguments") or {}
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except json.JSONDecodeError:
                args = {}
        result = execute_tool(name, args, user=user, slug_bucket=slug_bucket)
        response_parts.append({"functionResponse": {"name": name, "response": result}})
    payload["contents"].append({"role": "user", "parts": response_parts})


def generate_reply(
    *,
    system_instruction,
    contents,
    use_tools=False,
    user=None,
    slug_bucket=None,
):
    """
    Call Gemini (with a short tool loop for members). Returns (text, last_error).
    slug_bucket: mutable list filled with product slugs seen via tools.
    """
    slug_bucket = slug_bucket if slug_bucket is not None else []
    base_payload = _base_payload(system_instruction, contents, use_tools=use_tools)

    last_error = None
    for model in model_candidates():
        payload = json.loads(json.dumps(base_payload))
        for _round in range(MAX_TOOL_ROUNDS if use_tools else 1):
            data, last_error = _generate_once(model, payload)
            if data is None:
                break

            calls, model_content = _function_calls(data)
            if use_tools and calls:
                _apply_tool_calls(
                    payload, calls, model_content, user=user, slug_bucket=slug_bucket
                )
                continue

            try:
                text, finish = _extract_text(data)
            except (KeyError, IndexError, TypeError):
                break
            if not text:
                break
            if finish and str(finish).upper() in {"MAX_TOKENS", "LENGTH"}:
                logger.warning("Gemini reply truncated (finish=%s)", finish)
            return text, None

        continue

    return None, last_error


def _iter_sse_events(response):
    """Parse Google alt=sse stream into JSON objects."""
    buffer = ""
    while True:
        chunk = response.read(512)
        if not chunk:
            break
        buffer += chunk.decode("utf-8", errors="replace")
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            line = line.strip()
            if not line or line.startswith(":"):
                continue
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if not data or data == "[DONE]":
                continue
            try:
                yield json.loads(data)
            except json.JSONDecodeError:
                logger.debug("Skipping non-JSON SSE chunk")


def iter_stream_text(model, payload):
    """
    Yield text deltas from streamGenerateContent (SSE).
    Raises HTTPError 404 / returns empty on skippable failures so the caller can try
    the next model. Raises ChatProviderError only for auth failures.
    """
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
        f"?alt=sse&key={settings.GOOGLE_GEMINI_API_KEY}"
    )
    active = payload
    request = urllib.request.Request(
        url,
        data=json.dumps(active).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "JordanBeautyHub/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
            for event in _iter_sse_events(response):
                delta = _extract_stream_delta(event)
                if delta:
                    yield delta
        return
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        if error.code in {401, 403}:
            raise ChatProviderError(
                detail="The beauty assistant is busy right now. Please try again in a moment."
            ) from error
        if (
            error.code == 400
            and "thinkingConfig" in active.get("generationConfig", {})
        ):
            active = _without_thinking(active)
            request = urllib.request.Request(
                url,
                data=json.dumps(active).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "JordanBeautyHub/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
                for event in _iter_sse_events(response):
                    delta = _extract_stream_delta(event)
                    if delta:
                        yield delta
            return
        if error.code == 404:
            raise  # let caller try next model
        # 400 / 429 / 5xx — skip this model
        logger.info("Gemini stream model %s skipped (%s): %s", model, error.code, body[:160])
        return


def prepare_then_stream(
    *,
    system_instruction,
    contents,
    use_tools=False,
    user=None,
    slug_bucket=None,
):
    """
    Run a short non-stream tool loop, then stream the final text.

    Yields ("status", message) then ("token", text_delta).
    On failure yields ("error", detail) once.
    """
    slug_bucket = slug_bucket if slug_bucket is not None else []
    base_payload = _base_payload(system_instruction, contents, use_tools=use_tools)

    last_error = None
    for model in model_candidates():
        payload = json.loads(json.dumps(base_payload))
        tool_rounds = MAX_TOOL_ROUNDS if use_tools else 0

        # Non-stream tool rounds first (function calling is awkward mid-SSE).
        for _round in range(tool_rounds):
            yield ("status", "Checking products…")
            data, last_error = _generate_once(model, payload)
            if data is None:
                break
            calls, model_content = _function_calls(data)
            if calls:
                _apply_tool_calls(
                    payload, calls, model_content, user=user, slug_bucket=slug_bucket
                )
                continue
            # Model already returned plain text — stream it as one chunk for UX consistency.
            try:
                text, _finish = _extract_text(data)
            except (KeyError, IndexError, TypeError):
                text = ""
            if text:
                yield ("token", text)
                return
            break

        # Final streamed answer (no tools — contents already include tool results).
        stream_payload = {
            "systemInstruction": payload["systemInstruction"],
            "contents": payload["contents"],
            "generationConfig": payload["generationConfig"],
        }
        yield ("status", "Writing reply…")
        try:
            produced = False
            for delta in iter_stream_text(model, stream_payload):
                produced = True
                yield ("token", delta)
            if produced:
                return
        except urllib.error.HTTPError as error:
            if error.code == 404:
                last_error = error
                continue
            raise
        except ChatProviderError:
            raise
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = error
            continue

    detail = "The beauty assistant is busy right now. Please try again in a moment."
    yield ("error", detail)
    if last_error:
        logger.warning("Mira stream failed: %s", last_error)
