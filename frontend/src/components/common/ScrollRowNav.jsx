import { useCallback, useEffect, useState } from 'react'

import FaIcon from '../manage/FaIcon'

/**
 * Previous / Next controls for a horizontal overflow scroller.
 * Pass the scroll container element via `scrollerRef`.
 * `contentKey` rebinds listeners when the scroller node or its children remount.
 */
export default function ScrollRowNav({ scrollerRef, contentKey = '', className = '' }) {
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = scrollerRef?.current
    if (!el) {
      setCanPrev(false)
      setCanNext(false)
      return
    }
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 4)
    setCanNext(max > 4 && el.scrollLeft < max - 4)
  }, [scrollerRef])

  useEffect(() => {
    const el = scrollerRef?.current
    if (!el) return undefined
    update()
    // After layout settles (images / card widths), re-measure once.
    const raf = requestAnimationFrame(update)
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [scrollerRef, update, contentKey])

  const scrollByDir = (dir) => {
    const el = scrollerRef?.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: 'smooth' })
    // Smooth scroll fires async — nudge button state after the motion starts.
    window.setTimeout(update, 320)
  }

  if (!canPrev && !canNext) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        aria-label="Previous"
        disabled={!canPrev}
        onClick={() => scrollByDir(-1)}
        className="btn-icon h-9 w-9 rounded-full border border-line bg-surface text-ink shadow-card disabled:cursor-not-allowed disabled:opacity-35"
      >
        <FaIcon icon="chevronLeft" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Next"
        disabled={!canNext}
        onClick={() => scrollByDir(1)}
        className="btn-icon h-9 w-9 rounded-full border border-line bg-surface text-ink shadow-card disabled:cursor-not-allowed disabled:opacity-35"
      >
        <FaIcon icon="chevronRight" className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
