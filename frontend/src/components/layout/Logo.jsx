import { STORE_LOGO_SRC, STORE_NAME } from '../../constants/navigation'

/* Wordmark: the last word ("Hub") sits on its own accent line under the rest of the name. */
const NAME_WORDS = STORE_NAME.split(' ')
const nameTail = NAME_WORDS.length > 1 ? NAME_WORDS.at(-1) : ''
const nameLead = NAME_WORDS.length > 1 ? NAME_WORDS.slice(0, -1).join(' ') : STORE_NAME

const TONE_CLASSES = {
  dark: { mark: 'bg-ink text-white', name: 'text-ink' },
  light: { mark: 'bg-white text-ink', name: 'text-white' },
}

/**
 * Logo slot + wordmark. Shows the image from STORE_LOGO_SRC when set,
 * otherwise a square "JBH" placeholder mark that reserves the logo's space.
 * tone: "dark" on light backgrounds (header), "light" on dark backgrounds (footer).
 */
export default function Logo({ tone = 'dark', className = '' }) {
  const colours = TONE_CLASSES[tone]

  return (
    <span className={`flex min-w-0 items-center gap-2 font-display sm:gap-2.5 ${className}`}>
      {STORE_LOGO_SRC ? (
        <img
          src={STORE_LOGO_SRC}
          alt=""
          width="40"
          height="40"
          className="h-8 w-8 shrink-0 rounded-control object-contain sm:h-10 sm:w-10"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-[0.6rem] font-bold tracking-wide sm:h-10 sm:w-10 sm:text-[0.7rem] ${colours.mark}`}
        >
          JBH
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent" />
        </span>
      )}
      <span className="sr-only">{STORE_NAME}</span>
      <span aria-hidden="true" className={`flex min-w-0 flex-col leading-none ${colours.name}`}>
        <span className="truncate text-xs font-bold tracking-[0.03em] uppercase min-[360px]:text-[0.8125rem] min-[360px]:tracking-[0.06em] min-[400px]:text-base min-[400px]:tracking-[0.1em] sm:text-lg sm:tracking-[0.14em]">
          {nameLead}
        </span>
        <span className="mt-1 text-[0.6rem] font-semibold tracking-[0.45em] text-accent uppercase sm:text-[0.65rem]">
          {nameTail}
        </span>
      </span>
    </span>
  )
}
