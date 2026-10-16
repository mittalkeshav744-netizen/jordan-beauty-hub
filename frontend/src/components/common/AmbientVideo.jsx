import { useEffect, useRef } from 'react'

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Silent looping video that plays only while on screen, saving data and battery on phones.
 * Visitors who ask for reduced motion see a still frame (taken at `start` seconds).
 * With `loopEnd`, only the part between `start` and `loopEnd` seconds repeats.
 * Decorative: hidden from screen readers, so put any meaning in nearby text.
 */
export default function AmbientVideo({
  src,
  start = 0,
  loopEnd,
  poster,
  label,
  className = '',
  videoClassName = '',
  style,
}) {
  const videoRef = useRef(null)

  const handleTimeUpdate = (event) => {
    if (loopEnd && event.currentTarget.currentTime >= loopEnd) event.currentTarget.currentTime = start
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.25 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={style} className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={start ? `${src}#t=${start}` : src}
        poster={poster ?? undefined}
        muted
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={loopEnd ? handleTimeUpdate : undefined}
        aria-hidden="true"
        className={`h-full w-full object-cover ${videoClassName}`}
      />
      {label && (
        <span className="absolute right-2 bottom-2 z-10 rounded-control bg-ink/70 px-2 py-0.5 text-[0.6rem] text-white/85">
          {label}
        </span>
      )}
    </div>
  )
}
