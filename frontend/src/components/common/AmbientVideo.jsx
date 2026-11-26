import { useEffect, useRef } from 'react'

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Silent looping video that plays only while on screen, saving data and battery on phones.
 * Visitors who ask for reduced motion see a still frame (taken at `start` seconds).
 * With `loopEnd`, only the part between `start` and `loopEnd` seconds repeats.
 * Decorative: hidden from screen readers, so put any meaning in nearby text.
 * Pass `muted={false}` after a user gesture to enable audio; only one reel should unmute at a time.
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
  priority = false,
  muted = true,
  forcePlay = false,
  active = true,
}) {
  const videoRef = useRef(null)
  const rafRef = useRef(0)
  const visibleRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    video.muted = muted
  }, [muted])

  useEffect(() => {
    const video = videoRef.current
    if (!video || typeof IntersectionObserver === 'undefined') return undefined

    const reduced = prefersReducedMotion()

    const stopLoopWatch = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }

    const watchLoop = () => {
      stopLoopWatch()
      if (!loopEnd) return
      const tick = () => {
        if (!video || video.paused || video.ended) {
          rafRef.current = 0
          return
        }
        if (video.currentTime >= loopEnd) {
          video.currentTime = start
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const pauseVideo = () => {
      stopLoopWatch()
      if (!video.paused) video.pause()
    }

    const playVideo = () => {
      if (reduced || document.hidden) return
      if (!forcePlay && !visibleRef.current) return
      if (!active) return
      const playPromise = video.play()
      if (playPromise?.then) {
        playPromise.then(() => watchLoop()).catch(() => {})
      } else {
        watchLoop()
      }
    }

    if (forcePlay) {
      visibleRef.current = true
      if (active) playVideo()
      else pauseVideo()
    }

    const observer = forcePlay
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            visibleRef.current = Boolean(entry.isIntersecting && entry.intersectionRatio >= 0.2)
            if (visibleRef.current && active) playVideo()
            else pauseVideo()
          },
          { threshold: [0, 0.2, 0.5], rootMargin: '40px 0px 40px 0px' },
        )
    if (observer) observer.observe(video)

    const onVisibility = () => {
      if (document.hidden) pauseVideo()
      else if ((forcePlay || visibleRef.current) && active) playVideo()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      pauseVideo()
    }
  }, [src, start, loopEnd, priority, forcePlay, active])

  useEffect(() => {
    const video = videoRef.current
    if (!video || forcePlay) return undefined
    if (!active) {
      video.pause()
    } else if (visibleRef.current && !document.hidden) {
      video.play()?.catch(() => {})
    }
    return undefined
  }, [active, forcePlay])

  return (
    <div style={style} className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={start ? `${src}#t=${start}` : src}
        poster={poster ?? undefined}
        muted={muted}
        loop={!loopEnd}
        playsInline
        preload="metadata"
        decoding="async"
        disablePictureInPicture
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
