import { Link } from 'react-router'

import { VIDEO_REELS } from '../../constants/media'
import AmbientVideo from '../common/AmbientVideo'
import Reveal from '../common/Reveal'

export default function VideoReels() {
  return (
    <section aria-labelledby="reels-heading" className="bg-ink py-10 text-white sm:py-14">
      <div className="page-container space-y-6">
        <div className="text-center">
          <h2 id="reels-heading" className="section-title">
            Watch &amp; shop
          </h2>
          <p className="mt-1 text-sm text-white/70">Tap a video to shop what you see.</p>
        </div>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
          {VIDEO_REELS.map((reel, index) => (
            <Reveal as="li" key={reel.src} delay={80 * index} className="w-44 shrink-0 snap-start sm:w-52 lg:w-auto">
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
