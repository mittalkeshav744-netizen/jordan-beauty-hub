import { getErrorMessage } from '../../utils/errors'
import Button from './Button'

/** Shows an API error (or a plain message) with an optional retry button. */
export default function ErrorMessage({ error, message, onRetry }) {
  const text = message || getErrorMessage(error)
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-card border border-danger/30 bg-danger-soft p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{text}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
