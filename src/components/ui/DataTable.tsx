import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { TableSkeleton, EmptyState, ErrorState } from './States'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
}

interface Props<T extends { id: string }> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  rowActions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
  selectable?: boolean
  selected?: Set<string>
  onSelectedChange?: (s: Set<string>) => void
  pageSize?: number
}

export function DataTable<T extends { id: string }>({
  columns, rows, loading, error, onRetry, emptyTitle = 'No records yet', emptyDescription,
  emptyAction, rowActions, onRowClick, selectable, selected, onSelectedChange, pageSize = 20,
}: Props<T>) {
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [rows, sortKey, sortDir, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize)

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleAll() {
    if (!onSelectedChange) return
    if (selected && selected.size === pageRows.length) onSelectedChange(new Set())
    else onSelectedChange(new Set(pageRows.map((r) => r.id)))
  }

  function toggleRow(id: string) {
    if (!onSelectedChange || !selected) return
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectedChange(next)
  }

  if (error) return <ErrorState message={error} onRetry={onRetry} />

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#ffffff]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#f1f5f9] text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={!!selected && pageRows.length > 0 && selected.size === pageRows.length} onChange={toggleAll} />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortValue && toggleSort(col.key)}
                  className={`px-4 py-3 font-medium ${col.sortValue ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                >
                  {col.header}
                  {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                </th>
              ))}
              {rowActions && <th className="w-12 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}>
                    <TableSkeleton rows={1} cols={columns.length} />
                  </td>
                </tr>
              ))}
            {!loading &&
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-black/[0.03]' : ''}`}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={!!selected?.has(row.id)} onChange={() => toggleRow(row.id)} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu>{rowActions(row)}</RowMenu>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}

      {!loading && rows.length > pageSize && (
        <div className="flex items-center justify-between border-t border-[#e5e7eb] px-4 py-3 text-sm text-gray-600">
          <span>
            Page {page + 1} of {pageCount} · {rows.length} records
          </span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RowMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)} className="rounded p-1.5 text-gray-500 hover:bg-black/5 hover:text-gray-700">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-44 rounded-lg border border-[#e5e7eb] bg-[#ffffff] py-1 shadow-xl" onClick={() => setOpen(false)}>
            {children}
          </div>
        </>
      )}
    </div>
  )
}

export function RowMenuItem({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-black/5 ${danger ? 'text-red-600' : 'text-gray-700'}`}
    >
      {children}
    </button>
  )
}
