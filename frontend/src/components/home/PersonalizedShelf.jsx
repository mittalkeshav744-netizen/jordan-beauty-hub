import { useMemo } from 'react'
import { Link } from 'react-router'

import { ANY_BUDGET, NO_CONCERN } from '../../constants/skinQuiz'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { catalogService } from '../../services/catalogService'
import Reveal from '../common/Reveal'
import ProductGrid from '../products/ProductGrid'

/**
 * Home product shelf.
 * Personalized ranking (skin / concern / budget) only when the shopper is signed in
 * and has completed the skin quiz. Guests and new accounts see plain popular picks.
 */
export default function PersonalizedShelf() {
  const { user, isAuthenticated } = useAuth()

  const profile = useMemo(() => {
    if (!isAuthenticated || !user?.beauty_profile?.skin_type) return null
    return {
      skin: user.beauty_profile.skin_type,
      concern: user.beauty_profile.primary_concern || NO_CONCERN,
      budget: user.beauty_profile.budget_preference
        ? String(Number(user.beauty_profile.budget_preference))
        : ANY_BUDGET,
    }
  }, [isAuthenticated, user])

  const params = useMemo(() => {
    const p = { context: 'home' }
    if (!profile) return p
    if (profile.skin) p.skin_type = profile.skin
    if (profile.concern && profile.concern !== NO_CONCERN) p.concern = profile.concern
    if (profile.budget && profile.budget !== ANY_BUDGET) p.max_price = profile.budget
    return p
  }, [profile])

  const { data: products, isLoading, error } = useApi(
    () => catalogService.getRecommendations(params),
    [params],
  )

  const hasProfile = Boolean(profile?.skin)

  if (error || (!isLoading && (!products || products.length === 0))) {
    return null
  }

  return (
    <section aria-labelledby="personalized-shelf-title" className="page-container section-y">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-accent uppercase sm:px-2.5 sm:text-xs">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
              {hasProfile ? 'Formulated For You' : 'Popular picks'}
            </span>
            {hasProfile && profile.skin && (
              <span className="inline-flex rounded-full bg-subtle px-2 py-0.5 text-xs font-medium text-ink-soft capitalize">
                {profile.skin} skin
              </span>
            )}
            {hasProfile && profile.concern && profile.concern !== NO_CONCERN && (
              <span className="inline-flex rounded-full bg-subtle px-2 py-0.5 text-xs font-medium text-ink-soft capitalize">
                {profile.concern}
              </span>
            )}
          </div>
          <h2 id="personalized-shelf-title" className="section-title">
            {hasProfile ? 'Picked for your skin' : 'Bestsellers & favourites'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {hasProfile
              ? 'Matched to your quiz answers — skin type, concern, and budget.'
              : 'Same featured products everyone sees. Sign in and take the quiz for a personal match.'}
          </p>
        </div>

        <Link
          to="/skin-quiz"
          className="shrink-0 text-xs font-semibold tracking-widest text-accent uppercase hover:underline"
        >
          {hasProfile ? 'Retake quiz' : 'Take the skin quiz'}
        </Link>
      </div>

      {!hasProfile && (
        <div className="mb-4 flex flex-col items-start justify-between gap-2.5 rounded-card border border-line bg-cream p-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-3 sm:p-5">
          <div>
            <p className="font-display text-sm font-bold text-ink sm:text-base">Want matches for your skin?</p>
            <p className="text-xs text-muted sm:text-sm">
              Sign in, then answer three quick questions — personal picks only apply to your account.
            </p>
          </div>
          <Link
            to="/skin-quiz"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-control bg-ink px-3 text-xs font-semibold text-white transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-accent sm:h-10 sm:px-4"
          >
            Start the quiz
          </Link>
        </div>
      )}

      <Reveal>
        <ProductGrid products={products || []} isLoading={isLoading} skeletonCount={4} />
      </Reveal>
    </section>
  )
}
