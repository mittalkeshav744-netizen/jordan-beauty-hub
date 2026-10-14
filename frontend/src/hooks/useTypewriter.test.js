import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTypewriter } from './useTypewriter'

/* Each timer is scheduled by an effect after the previous render, so advance one step at a time. */
function advanceSteps(count) {
  for (let step = 0; step < count; step += 1) {
    act(() => vi.advanceTimersToNextTimer())
  }
}

describe('useTypewriter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('types a word, deletes it and moves to the next one', () => {
    const { result } = renderHook(() => useTypewriter(['Kajal', 'Serum']))
    expect(result.current).toBe('')

    advanceSteps(5)
    expect(result.current).toBe('Kajal')

    // hold, delete five letters, gap, then type the first letter of the next word
    advanceSteps(1 + 5 + 1 + 1)
    expect(result.current).toBe('S')
  })

  it('shows the whole word while paused', () => {
    const { result } = renderHook(() => useTypewriter(['Kajal'], { paused: true }))
    expect(result.current).toBe('Kajal')
  })
})
