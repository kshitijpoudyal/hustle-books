import Link from 'next/link'
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { TransactionEntry, ExpenseEntry } from '@/lib/types'

interface RecentActivityProps {
  entries: TransactionEntry[]
  loading: boolean
  /** desktop: compact cards with hover scale + amount right */
  desktop?: boolean
}

/* ── Mobile Observation row ──────────────────────────────────────────────── */
function MobileRow({ entry }: { entry: TransactionEntry }) {
  const isIncome = entry.entry_type === 'income'
  const expense = !isIncome ? (entry as ExpenseEntry) : null
  const label = entry.description
    ?? (isIncome ? 'Income' : expense?.category ?? 'Expense')
  const subtitle = entry.hustle?.name
    ?? (expense?.category ? expense.category.charAt(0).toUpperCase() + expense.category.slice(1) : '')

  return (
    <Link
      href={`/log/${entry.id}`}
      className="bg-[var(--surface-container-low)] squircle p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
    >
      {/* Icon circle */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: isIncome ? 'rgba(134, 244, 241, 0.35)' : 'rgba(255, 218, 214, 0.45)',
          color: isIncome ? 'var(--on-secondary-container)' : 'var(--expense)',
        }}
      >
        {isIncome
          ? <ArrowUp className="w-5 h-5" strokeWidth={2} />
          : expense?.is_recurring
            ? <RefreshCw className="w-4 h-4" strokeWidth={2} />
            : <ArrowDown className="w-5 h-5" strokeWidth={2} />
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="font-headline font-bold text-[var(--on-surface)] truncate">{label}</div>
        <div className="font-body text-sm text-[var(--on-surface-variant)] opacity-80 truncate mt-0.5">
          {subtitle ? `${subtitle} — ` : ''}{formatCurrency(Number(entry.amount))}
        </div>
      </div>

      {/* Date */}
      <div className="text-right flex-shrink-0">
        <div className="font-label text-[10px] uppercase tracking-tighter text-[var(--on-surface-variant)]">
          {formatDate(entry.date, 'short')}
        </div>
      </div>
    </Link>
  )
}

/* ── Desktop Observation row ─────────────────────────────────────────────── */
function DesktopRow({ entry }: { entry: TransactionEntry }) {
  const isIncome = entry.entry_type === 'income'
  const expense = !isIncome ? (entry as ExpenseEntry) : null
  const label = entry.description
    ?? (isIncome ? 'Income' : expense?.category ?? 'Expense')
  const sublabel = isIncome
    ? (entry.hustle?.name ?? 'Income')
    : (expense?.category
        ? expense.category.charAt(0).toUpperCase() + expense.category.slice(1)
        : 'Expense')

  return (
    <Link
      href={`/log/${entry.id}`}
      className="bg-[var(--surface-container-lowest)] squircle p-5 flex items-center justify-between hover:scale-[1.02] transition-transform shadow-sm"
    >
      <div className="flex items-center gap-x-4 min-w-0 flex-1">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isIncome ? 'rgba(134, 244, 241, 0.2)' : 'rgba(255, 218, 214, 0.2)',
            color: isIncome ? 'var(--secondary)' : 'var(--expense)',
          }}
        >
          {isIncome
            ? <ArrowUp className="w-5 h-5" strokeWidth={2} />
            : <ArrowDown className="w-5 h-5" strokeWidth={2} />
          }
        </div>

        <div className="min-w-0">
          <h4 className="font-headline font-bold text-[var(--primary)] text-sm truncate">{label}</h4>
          <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mt-0.5">
            {sublabel}
          </p>
        </div>
      </div>

      <span
        className="font-headline font-bold text-sm flex-shrink-0 ml-3"
        style={{ color: isIncome ? 'var(--secondary)' : 'var(--expense)' }}
      >
        {isIncome ? '+' : '-'}{formatCurrency(Number(entry.amount), 'USD', true)}
      </span>
    </Link>
  )
}

/* ── Skeletons ───────────────────────────────────────────────────────────── */
function MobileSkeleton() {
  return (
    <div className="bg-[var(--surface-container-low)] squircle p-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[var(--surface-container-high)] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-3 w-24 bg-[var(--surface-container)] rounded-full" />
      </div>
      <div className="h-3 w-10 bg-[var(--surface-container-high)] rounded-full" />
    </div>
  )
}

function DesktopSkeleton() {
  return (
    <div className="bg-[var(--surface-container-lowest)] squircle p-5 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[var(--surface-container-high)] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-28 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-2.5 w-16 bg-[var(--surface-container)] rounded-full" />
      </div>
      <div className="h-3.5 w-14 bg-[var(--surface-container-high)] rounded-full" />
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function RecentActivity({ entries, loading, desktop }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i =>
          desktop ? <DesktopSkeleton key={i} /> : <MobileSkeleton key={i} />
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
          ? <DesktopRow key={`${entry.entry_type}-${entry.id}`} entry={entry} />
          : <MobileRow key={`${entry.entry_type}-${entry.id}`} entry={entry} />
      )}
    </div>
  )
}
