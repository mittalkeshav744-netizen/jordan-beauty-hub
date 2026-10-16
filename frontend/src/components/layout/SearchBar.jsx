import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { SEARCH_SUGGESTIONS } from '../../constants/navigation'
import { useTypewriter } from '../../hooks/useTypewriter'
import { catalogService } from '../../services/catalogService'
import { formatPrice } from '../../utils/format'
import ProductImage from '../common/ProductImage'

const MIN_QUERY_LENGTH = 2
const SUGGESTION_LIMIT = 5
const TYPING_DELAY_MS = 250

/** Products matching what the visitor is typing, fetched after a short pause. */
function useProductSuggestions(term, isEnabled) {
  const [result, setResult] = useState({ term: '', products: [] })

  useEffect(() => {
    if (!isEnabled || term.length < MIN_QUERY_LENGTH) return undefined
    let isCurrent = true
    const timer = setTimeout(() => {
      catalogService.getProducts({ search: term, page_size: SUGGESTION_LIMIT }).then(
        (page) => isCurrent && setResult({ term, products: page.results }),
        () => isCurrent && setResult({ term, products: [] }),
      )
    }, TYPING_DELAY_MS)
    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [term, isEnabled])

  return isEnabled && result.term === term ? result.products : []
}

export default function SearchBar({ className = '', onSearch, id, autoFocus = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const [isFocused, setIsFocused] = useState(autoFocus)
  const [isDismissed, setIsDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const suggestion = useTypewriter(SEARCH_SUGGESTIONS, { paused: isFocused || query !== '' })
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-suggestions`

  const trimmed = query.trim()
  const products = useProductSuggestions(trimmed, isFocused && !isDismissed)
  const isOpen = products.length > 0
  const activeProduct = isOpen ? products[activeIndex] : undefined

  const finish = (path) => {
    setIsDismissed(true)
    setActiveIndex(-1)
    inputRef.current?.blur()
    navigate(path)
    onSearch?.()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (activeProduct) {
      finish(`/products/${activeProduct.slug}`)
      return
    }
    finish(trimmed ? `/shop?search=${encodeURIComponent(trimmed)}` : '/shop')
  }

  const handleKeyDown = (event) => {
    if (!isOpen) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      // Cycles through every suggestion and back to the typed text (index -1).
      const step = event.key === 'ArrowDown' ? 1 : -1
      const positions = products.length + 1
      setActiveIndex((index) => ((index + 1 + step + positions) % positions) - 1)
    } else if (event.key === 'Escape') {
      setIsDismissed(true)
      setActiveIndex(-1)
    }
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeProduct ? `${listId}-${activeProduct.id}` : undefined}
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsDismissed(false)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          setActiveIndex(-1)
        }}
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
      <ul
        id={listId}
        role="listbox"
        aria-label="Product suggestions"
        hidden={!isOpen}
        className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-card"
      >
        {products.map((product, index) => (
          <li
            key={product.id}
            id={`${listId}-${product.id}`}
            role="option"
            aria-selected={index === activeIndex}
            // mousedown would blur the input and close the list before the click lands
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => finish(`/products/${product.slug}`)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${index === activeIndex ? 'bg-subtle' : ''}`}
          >
            <ProductImage
              src={product.primary_image?.image}
              alt=""
              className="h-10 w-10 shrink-0 rounded-control bg-subtle"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{product.name}</span>
              <span className="block truncate text-xs text-muted">{product.brand.name}</span>
            </span>
            <span className="shrink-0 text-sm font-medium">{formatPrice(product.min_price)}</span>
          </li>
        ))}
      </ul>
    </form>
  )
}
