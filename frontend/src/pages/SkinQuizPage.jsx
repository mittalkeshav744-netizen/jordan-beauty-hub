import { useSearchParams } from 'react-router'

import Breadcrumbs from '../components/common/Breadcrumbs'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import Skeleton from '../components/common/Skeleton'
import StepProductCard from '../components/products/StepProductCard'
import { ANY_BUDGET, NO_CONCERN, QUIZ_BUDGETS } from '../constants/skinQuiz'
import { useAddManyToCart } from '../hooks/useAddManyToCart'
import { useApi } from '../hooks/useApi'
import { catalogService } from '../services/catalogService'
import { formatPrice } from '../utils/format'

/** Answers live in the URL (?skin=oily&concern=acne&budget=499) so results can be shared and the back button works. */
const ANSWER_KEYS = ['skin', 'concern', 'budget']

function OptionGrid({ options, onChoose }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {options.map((option, index) => (
        <li key={option.value} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
          <button
            type="button"
            onClick={() => onChoose(option.value)}
            className="group flex h-full w-full flex-col items-start gap-1 rounded-card border-2 border-line bg-surface p-4 text-left transition-all duration-200 ease-standard hover:-translate-y-0.5 hover:border-accent hover:shadow-raised focus-visible:border-accent"
          >
            <span className="font-display text-lg font-bold group-hover:text-accent">{option.name}</span>
            {option.description && <span className="text-sm text-muted">{option.description}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

function Question({ number, title, hint, request, toOptions, onChoose }) {
  const { data, isLoading, error, reload } = request
  return (
    <section aria-labelledby="quiz-question" className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">Question {number} of 3</p>
        <div
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={number}
          className="h-1.5 overflow-hidden rounded-full bg-subtle"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-standard"
            style={{ width: `${(number / 3) * 100}%` }}
          />
        </div>
        <h2 id="quiz-question" className="animate-fade-up font-display text-2xl font-bold sm:text-3xl">
          {title}
        </h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {isLoading && (
        <div aria-label="Loading options" className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-card" />
          ))}
        </div>
      )}
      {!isLoading && !error && <OptionGrid options={toOptions(data)} onChoose={onChoose} />}
    </section>
  )
}

function RoutineList({ title, steps }) {
  return (
    <section aria-labelledby={`${title}-heading`} className="space-y-3">
      <h3 id={`${title}-heading`} className="text-sm font-semibold tracking-[0.2em] uppercase">
        {title === 'morning' ? '☀ Morning routine' : '☾ Night routine'}
      </h3>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <StepProductCard key={step.step} number={index + 1} label={step.label} product={step.product} />
        ))}
      </ol>
    </section>
  )
}

function QuizResult({ answers, skinTypes, concerns, onRestart }) {
  const params = { skin_type: answers.skin }
  if (answers.concern !== NO_CONCERN) params.concern = answers.concern
  if (answers.budget !== ANY_BUDGET) params.max_price = answers.budget
  const { data, isLoading, error, reload } = useApi(() => catalogService.getRoutine(params), [params])
  const { addMany, isAdding } = useAddManyToCart()

  const skinName = skinTypes?.find((item) => item.slug === answers.skin)?.name
  const concernName = concerns?.find((item) => item.slug === answers.concern)?.name

  return (
    <section aria-labelledby="result-heading" className="animate-fade-up space-y-6">
      <div className="rounded-card bg-linear-to-br from-accent to-tile-orchid-deep p-6 text-white shadow-raised sm:p-8">
        <p className="text-xs font-semibold tracking-[0.3em] text-white/80 uppercase">Your result</p>
        <h2 id="result-heading" className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          Your personal routine
        </h2>
        <p className="mt-2 text-sm text-white/85">
          {[skinName && `${skinName} skin`, concernName && `focus on ${concernName.toLowerCase()}`]
            .filter(Boolean)
            .join(', ') || 'Picked for you'}
          .
        </p>
      </div>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {isLoading && (
        <div aria-label="Loading your routine" className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-card" />
          ))}
        </div>
      )}
      {data && !isLoading && (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            <RoutineList title="morning" steps={data.morning} />
            <RoutineList title="night" steps={data.night} />
          </div>
          <div className="flex flex-col gap-4 rounded-card bg-cream p-5 sm:flex-row sm:items-center sm:justify-between">
            {data.bag_variant_ids.length > 0 ? (
              <>
                <div>
                  <p className="text-sm text-muted">
                    {data.bag_variant_ids.length} product{data.bag_variant_ids.length === 1 ? '' : 's'} (one of each)
                  </p>
                  <p className="font-display text-2xl font-bold">{formatPrice(data.total_price)}</p>
                </div>
                <Button
                  variant="accent"
                  size="lg"
                  isLoading={isAdding}
                  onClick={() => addMany(data.bag_variant_ids, 'Your routine')}
                >
                  Add whole routine to bag
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted">
                We have nothing in stock for these answers yet. Try a higher budget or another concern.
              </p>
            )}
          </div>
        </>
      )}
      <div className="text-center">
        <Button variant="outline" onClick={onRestart}>
          Retake quiz
        </Button>
      </div>
    </section>
  )
}

export default function SkinQuizPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const skinTypes = useApi(() => catalogService.getSkinTypes())
  const concerns = useApi(() => catalogService.getConcerns())
  const answers = Object.fromEntries(ANSWER_KEYS.map((key) => [key, searchParams.get(key) ?? '']))
  const answeredCount = ANSWER_KEYS.findIndex((key) => !answers[key])
  const currentStep = answeredCount === -1 ? ANSWER_KEYS.length : answeredCount

  const choose = (key) => (value) => {
    const next = new URLSearchParams(searchParams)
    next.set(key, value)
    setSearchParams(next)
  }
  const goBack = () => {
    const next = new URLSearchParams(searchParams)
    next.delete(ANSWER_KEYS[currentStep - 1])
    setSearchParams(next)
  }
  const restart = () => setSearchParams({})

  const questions = [
    {
      title: 'What is your skin type?',
      hint: 'Not sure? Oily skin shines by noon; dry skin feels tight after washing.',
      request: skinTypes,
      toOptions: (items) => items.map((item) => ({ value: item.slug, name: item.name, description: item.description })),
    },
    {
      title: 'What would you most like to fix?',
      request: concerns,
      toOptions: (items) => [
        ...items.map((item) => ({ value: item.slug, name: item.name, description: item.description })),
        { value: NO_CONCERN, name: 'Nothing in particular', description: 'Just keep my skin healthy' },
      ],
    },
    {
      title: 'What is your budget per product?',
      request: { data: QUIZ_BUDGETS, isLoading: false, error: null },
      toOptions: (items) => items,
    },
  ]

  return (
    <div className="page-container max-w-4xl pb-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Skin quiz' }]} />
      <div className="py-6 text-center sm:py-8">
        <h1 className="section-title">Skin quiz</h1>
        <p className="mt-1 text-sm text-muted">Three questions. One routine made for you.</p>
      </div>

      {currentStep < ANSWER_KEYS.length ? (
        <>
          <Question
            key={currentStep}
            number={currentStep + 1}
            {...questions[currentStep]}
            onChoose={choose(ANSWER_KEYS[currentStep])}
          />
          {currentStep > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="mt-6 py-2 text-sm font-semibold text-ink-soft underline-offset-2 hover:text-accent hover:underline"
            >
              ← Back
            </button>
          )}
        </>
      ) : (
        <QuizResult answers={answers} skinTypes={skinTypes.data} concerns={concerns.data} onRestart={restart} />
      )}
    </div>
  )
}
