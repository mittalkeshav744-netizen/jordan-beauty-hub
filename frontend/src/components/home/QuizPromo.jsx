import Button from '../common/Button'
import Reveal from '../common/Reveal'

const DEFAULT_STEPS = ['Skin type', 'Main concern', 'Your budget']

export default function QuizPromo({ config }) {
  if (config && config.quiz_enabled === false) return null

  const badge = config?.quiz_badge || 'Free skin quiz'
  const title = config?.quiz_title || 'Build a routine that fits your skin'
  const subtitle =
    config?.quiz_subtitle ||
    'Three short answers. We match morning and night products from our range to your type, concern, and budget.'
  const buttonText = config?.quiz_button_text || 'Start the quiz'
  const buttonLink = config?.quiz_link || '/skin-quiz'

  return (
    <section
      className="page-container section-y"
      data-manage-edit="/manage/storefront?focus=quiz"
      data-manage-label="Skin quiz promo"
    >
      <Reveal className="relative isolate overflow-hidden rounded-card bg-linear-to-br from-accent to-tile-orchid-deep px-4 py-7 text-white shadow-raised sm:px-10 sm:py-10 lg:px-14">
        <span
          aria-hidden="true"
          className="absolute -top-16 -right-16 -z-10 h-64 w-64 animate-blob rounded-full bg-white/15 blur-2xl"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-20 left-1/4 -z-10 h-56 w-56 animate-blob rounded-full bg-tile-peach/30 blur-2xl [animation-delay:-6s]"
        />
        <div className="grid items-center gap-5 sm:gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-white/80 uppercase sm:text-xs sm:tracking-[0.3em]">
              {badge}
            </p>
            <h2 className="font-display text-xl font-bold sm:text-4xl">{title}</h2>
            <p className="max-w-lg text-sm text-white/85 sm:text-base">{subtitle}</p>
            <Button to={buttonLink} size="lg">
              {buttonText}
            </Button>
          </div>
          <ol className="grid gap-2 sm:gap-3">
            {DEFAULT_STEPS.map((step, index) => (
              <Reveal
                as="li"
                key={step}
                delay={150 * (index + 1)}
                className="flex items-center gap-3 rounded-card bg-white/15 p-3 backdrop-blur sm:gap-4 sm:p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-display text-base font-bold text-accent sm:h-10 sm:w-10 sm:text-lg">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold sm:text-base">{step}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  )
}
