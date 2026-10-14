import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Load data from an async function and track loading / error state.
 *
 *   const { data, isLoading, error, reload } = useApi(() => catalogService.getProduct(slug), [slug])
 *
 * The request re-runs when any value in `dependencies` changes (compared by
 * JSON value). Responses from outdated requests are ignored.
 */
export function useApi(requestFn, dependencies = []) {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const requestRef = useRef(requestFn)
  const requestKey = `${JSON.stringify(dependencies)}#${reloadCount}`

  useEffect(() => {
    requestRef.current = requestFn
  })

  useEffect(() => {
    let isCurrent = true
    requestRef.current().then(
      (data) => isCurrent && setResult({ key: requestKey, data, error: null }),
      (error) => isCurrent && setResult({ key: requestKey, data: null, error }),
    )
    return () => {
      isCurrent = false
    }
  }, [requestKey])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])
  const setData = useCallback((data) => setResult((current) => ({ ...current, data })), [])
  const isLoading = result.key !== requestKey

  return {
    data: result.data,
    error: isLoading ? null : result.error,
    isLoading,
    reload,
    setData,
  }
}
