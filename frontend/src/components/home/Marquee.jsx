import { MARQUEE_ITEMS } from '../../constants/navigation'

function MarqueeRow({ items, hidden = false }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-center gap-4 px-4 text-[0.65rem] font-semibold tracking-[0.16em] whitespace-nowrap uppercase sm:gap-6 sm:px-6 sm:text-sm sm:tracking-[0.2em]"
        >
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
export default function Marquee({ items }) {
  const list = items?.length ? items : MARQUEE_ITEMS
  return (
    <section
      aria-label="Why shop with us"
      className="overflow-hidden bg-accent py-2.5 text-white sm:py-3"
      data-manage-edit="/manage/storefront?focus=marquee"
      data-manage-label="Marquee strip"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <MarqueeRow items={list} />
        <MarqueeRow items={list} hidden />
      </div>
    </section>
  )
}
