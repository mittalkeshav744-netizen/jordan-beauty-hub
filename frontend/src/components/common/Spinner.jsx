const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' }

export default function Spinner({ size = 'md', label }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`${SIZES[size]} animate-spin rounded-full border-current border-r-transparent`}
      />
      {label && <span className="text-sm text-muted">{label}</span>}
    </span>
  )
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-accent">
      <Spinner size="lg" label={label} />
    </div>
  )
}
