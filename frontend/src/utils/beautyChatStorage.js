const PREFIX = 'jbh-beauty-chat-v1'

export function chatStorageKey(isAuthenticated, userId) {
  if (isAuthenticated && userId) return `${PREFIX}:user:${userId}`
  return `${PREFIX}:guest`
}

export function loadChatMessages(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    return parsed
      .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant') && entry.content)
      .slice(-40)
  } catch {
    return fallback
  }
}

export function saveChatMessages(key, messages) {
  try {
    const slim = (messages || [])
      .filter((entry) => entry && entry.content)
      .slice(-40)
      .map(({ role, content, products, productPaths, requiresAuth }) => ({
        role,
        content,
        products: products || [],
        productPaths: productPaths || [],
        requiresAuth: Boolean(requiresAuth),
      }))
    localStorage.setItem(key, JSON.stringify(slim))
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function clearChatMessages(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** One soft nudge per browser session for PDP / cart (Phase C). */
export function shouldShowPageNudge(pathname) {
  if (!pathname) return false
  if (!(pathname.startsWith('/products/') || pathname.startsWith('/cart'))) return false
  try {
    const flag = sessionStorage.getItem(`${PREFIX}:nudge:${pathname}`)
    return !flag
  } catch {
    return false
  }
}

export function markPageNudgeSeen(pathname) {
  try {
    sessionStorage.setItem(`${PREFIX}:nudge:${pathname}`, '1')
  } catch {
    // ignore
  }
}
