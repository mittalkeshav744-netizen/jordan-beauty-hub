import { SHOP_PERKS, STORE_NAME } from '../../constants/navigation'

/**
 * Wide promotional banner at the top of the shop. Decorative: the page's real heading
 * is the <h1> under it, so the banner text is plain paragraphs.
 * images: up to three photos with light backgrounds (blended onto the gradient).
 */
export default function CategoryBanner({ headline, images, gradient }) {
  return (
    <div className="overflow-hidden rounded-card shadow-card">
      <div
        className={`grid min-h-40 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-center gap-3 bg-linear-to-r px-5 py-6 sm:min-h-56 sm:gap-6 sm:px-10 lg:min-h-64 lg:px-14 ${gradient}`}
      >
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold tracking-[0.3em] text-ink/70 uppercase sm:text-xs">{STORE_NAME}</p>
          <p className="mt-2 font-display text-xl leading-tight font-extrabold text-ink min-[400px]:text-2xl sm:text-4xl lg:text-5xl">
            {headline}
          </p>
        </div>
        {images.length > 0 && (
          <div className="flex h-28 min-w-0 items-end justify-center gap-1 sm:h-44 sm:gap-3 lg:h-52">
            {images.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                decoding="async"
                className="h-full min-w-0 flex-1 object-contain mix-blend-multiply [mask-image:radial-gradient(closest-side,black_80%,transparent)]"
              />
            ))}
          </div>
        )}
      </div>
      <p className="bg-ink px-4 py-2 text-center text-[0.6rem] font-semibold tracking-[0.15em] text-white uppercase sm:text-xs">
        {SHOP_PERKS.join(' | ')}
      </p>
    </div>
  )
}
