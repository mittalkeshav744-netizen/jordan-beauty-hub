import { MARQUEE_ITEMS } from '../../constants/navigation'

function MarqueeRow({ hidden = false }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((item) => (
        <li key={item} className="flex items-center gap-6 px-6 text-xs font-semibold tracking-[0.2em] whitespace-nowrap uppercase sm:text-sm">
          {item}
          <span aria-hidden="true" className="text-white/60">
            ✦
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Endless scrolling strip. The row is drawn twice so the loop has no gap; screen readers hear it once. */
export default function Marquee() {
  return (
    <section aria-label="Why shop with us" className="overflow-hidden bg-accent py-3 text-white">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <MarqueeRow />
        <MarqueeRow hidden />
      </div>
    </section>
  )
}
