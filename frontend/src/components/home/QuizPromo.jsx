import Button from '../common/Button'
import Reveal from '../common/Reveal'

const STEPS = ['Your skin type', 'Your main concern', 'Your budget']

export default function QuizPromo() {
  return (
    <section className="page-container py-8 sm:py-10">
      <Reveal className="relative isolate overflow-hidden rounded-card bg-linear-to-br from-accent to-tile-orchid-deep px-6 py-10 text-white shadow-raised sm:px-10 lg:px-14">
        <span aria-hidden="true" className="absolute -top-16 -right-16 -z-10 h-64 w-64 animate-blob rounded-full bg-white/15 blur-2xl" />
        <span aria-hidden="true" className="absolute -bottom-20 left-1/4 -z-10 h-56 w-56 animate-blob rounded-full bg-tile-peach/30 blur-2xl [animation-delay:-6s]" />
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.3em] text-white/80 uppercase">Free skin quiz</p>
            <h2 className="font-display text-2xl font-bold sm:text-4xl">Not sure what suits your skin?</h2>
            <p className="max-w-lg text-sm text-white/85 sm:text-base">
              Answer three quick questions and get a morning and night routine picked from our shelves, just for you.
            </p>
            <Button to="/skin-quiz" size="lg">
              Take the skin quiz
            </Button>
          </div>
          <ol className="grid gap-3">
            {STEPS.map((step, index) => (
              <Reveal
                as="li"
                key={step}
                delay={150 * (index + 1)}
                className="flex items-center gap-4 rounded-card bg-white/15 p-4 backdrop-blur"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-display text-lg font-bold text-accent">
                  {index + 1}
                </span>
                <span className="font-semibold">{step}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  )
}
