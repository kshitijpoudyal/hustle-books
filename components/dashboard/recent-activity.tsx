import Link from 'next/link'
import { MobileTransactionRow, DesktopTransactionRow, MobileTransactionRowSkeleton, DesktopTransactionRowSkeleton } from '@/components/transaction-row'
import type { TransactionEntry } from '@/lib/types'

interface RecentActivityProps {
  entries: TransactionEntry[]
  loading: boolean
  /** desktop: use desktop row layout */
  desktop?: boolean
}

export default function RecentActivity({ entries, loading, desktop }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i =>
          desktop ? <DesktopTransactionRowSkeleton key={i} /> : <MobileTransactionRowSkeleton key={i} />
        )}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="font-label text-xs uppercase tracking-[0.06rem] text-[var(--on-surface-variant)]">
          Nothing logged yet
        </p>
        <p className="text-xs text-[var(--on-surface-variant)] mt-1 opacity-50">
          Tap Log to record your first entry
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map(entry =>
        desktop
          ? <DesktopTransactionRow key={`${entry.entry_type}-${entry.id}`} entry={entry} variant="simple" />
          : <MobileTransactionRow key={`${entry.entry_type}-${entry.id}`} entry={entry} variant="simple" />
      )}
    </div>
  )
}
