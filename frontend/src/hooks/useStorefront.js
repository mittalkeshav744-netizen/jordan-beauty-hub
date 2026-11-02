import { storeService } from '../services/storeService'
import { useApi } from './useApi'

let storefrontPromise = null

export function clearStorefrontCache() {
  storefrontPromise = null
}

export function useStorefront() {
  const { data, isLoading, error, reload } = useApi(() => {
    storefrontPromise ??= storeService.getStorefront().catch((err) => {
      storefrontPromise = null
      throw err
    })
    return storefrontPromise
  }, [])

  const refetch = () => {
    clearStorefrontCache()
    return reload()
  }

  return {
    data,
    config: data?.config,
    reels: data?.reels,
    isLoading,
    error,
    reload: refetch,
  }
}
