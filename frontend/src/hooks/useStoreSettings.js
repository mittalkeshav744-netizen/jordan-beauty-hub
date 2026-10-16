import { storeService } from '../services/storeService'
import { useApi } from './useApi'

/**
 * Public shop settings, or null while they load or if they could not be loaded.
 * Only used for optional extras (delivery hints, WhatsApp links), so callers simply hide them when null.
 */
export function useStoreSettings() {
  const { data } = useApi(() => storeService.getSettings())
  return data
}

/** Link that opens a WhatsApp chat with the shop, or null when no number is configured. */
export function whatsappLink(settings, message) {
  if (!settings?.whatsapp_number) return null
  return `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(message)}`
}
