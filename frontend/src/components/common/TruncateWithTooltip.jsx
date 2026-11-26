/**
 * Single-line truncate with native browser tooltip (`title`) for the full text.
 * Use for product / category names in tight cards — no extra tooltip library.
 */
export default function TruncateWithTooltip({
  as: Tag = 'span',
  text,
  className = '',
  children,
  ...props
}) {
  const label = text ?? (typeof children === 'string' ? children : '')
  return (
    <Tag title={label || undefined} className={`truncate ${className}`} {...props}>
      {children ?? text}
    </Tag>
  )
}
