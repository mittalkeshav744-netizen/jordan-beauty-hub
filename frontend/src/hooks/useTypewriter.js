import { useEffect, useState } from 'react'

const TYPE_MS = 90
const DELETE_MS = 45
const HOLD_MS = 1400
const GAP_MS = 350

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Types each word letter by letter, holds it, deletes it, then moves to the next word.
 * While `paused` (or when the user prefers reduced motion) it shows the current word whole.
 */
export function useTypewriter(words, { paused = false } = {}) {
  const [wordIndex, setWordIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const word = words[wordIndex % words.length] ?? ''
  const isStatic = paused || prefersReducedMotion()

  useEffect(() => {
    if (isStatic || !word) return undefined

    let delay = isDeleting ? DELETE_MS : TYPE_MS
    let next = () => setLength((value) => value + (isDeleting ? -1 : 1))

    if (!isDeleting && length === word.length) {
      delay = HOLD_MS
      next = () => setIsDeleting(true)
    } else if (isDeleting && length === 0) {
      delay = GAP_MS
      next = () => {
        setIsDeleting(false)
        setWordIndex((value) => (value + 1) % words.length)
      }
    }

    const timer = setTimeout(next, delay)
    return () => clearTimeout(timer)
  }, [isStatic, word, length, isDeleting, words.length])

  return isStatic ? word : word.slice(0, length)
}
