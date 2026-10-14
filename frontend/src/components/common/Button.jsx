import { Link } from 'react-router'

import Spinner from './Spinner'

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-control text-center font-semibold uppercase tracking-wide ' +
  'transition-colors duration-200 ease-standard disabled:cursor-not-allowed disabled:opacity-50'

const VARIANT_CLASSES = {
  primary: 'bg-ink text-white hover:bg-ink-soft',
  accent: 'bg-accent text-white hover:bg-accent-hover',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-white',
  ghost: 'text-ink hover:bg-subtle',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-white',
}

const SIZE_CLASSES = {
  sm: 'h-10 px-3 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
}

/**
 * Shared button. Renders a router <Link> when `to` is provided.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  to,
  type = 'button',
  className = '',
  disabled,
  children,
  ...props
}) {
  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
