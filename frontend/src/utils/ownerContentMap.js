/**
 * When the shop is opened with ?ownerMap=1 (inside the owner Website content iframe),
 * highlight [data-manage-edit] regions and notify the parent on click.
 * All in-iframe navigation is blocked so shop links never steal the click.
 */

const ATTR = 'data-manage-edit'
const LABEL_ATTR = 'data-manage-label'
const ACTIVE_CLASS = 'owner-map-active'
const STYLE_ID = 'owner-content-map-styles'

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    [${ATTR}] {
      cursor: pointer !important;
      position: relative;
      transition: box-shadow 0.15s ease, outline-color 0.15s ease;
    }
    /* Links/buttons inside hotspots must not navigate the iframe. */
    [${ATTR}] a,
    [${ATTR}] button,
    [${ATTR}] [role="link"],
    [${ATTR}] input,
    [${ATTR}] select,
    [${ATTR}] textarea {
      pointer-events: none !important;
    }
    [${ATTR}].${ACTIVE_CLASS} {
      outline: 3px solid var(--color-accent) !important;
      outline-offset: 2px;
      box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-accent) 20%, transparent);
      z-index: 20;
    }
    #owner-map-floating-label {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      max-width: min(22rem, 85vw);
      padding: 0.4rem 0.65rem;
      border-radius: var(--radius-control, 0.375rem);
      background: var(--color-ink, #111);
      color: var(--color-canvas, #fff);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      box-shadow: var(--shadow-raised, 0 8px 24px rgb(17 17 17 / 0.25));
    }
  `
  document.head.appendChild(style)
}

function floatingLabel() {
  let el = document.getElementById('owner-map-floating-label')
  if (!el) {
    el = document.createElement('div')
    el.id = 'owner-map-floating-label'
    el.hidden = true
    document.body.appendChild(el)
  }
  return el
}

function shortPath(path) {
  if (!path) return ''
  try {
    const url = new URL(path, window.location.origin)
    const focus = url.searchParams.get('focus')
    return focus ? `${url.pathname} · ${focus}` : url.pathname
  } catch {
    return path
  }
}

function showLabel(target, clientX, clientY) {
  const label = floatingLabel()
  const text = target.getAttribute(LABEL_ATTR) || 'Edit this section'
  const path = target.getAttribute(ATTR) || ''
  label.textContent = path ? `${text} → ${shortPath(path)}` : text
  label.hidden = false
  const x = Math.min(clientX + 12, window.innerWidth - label.offsetWidth - 8)
  const y = Math.min(clientY + 16, window.innerHeight - label.offsetHeight - 8)
  label.style.left = `${Math.max(8, x)}px`
  label.style.top = `${Math.max(8, y)}px`
}

function hideLabel() {
  const label = floatingLabel()
  label.hidden = true
}

function clearActive() {
  document.querySelectorAll(`.${ACTIVE_CLASS}`).forEach((node) => node.classList.remove(ACTIVE_CLASS))
}

function closestEditTarget(node) {
  if (!node || !node.closest) return null
  return node.closest(`[${ATTR}]`)
}

function isManagePath(path) {
  if (!path || typeof path !== 'string') return false
  return path === '/manage' || path.startsWith('/manage/') || path.startsWith('/manage?')
}

function notifyParent(path) {
  if (!isManagePath(path)) return
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'owner-map-navigate', path }, window.location.origin)
  }
}

function blockEvent(event) {
  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') {
    event.stopImmediatePropagation()
  }
}

/**
 * Activate owner map mode. Returns a cleanup function.
 */
export function startOwnerContentMap() {
  ensureStyles()
  let active = null
  let lastSentPath = ''
  let lastSentAt = 0

  const onMove = (event) => {
    const target = closestEditTarget(event.target)
    if (target === active) {
      if (target) showLabel(target, event.clientX, event.clientY)
      return
    }
    clearActive()
    active = target
    if (target) {
      target.classList.add(ACTIVE_CLASS)
      showLabel(target, event.clientX, event.clientY)
    } else {
      hideLabel()
    }
  }

  const onLeave = () => {
    clearActive()
    active = null
    hideLabel()
  }

  const sendFromEvent = (event) => {
    const target = closestEditTarget(event.target)
    blockEvent(event)
    if (!target) return
    const path = target.getAttribute(ATTR)
    if (!path) return
    // Debounce double-clicks so we don't fight a second accidental shop nav.
    const now = Date.now()
    if (path === lastSentPath && now - lastSentAt < 600) return
    lastSentPath = path
    lastSentAt = now
    notifyParent(path)
  }

  // Capture-phase: stop links (logo, CTAs, category cards) from changing the iframe.
  const onNavGesture = (event) => {
    if (closestEditTarget(event.target) || event.target.closest?.('a,button,[role="link"]')) {
      blockEvent(event)
    }
  }

  const onActivate = (event) => {
    if (event.type === 'click' && event.detail > 1) {
      // Ignore the synthetic follow-up clicks of a double-click; first click already sent.
      blockEvent(event)
      return
    }
    sendFromEvent(event)
  }

  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('pointerleave', onLeave, true)
  document.addEventListener('pointerdown', onNavGesture, true)
  document.addEventListener('click', onActivate, true)
  document.addEventListener('dblclick', blockEvent, true)
  document.addEventListener('auxclick', blockEvent, true)

  return () => {
    document.removeEventListener('pointermove', onMove, true)
    document.removeEventListener('pointerleave', onLeave, true)
    document.removeEventListener('pointerdown', onNavGesture, true)
    document.removeEventListener('click', onActivate, true)
    document.removeEventListener('dblclick', blockEvent, true)
    document.removeEventListener('auxclick', blockEvent, true)
    clearActive()
    hideLabel()
    document.getElementById(STYLE_ID)?.remove()
    document.getElementById('owner-map-floating-label')?.remove()
  }
}

export function isOwnerMapMode(search = window.location.search) {
  return new URLSearchParams(search).get('ownerMap') === '1'
}
