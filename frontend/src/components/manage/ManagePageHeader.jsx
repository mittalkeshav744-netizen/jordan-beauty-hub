/**
 * Page title block for Owner Studio screens.
 */
export default function ManagePageHeader({ title, description, actions, eyebrow = 'Owner studio' }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-berry uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
