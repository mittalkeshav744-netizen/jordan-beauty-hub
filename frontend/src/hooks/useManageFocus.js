import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

const HIGHLIGHT_CLASS = 'manage-focus-highlight'
const HIGHLIGHT_MS = 3200

/**
 * After navigating from the Website content map (`?focus=…`), scroll to the
 * matching `[data-manage-section]` panel and briefly highlight it.
 *
 * @param {{ ready?: boolean }} [options]
 */
export function useManageFocus(options = {}) {
  const { ready = true } = options
  const [searchParams] = useSearchParams()
  const focus = searchParams.get('focus')

  useEffect(() => {
    if (!focus || !ready) return undefined

    let cancelled = false
    let timer
    let attempts = 0

    const apply = () => {
      if (cancelled) return
      const el = document.querySelector(`[data-manage-section="${CSS.escape(focus)}"]`)
      if (!el) {
        if (attempts < 16) {
          attempts += 1
          timer = window.setTimeout(apply, 60)
        }
        return
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add(HIGHLIGHT_CLASS)
      timer = window.setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS)
    }

    timer = window.setTimeout(apply, 50)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((node) => node.classList.remove(HIGHLIGHT_CLASS))
    }
  }, [focus, ready])

  return focus
}
