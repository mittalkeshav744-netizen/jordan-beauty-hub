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
  }))
}

export default function VideoReels({ reels: apiReels }) {
  const reels = normalizeReels(apiReels)
  if (reels.length === 0) return null

  return (
    <section aria-labelledby="reels-heading" className="bg-ink py-7 text-white sm:py-14">
      <div className="page-container space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 id="reels-heading" className="section-title">
            Watch &amp; shop
          </h2>
          <p className="mt-1 text-sm text-white/70">Tap a video to shop what you see.</p>
        </div>
        <ul className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-2 sm:-mx-6 sm:gap-4 sm:px-6 sm:pb-3 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
          {reels.map((reel, index) => (
            <Reveal as="li" key={reel.key} delay={80 * index} className="w-36 shrink-0 snap-start sm:w-52 lg:w-auto">
              <Link
                to={reel.to}
                className="group relative block overflow-hidden rounded-card shadow-raised ring-1 ring-white/10 transition-transform duration-300 ease-standard hover:-translate-y-1"
              >
                <AmbientVideo
                  src={reel.src}
                  start={reel.start}
                  loopEnd={reel.loopEnd}
                  className="aspect-[9/16]"
                  videoClassName="transition-transform duration-500 ease-standard group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/90 via-ink/50 to-transparent px-3 pt-12 pb-3">
                  <span className="block font-display text-base leading-tight font-bold">{reel.title}</span>
                  <span className="mt-1 block text-[0.65rem] font-semibold tracking-widest text-accent uppercase">
                    Shop now →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
