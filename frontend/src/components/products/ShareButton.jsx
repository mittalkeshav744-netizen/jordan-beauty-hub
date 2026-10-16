import { useToast } from '../../hooks/useToast'

/** Opens the phone's share sheet where available; otherwise copies the page link. */
export default function ShareButton({ title }) {
  const { showToast } = useToast()

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch (error) {
        if (error.name !== 'AbortError') showToast('Could not open sharing. Please try again.', 'error')
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied. Paste it anywhere to share.')
    } catch {
      showToast('Could not copy the link. Please copy it from the address bar.', 'error')
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`Share ${title}`}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-ink text-ink transition-colors duration-200 ease-standard hover:bg-subtle"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
      </svg>
    </button>
  )
}
