import { useEffect, useState } from 'react'

/**
 * True once `targetRef` has scrolled up out of view and the page footer is not on screen.
 * Used to show a bottom "Add to bag" bar on phones after the main button scrolls away.
 */
export function useStickyBar(targetRef) {
  const [isTargetAbove, setIsTargetAbove] = useState(false)
  const [isFooterVisible, setIsFooterVisible] = useState(false)

  useEffect(() => {
    const target = targetRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return undefined
    const footer = document.querySelector('footer')

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === target) {
          setIsTargetAbove(!entry.isIntersecting && entry.boundingClientRect.top < 0)
        } else {
          setIsFooterVisible(entry.isIntersecting)
        }
      }
    })
    observer.observe(target)
    if (footer) observer.observe(footer)
    return () => observer.disconnect()
  }, [targetRef])

  return isTargetAbove && !isFooterVisible
}
