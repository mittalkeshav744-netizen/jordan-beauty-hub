import { ANY_BUDGET, NO_CONCERN } from '../constants/skinQuiz'

export const BEAUTY_PROFILE_STORAGE_KEY = 'jbh_beauty_profile'

/** Persist quiz answers for guests (and as a cache before the auth API responds). */
export function saveLocalBeautyProfile(answers) {
  const payload = {
    skin: answers.skin || '',
    concern: answers.concern || NO_CONCERN,
    budget: answers.budget || ANY_BUDGET,
  }
  try {
    localStorage.setItem(BEAUTY_PROFILE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Private browsing / quota — shelves still work from auth profile.
  }
  return payload
}

export function readLocalBeautyProfile() {
  try {
    const raw = localStorage.getItem(BEAUTY_PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.skin) return null
    return {
      skin: parsed.skin,
      concern: parsed.concern || NO_CONCERN,
      budget: parsed.budget || ANY_BUDGET,
    }
  } catch {
    return null
  }
}

/** Clear guest quiz cache (logout / new account — home must not stay personalized). */
export function clearLocalBeautyProfile() {
  try {
    localStorage.removeItem(BEAUTY_PROFILE_STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
}

/** Body for PATCH /api/auth/beauty-profile/ */
export function beautyProfileApiPayload(answers) {
  return {
    skin_type: answers.skin || '',
    primary_concern: answers.concern || NO_CONCERN,
    budget_preference: answers.budget || ANY_BUDGET,
    raw_quiz_answers: {
      skin: answers.skin || '',
      concern: answers.concern || NO_CONCERN,
      budget: answers.budget || ANY_BUDGET,
    },
  }
}
