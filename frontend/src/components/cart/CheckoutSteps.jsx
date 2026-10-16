const STEPS = ['Bag', 'Address & payment', 'Order placed']

/** Progress through the purchase: `current` is the index of the active step. */
export default function CheckoutSteps({ current }) {
  return (
    <nav aria-label="Checkout progress" className="mb-5 sm:mb-6">
      <ol className="flex items-center gap-2 text-xs sm:text-sm">
        {STEPS.map((label, index) => {
          const isDone = index < current
          const isCurrent = index === current
          return (
            <li key={label} aria-current={isCurrent ? 'step' : undefined} className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone || isCurrent ? 'bg-ink text-white' : 'border border-line text-muted'
                }`}
              >
                {isDone ? <span aria-label="Done">✓</span> : index + 1}
              </span>
              <span className={`truncate ${isCurrent ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</span>
              {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-4 shrink-0 bg-line sm:w-10" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
