import { Link } from 'react-router'

import Spinner from './Spinner'

const BASE_CLASSES =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-btn text-center font-semibold tracking-[0.06em] ' +
  'transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-standard ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 ' +
  'active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const VARIANT_CLASSES = {
  primary:
    'bg-ink text-white shadow-[0_1px_2px_rgb(17_17_17/0.12)] hover:bg-ink-soft hover:shadow-[0_4px_12px_rgb(17_17_17/0.14)]',
  accent:
    'bg-accent text-white shadow-[0_1px_2px_rgb(214_28_99/0.25)] hover:bg-accent-hover hover:shadow-[0_4px_14px_rgb(214_28_99/0.28)]',
  outline:
    'border border-line bg-surface text-ink shadow-[0_1px_2px_rgb(17_17_17/0.04)] hover:border-ink hover:bg-ink hover:text-white',
  ghost: 'text-ink-soft hover:bg-subtle hover:text-ink',
  danger:
    'border border-danger/40 bg-surface text-danger hover:border-danger hover:bg-danger hover:text-white',
}

const SIZE_CLASSES = {
  sm: 'h-9 min-h-9 px-3.5 text-[0.7rem] sm:h-10 sm:px-4',
  md: 'h-10 min-h-10 px-4 text-xs sm:h-11 sm:px-5 sm:text-sm',
  lg: 'h-11 min-h-11 px-5 text-sm sm:h-12 sm:px-7',
}

/**
 * Shared button for shop + Owner Studio. Renders a router <Link> when `to` is set.
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
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
    SIZE_CLASSES[size] || SIZE_CLASSES.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

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
