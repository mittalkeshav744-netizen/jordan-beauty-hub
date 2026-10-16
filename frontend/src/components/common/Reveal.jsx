import { useEffect, useRef, useState } from 'react'

/**
 * Fades and lifts its content into view the first time it scrolls onto the screen.
 * `delay` (ms) staggers items in a row. Content shows immediately where the browser
 * cannot observe scrolling, and the global reduced-motion rule removes the movement.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...props }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || isVisible) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [isVisible])

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`transition-[opacity,translate] duration-700 ease-standard ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
