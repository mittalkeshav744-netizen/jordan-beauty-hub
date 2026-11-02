/**
 * Search + filters + primary action row for manage list pages.
 * Stacks cleanly on phones; search grows, filters/actions wrap.
 */
export default function ManageToolbar({ search, filters, actions, className = '' }) {
  return (
    <div
      className={`manage-panel mb-4 flex flex-col gap-3 p-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-3.5 ${className}`}
    >
      <div className="flex min-w-0 w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {search ? <div className="min-w-0 w-full flex-1">{search}</div> : null}
        {filters ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{filters}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>
      ) : null}
    </div>
  )
}
