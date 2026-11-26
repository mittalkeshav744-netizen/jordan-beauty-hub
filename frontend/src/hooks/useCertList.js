import { useEffect, useState } from 'react'

/** Shared list loader for certificate pages (server pagination). */
export function useCertList(fetcher, deps = []) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [filters, setFilters] = useState({})
  const [data, setData] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced, pageSize, JSON.stringify(filters)])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    fetcher({
      page,
      page_size: pageSize,
      search: debounced || undefined,
      ...filters,
    })
      .then((payload) => {
        if (!alive) return
        if (Array.isArray(payload)) {
          setData({ results: payload, count: payload.length })
        } else {
          setData({
            results: payload.results || [],
            count: payload.count ?? (payload.results || []).length,
          })
        }
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.detail || err.message || 'Failed to load.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [page, pageSize, debounced, JSON.stringify(filters), reloadToken, ...deps])

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    setFilters,
    data,
    loading,
    error,
    reload: () => setReloadToken((n) => n + 1),
  }
}
