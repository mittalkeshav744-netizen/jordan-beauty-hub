import apiClient, { ensureCsrfCookie } from './apiClient'

let settingsRequest = null

function apiOrigin() {
  const base = import.meta.env.VITE_API_BASE_URL || '/api'
  if (base.startsWith('http')) return base.replace(/\/$/, '')
  return `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}`.replace(/\/$/, '')
}

function csrfTokenFromCookie() {
  const match = document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : ''
}

/**
 * Parse SSE `data:` lines from a fetch body stream.
 * Calls onEvent(parsedJson) for each complete event.
 */
async function readSse(response, onEvent, signal) {
  if (!response.ok) {
    let detail = 'I could not reply just now. Please try again.'
    try {
      const body = await response.json()
      if (body?.detail) detail = body.detail
    } catch {
      /* ignore */
    }
    const error = new Error(detail)
    error.response = { status: response.status, data: { detail } }
    throw error
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    if (signal?.aborted) {
      await reader.cancel()
      throw new DOMException('Aborted', 'AbortError')
    }
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    while (true) {
      const sep = buffer.indexOf('\n\n')
      if (sep === -1) break
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      for (const line of block.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const raw = trimmed.slice(5).trim()
        if (!raw) continue
        try {
          onEvent(JSON.parse(raw))
        } catch {
          /* skip malformed */
        }
      }
    }
  }
}

export const storeService = {
  /** Public shop settings (shipping fee, free-shipping threshold, WhatsApp number). Fetched once per visit. */
  getSettings: () => {
    settingsRequest ??= apiClient
      .get('/store/settings/')
      .then((response) => response.data)
      .catch((error) => {
        settingsRequest = null
        throw error
      })
    return settingsRequest
  },
  getStorefront: () =>
    apiClient.get('/store/storefront/').then((response) => response.data),
  subscribeToNewsletter: (email) =>
    apiClient.post('/store/newsletter/', { email }).then((response) => response.data),
  /**
   * Beauty assistant (Google Gemini on the server) — non-streaming fallback.
   * history: [{ role, content }], page_path: current storefront path (e.g. /products/slug).
   */
  chat: ({ message, history = [], page_path = '' }) =>
    apiClient
      .post('/store/chat/', { message, history, page_path }, { timeout: 45000 })
      .then((response) => response.data),

  /**
   * Streaming Mira reply (SSE). Handlers: onStatus, onToken, onDone.
   * Instant FAQs / guest gate emit a single onDone with no tokens.
   */
  chatStream: async ({ message, history = [], page_path = '' }, { onStatus, onToken, onDone, signal } = {}) => {
    await ensureCsrfCookie()
    let response
    try {
      response = await fetch(`${apiOrigin()}/store/chat/stream/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfTokenFromCookie(),
        },
        body: JSON.stringify({ message, history, page_path }),
        signal,
      })
    } catch (networkError) {
      const error = new Error('Cannot reach the server. Check your connection and try again.')
      error.cause = networkError
      throw error
    }

    const contentType = response.headers.get('content-type') || ''
    // Stale Django / SPA catch-all returns HTML 200 for unknown API paths.
    if (!contentType.includes('text/event-stream') && !contentType.includes('json')) {
      const error = new Error('Chat stream is unavailable. Retrying…')
      error.response = { status: response.status, data: { detail: error.message } }
      throw error
    }

    let donePayload = null
    let streamError = null
    await readSse(
      response,
      (event) => {
        if (event.type === 'status') onStatus?.(event.message || '')
        else if (event.type === 'token') onToken?.(event.text || '')
        else if (event.type === 'done') {
          donePayload = event
          onDone?.(event)
        } else if (event.type === 'error') {
          streamError = event.detail || 'I could not reply just now. Please try again.'
        }
      },
      signal,
    )
    if (streamError) {
      const error = new Error(streamError)
      error.response = { data: { detail: streamError } }
      throw error
    }
    if (!donePayload) {
      const error = new Error('I could not reply just now. Please try again.')
      error.response = { data: { detail: error.message } }
      throw error
    }
    return donePayload
  },
}
