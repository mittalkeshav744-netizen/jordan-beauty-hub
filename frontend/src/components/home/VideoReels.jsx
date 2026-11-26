import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'

import { VIDEO_REELS } from '../../constants/media'
import AmbientVideo from '../common/AmbientVideo'
import Reveal from '../common/Reveal'

function normalizeReels(apiReels) {
  if (Array.isArray(apiReels) && apiReels.length > 0) {
    return apiReels
      .filter((reel) => reel.is_active !== false)
      .map((reel) => ({
        key: reel.id,
        title: reel.title,
        to: reel.link_url || '/shop',
        src: reel.video_file_url || reel.video_url,
        start: reel.start_seconds ?? 0,
        loopEnd: reel.loop_end_seconds ?? 7,
        linkType: reel.link_type || 'path',
      }))
      .filter((reel) => reel.src)
  }
  return VIDEO_REELS.map((reel) => ({
    key: reel.src,
    title: reel.title,
    to: reel.to,
    src: reel.src,
    start: reel.start,
    loopEnd: reel.loopEnd,
    linkType: 'path',
  }))
}

function SoundIcon({ muted }) {
  if (muted) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 5L6 9H3v6h3l5 4V5z" />
        <path d="M16 9l5 5M21 9l-5 5" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
    </svg>
  )
}

function ReelPlayerModal({ reel, onClose }) {
  const titleId = useId()
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/90 p-3 sm:p-6">
      <button type="button" aria-label="Close reel" className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex w-full max-w-sm flex-col overflow-hidden rounded-card bg-ink shadow-raised ring-1 ring-white/15"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-[9/16] w-full bg-black">
          <AmbientVideo
            src={reel.src}
            start={reel.start}
            loopEnd={reel.loopEnd}
            muted={muted}
            forcePlay
            className="absolute inset-0 h-full w-full"
          />
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? 'Unmute reel' : 'Mute reel'}
            className="absolute top-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition hover:bg-ink/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <SoundIcon muted={muted} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 left-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition hover:bg-ink/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-ink via-ink/55 to-transparent px-4 pt-16 pb-4">
            <h2 id={titleId} className="font-display text-xl font-bold text-white">
              {reel.title}
            </h2>
            <Link
              to={reel.to}
              onClick={onClose}
              className="pointer-events-auto mt-3 inline-flex items-center gap-1 text-sm font-semibold tracking-widest text-accent uppercase transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Shop now →
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function VideoReels({ reels: apiReels }) {
  const reels = normalizeReels(apiReels)
  const [unmutedKey, setUnmutedKey] = useState(null)
  const [openReel, setOpenReel] = useState(null)

  if (reels.length === 0) return null

  const stripActive = !openReel

  return (
    <section aria-labelledby="reels-heading" className="bg-ink py-7 text-white sm:py-14">
      <div className="page-container space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 id="reels-heading" className="section-title">
            Watch &amp; shop
          </h2>
          <p className="mt-1 text-sm text-white/70">Tap a video to watch. Shop when you are ready.</p>
        </div>
        <ul className="scrollbar-hide -mx-3 flex min-w-0 max-w-none snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-3 pb-2 sm:-mx-6 sm:gap-4 sm:px-6 sm:pb-3 lg:mx-0 lg:grid lg:max-w-none lg:grid-cols-6 lg:overflow-x-clip lg:px-0">
          {reels.map((reel, index) => {
            const isUnmuted = unmutedKey === reel.key
            return (
              <Reveal as="li" key={reel.key} delay={80 * index} className="w-36 shrink-0 snap-start sm:w-52 lg:w-auto">
                <article className="group relative overflow-hidden rounded-card shadow-raised ring-1 ring-white/10 transition-transform duration-300 ease-standard hover:-translate-y-1">
                  <AmbientVideo
                    src={reel.src}
                    start={reel.start}
                    loopEnd={reel.loopEnd}
                    muted={!isUnmuted}
                    active={stripActive}
                    className="aspect-[9/16]"
                    videoClassName="motion-reduce:transition-none transition-transform duration-500 ease-standard group-hover:scale-105"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setUnmutedKey(null)
                      setOpenReel(reel)
                    }}
                    aria-label={`Watch ${reel.title}`}
                    className="absolute inset-0 z-[1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  />

                  <button
                    type="button"
                    onClick={() => setUnmutedKey((current) => (current === reel.key ? null : reel.key))}
                    aria-label={isUnmuted ? `Mute ${reel.title}` : `Unmute ${reel.title}`}
                    aria-pressed={isUnmuted}
                    className={`absolute top-2.5 right-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition-[opacity,background-color] hover:bg-ink/75 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      isUnmuted
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'
                    }`}
                  >
                    <SoundIcon muted={!isUnmuted} />
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-ink/90 via-ink/50 to-transparent px-3 pt-12 pb-3">
                    <p className="font-display text-base leading-tight font-bold">{reel.title}</p>
                    <Link
                      to={reel.to}
                      className="pointer-events-auto mt-1 inline-block text-[0.65rem] font-semibold tracking-widest text-accent uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Shop now →
                    </Link>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </ul>
      </div>

      {openReel ? <ReelPlayerModal reel={openReel} onClose={() => setOpenReel(null)} /> : null}
    </section>
  )
}
