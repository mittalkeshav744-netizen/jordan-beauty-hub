/**
 * Soft “why are you here?” choice on sign-in / register.
 * Same account either way — only changes copy + default redirect.
 */
export const AUTH_INTENT_SHOP = 'shop'
export const AUTH_INTENT_COURSE = 'course'

export function intentHome(intent, { from, user } = {}) {
  if (from) return from
  if (user?.is_staff) return '/manage'
  if (intent === AUTH_INTENT_COURSE) return '/courses'
  return '/'
}

export function intentDescription(intent) {
  if (intent === AUTH_INTENT_COURSE) {
    return 'Sign in to enroll in beauty courses and access your lessons.'
  }
  return 'Sign in to shop products, track orders, and check out faster.'
}

export function intentRegisterDescription(intent) {
  if (intent === AUTH_INTENT_COURSE) {
    return 'Create an account to enroll in academy courses and unlock lessons.'
  }
  return 'Join Jordan Beauty Hub to check out faster and track your orders.'
}

export default function IntentChoice({ value, onChange }) {
  const optionClass = (intent) =>
    `flex-1 rounded-btn border px-3 py-3 text-left transition-colors ${
      value === intent
        ? 'border-ink bg-ink text-white'
        : 'border-line bg-surface text-ink hover:border-ink/30 hover:bg-cream'
    }`

  return (
    <fieldset className="mb-5 space-y-2">
      <legend className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        I am here to
      </legend>
      <div className="flex flex-col gap-2 sm:flex-row" role="radiogroup" aria-label="Account purpose">
        <button
          type="button"
          role="radio"
          aria-checked={value === AUTH_INTENT_SHOP}
          className={optionClass(AUTH_INTENT_SHOP)}
          onClick={() => onChange(AUTH_INTENT_SHOP)}
        >
          <span className="block text-sm font-semibold">Shop products</span>
          <span className={`mt-0.5 block text-xs ${value === AUTH_INTENT_SHOP ? 'text-white/75' : 'text-muted'}`}>
            Bag, wishlist, and orders
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === AUTH_INTENT_COURSE}
          className={optionClass(AUTH_INTENT_COURSE)}
          onClick={() => onChange(AUTH_INTENT_COURSE)}
        >
          <span className="block text-sm font-semibold">Join a course</span>
          <span className={`mt-0.5 block text-xs ${value === AUTH_INTENT_COURSE ? 'text-white/75' : 'text-muted'}`}>
            Enroll and learn with lessons
          </span>
        </button>
      </div>
    </fieldset>
  )
}
