export default function DataTable({ columns, rows, rowKey = 'id', empty, selectedIds, onToggle, onToggleAll }) {
  const allIds = rows.map((row) => row[rowKey])
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds?.has(id))

  return (
    <div className="cert-card overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--cert-line)] bg-[var(--cert-gold-soft)]/40 text-xs tracking-wide text-[var(--cert-muted)] uppercase">
            {selectedIds ? (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--cert-navy)]"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all rows"
                />
              </th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3.5 py-3 font-semibold whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectedIds ? 1 : 0)} className="px-4 py-10 text-center text-[var(--cert-muted)]">
                {empty || 'No records found.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row[rowKey]} className="border-b border-[var(--cert-line)] last:border-0 hover:bg-[var(--cert-ivory)]/60">
                {selectedIds ? (
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--cert-navy)]"
                      checked={selectedIds.has(row[rowKey])}
                      onChange={() => onToggle(row[rowKey])}
                      aria-label={`Select row ${row[rowKey]}`}
                    />
                  </td>
                ) : null}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3.5 py-3 align-middle ${
                      col.align === 'right' ? 'text-right whitespace-nowrap' : ''
                    }`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
