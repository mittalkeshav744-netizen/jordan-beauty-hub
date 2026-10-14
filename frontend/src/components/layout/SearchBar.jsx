import { useId, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { SEARCH_SUGGESTIONS } from '../../constants/navigation'
import { useTypewriter } from '../../hooks/useTypewriter'

export default function SearchBar({ className = '', onSearch, id, autoFocus = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const [isFocused, setIsFocused] = useState(autoFocus)
  const suggestion = useTypewriter(SEARCH_SUGGESTIONS, { paused: isFocused || query !== '' })
  const generatedId = useId()
  const inputId = id ?? generatedId

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/shop?search=${encodeURIComponent(trimmed)}` : '/shop')
    onSearch?.()
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <input
        id={inputId}
        type="search"
        enterKeyHint="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={`Search for ${suggestion}`}
        className="h-11 w-full rounded-control border border-muted/50 bg-surface pr-3 pl-11 text-base placeholder:text-muted hover:border-ink-soft focus:border-ink focus:outline-none sm:text-sm"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute inset-y-0 left-0 flex w-11 items-center justify-center rounded-l-control text-ink-soft hover:text-accent"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12.5" cy="12.5" r="6.5" />
          <path d="m21 21-3.9-3.9" />
          <path d="M5 2.5v3M3.5 4h3" />
          <path d="M9.5 10.2a3.2 3.2 0 0 1 3-2.2" />
        </svg>
      </button>
    </form>
  )
}
