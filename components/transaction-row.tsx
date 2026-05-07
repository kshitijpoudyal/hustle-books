'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown, RefreshCw, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate, formatMileage } from '@/lib/utils/formatters'
import { calcNetMargin } from '@/lib/utils/calculations'
import { EXPENSE_CATEGORIES } from '@/lib/utils/constants'
import { useFeatureFlags } from '@/lib/context/feature-flags-context'
import type { TransactionEntry, IncomeEntry, ExpenseEntry } from '@/lib/types'

export type TransactionRowVariant = 'simple' | 'detailed' | 'hustle'

export interface TransactionRowProps {
  entry: TransactionEntry
  /** simple = no meta line (dashboard); detailed = full info (history); hustle = hide hustle name (hustle detail page) */
  variant?: TransactionRowVariant
  /** When provided and SWIPE_ACTIONS flag is on, enables swipe-to-delete on mobile */
  onDelete?: () => void
}

type Inc = IncomeEntry & { entry_type: 'income' }
type Exp = ExpenseEntry & { entry_type: 'expense' }

function getMeta(inc: Inc | null, variant: TransactionRowVariant): string {
  if (variant === 'simple' || !inc) return ''
  if (inc.mileage) {
    const fuel = inc.fuel_cost_at_log ?? 0
    const depr = inc.depreciation_cost_at_log ?? 0
    const net = Number(inc.amount) - fuel - depr
    let m = formatMileage(inc.mileage)
    if (depr > 0) m += ` · ${formatCurrency(depr)} depr.`
    m += ` · ~${formatCurrency(net)} net`
    return m
  }
  if (inc.hustle?.category === 'reselling_and_flipping' && inc.cogs != null && inc.cogs > 0) {
    return `Cost ${formatCurrency(inc.cogs)} · Net ${formatCurrency(calcNetMargin(Number(inc.amount), inc.cogs))}`
  }
  return ''
}

// ── Mobile ─────────────────────────────────────────────────────────────────

export function MobileTransactionRow({ entry, variant = 'detailed', onDelete }: TransactionRowProps) {
  const isIncome = entry.entry_type === 'income'
  const inc = isIncome ? (entry as Inc) : null
  const exp = !isIncome ? (entry as Exp) : null
  const { flag } = useFeatureFlags()
  const swipeEnabled = flag('SWIPE_ACTIONS') && !!onDelete
  const hustleColorBadgesEnabled = flag('HUSTLE_COLOR_BADGES')
  const router = useRouter()

  const [swiped, setSwiped] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const label = entry.description
    ?? (isIncome ? 'Income' : EXPENSE_CATEGORIES.find(c => c.value === exp?.category)?.label ?? 'Expense')

  const categoryText = (variant === 'simple' || variant === 'hustle')
    ? null
    : isIncome
      ? (inc?.hustle?.name ?? null)
      : (EXPENSE_CATEGORIES.find(c => c.value === exp?.category)?.label ?? 'Expense')

  const meta = getMeta(inc, variant)
  const ACTION_WIDTH = 120

  const rowContent = (
    <>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: isIncome ? 'rgba(134,244,241,0.3)' : 'var(--surface-container-high)',
          color: isIncome ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
        }}
      >
        {isIncome
          ? <ArrowUp className="w-4 h-4" strokeWidth={2} />
          : exp?.is_recurring
            ? <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            : <ArrowDown className="w-4 h-4" strokeWidth={2} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-[var(--on-surface)] truncate text-sm">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {hustleColorBadgesEnabled && isIncome && inc?.hustle?.color && categoryText && (
            <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: inc.hustle.color }} />
          )}
          <p className="font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] opacity-70">
            {categoryText ? `${categoryText} · ` : ''}{formatDate(entry.date, 'short')}
          </p>
        </div>
        {meta && (
          <p className="font-label text-[9px] uppercase tracking-[0.05rem] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>
            {meta}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <p
          className="font-headline font-bold text-sm tabular-nums"
          style={{ color: isIncome ? 'var(--secondary)' : 'var(--primary)' }}
        >
          {isIncome ? '+' : '−'}{formatCurrency(Number(entry.amount), 'USD', true)}
        </p>
        <p
          className="font-label text-[9px] uppercase tracking-[0.06rem] mt-0.5"
          style={{ color: isIncome ? 'var(--secondary)' : 'var(--expense)' }}
        >
          {isIncome ? 'Income' : 'Expense'}
        </p>
      </div>
    </>
  )

  if (!swipeEnabled) {
    return (
      <Link
        href={`/log/${entry.id}`}
        className="squircle bg-[var(--surface-container-lowest)] p-4 flex items-center gap-3 active:scale-[0.98] transition-transform shadow-[0_2px_12px_rgba(2,36,72,0.06)]"
      >
        {rowContent}
      </Link>
    )
  }

  return (
    <div
      className="relative overflow-hidden shadow-[0_2px_12px_rgba(2,36,72,0.06)]"
      style={{ borderRadius: '1.25rem' }}
    >
      {/* Action buttons revealed on swipe */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTION_WIDTH }}>
        <Link
          href={`/log/${entry.id}`}
          className="flex-1 flex flex-col items-center justify-center gap-1"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Pencil className="w-4 h-4 text-white" strokeWidth={1.5} />
          <span className="font-label text-[8px] uppercase tracking-widest text-white/80">Edit</span>
        </Link>
        <button
          onClick={() => { setSwiped(false); onDelete?.() }}
          className="flex-1 flex flex-col items-center justify-center gap-1"
          style={{ backgroundColor: 'var(--expense)' }}
        >
          <Trash2 className="w-4 h-4 text-white" strokeWidth={1.5} />
          <span className="font-label text-[8px] uppercase tracking-widest text-white/80">Delete</span>
        </button>
      </div>

      {/* Sliding main content */}
      <div
        className="squircle bg-[var(--surface-container-lowest)] p-4 flex items-center gap-3 relative z-10 transition-transform duration-200"
        style={{ transform: `translateX(${swiped ? -ACTION_WIDTH : 0}px)` }}
        onTouchStart={e => {
          touchStartX.current = e.touches[0].clientX
          touchStartY.current = e.touches[0].clientY
        }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStartX.current
          const dy = e.changedTouches[0].clientY - touchStartY.current
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
            if (swiped) setSwiped(false)
            else router.push(`/log/${entry.id}`)
          } else if (Math.abs(dx) > Math.abs(dy) * 0.7) {
            if (dx < -30) setSwiped(true)
            else if (dx > 20) setSwiped(false)
          }
        }}
      >
        {rowContent}
      </div>
    </div>
  )
}

// ── Desktop ────────────────────────────────────────────────────────────────

export function DesktopTransactionRow({ entry, variant = 'detailed' }: TransactionRowProps) {
  const isIncome = entry.entry_type === 'income'
  const inc = isIncome ? (entry as Inc) : null
  const exp = !isIncome ? (entry as Exp) : null

  const label = entry.description
    ?? (isIncome ? 'Income' : EXPENSE_CATEGORIES.find(c => c.value === exp?.category)?.label ?? 'Expense')

  // category column: hidden in simple and hustle variants
  const category = (variant === 'simple' || variant === 'hustle')
    ? null
    : isIncome
      ? (inc?.hustle?.name ?? 'Income')
      : (EXPENSE_CATEGORIES.find(c => c.value === exp?.category)?.label ?? 'Expense')

  const color = inc?.hustle?.color ?? (isIncome ? 'var(--secondary)' : 'var(--expense)')

  const date = new Date(entry.date + 'T00:00:00')
  const dayNum = date.getDate()
  const monthShort = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  const meta = getMeta(inc, variant)

  return (
    <Link
      href={`/log/${entry.id}`}
      className="group squircle bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-lowest)] px-5 py-4 flex items-center gap-4 transition-colors"
    >
      {/* Date */}
      <div className="w-12 text-center flex-shrink-0">
        <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">{monthShort}</p>
        <p className="font-headline font-bold text-lg leading-none text-[var(--on-surface)]">{dayNum}</p>
      </div>

      {/* Color dot — detailed only */}
      {variant === 'detailed' && (
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      )}

      {/* Category column — detailed only */}
      {variant === 'detailed' && (
        <div className="w-28 flex-shrink-0 min-w-0">
          {category && (
            <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] truncate">{category}</p>
          )}
        </div>
      )}

      {/* Label + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-headline font-semibold text-[var(--on-surface)] text-sm truncate">{label}</p>
        {meta && (
          <p className="font-label text-[10px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] opacity-60 mt-0.5">{meta}</p>
        )}
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <p
          className="font-headline font-bold text-sm tabular-nums"
          style={{ color: isIncome ? 'var(--secondary)' : 'var(--expense)' }}
        >
          {isIncome ? '+' : '−'}{formatCurrency(Number(entry.amount), 'USD', true)}
        </p>
      </div>

      {/* More button — detailed only */}
      {variant === 'detailed' && (
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface-container-high)]"
          onClick={e => e.preventDefault()}
        >
          <MoreHorizontal className="w-4 h-4 text-[var(--on-surface-variant)]" />
        </button>
      )}
    </Link>
  )
}

// ── Skeletons ──────────────────────────────────────────────────────────────

export function MobileTransactionRowSkeleton() {
  return (
    <div className="squircle bg-[var(--surface-container-lowest)] p-4 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-[var(--surface-container-high)] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-2.5 w-24 bg-[var(--surface-container)] rounded-full" />
      </div>
      <div className="h-3.5 w-14 bg-[var(--surface-container-high)] rounded-full" />
    </div>
  )
}

export function DesktopTransactionRowSkeleton() {
  return (
    <div className="squircle bg-[var(--surface-container-low)] px-5 py-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 flex-shrink-0 space-y-1.5">
        <div className="h-2 w-8 bg-[var(--surface-container-high)] rounded-full mx-auto" />
        <div className="h-4 w-6 bg-[var(--surface-container-high)] rounded-full mx-auto" />
      </div>
      <div className="w-2.5 h-2.5 rounded-full bg-[var(--surface-container-high)] flex-shrink-0" />
      <div className="w-28 h-3 bg-[var(--surface-container-high)] rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-48 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-2.5 w-32 bg-[var(--surface-container)] rounded-full" />
      </div>
      <div className="h-3.5 w-16 bg-[var(--surface-container-high)] rounded-full" />
    </div>
  )
}
