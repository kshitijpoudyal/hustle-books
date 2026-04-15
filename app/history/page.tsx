'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Download,
} from 'lucide-react'
import { useIncome } from '@/lib/hooks/use-income'
import { useExpenses } from '@/lib/hooks/use-expenses'
import { useHustles } from '@/lib/hooks/use-hustles'
import { formatCurrency, formatDate, formatMileage } from '@/lib/utils/formatters'
import type { IncomeEntry, ExpenseEntry } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

type TaggedIncome = IncomeEntry & { entry_type: 'income' }
type TaggedExpense = ExpenseEntry & { entry_type: 'expense' }
type AnyEntry = TaggedIncome | TaggedExpense

type TabType = 'all' | 'income' | 'expenses'
type DateRange = 'week' | 'month' | 'year' | 'all'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
}

const TAX_RATE_ESTIMATE = 0.25
const DESKTOP_PAGE_SIZE = 15
const MOBILE_PAGE_STEP = 8

// ── Date range helper ─────────────────────────────────────────────────────────

function getDateRange(range: DateRange): { date_from?: string; date_to?: string } {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const todayStr = fmt(today)
  if (range === 'all') return {}
  if (range === 'week') {
    const day = today.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)
    return { date_from: fmt(monday), date_to: todayStr }
  }
  if (range === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { date_from: fmt(first), date_to: todayStr }
  }
  const jan1 = new Date(today.getFullYear(), 0, 1)
  return { date_from: fmt(jan1), date_to: todayStr }
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function MobileCard({ entry }: { entry: AnyEntry }) {
  const isIncome = entry.entry_type === 'income'
  const expense = !isIncome ? (entry as TaggedExpense) : null
  const label = entry.description ?? (isIncome ? 'Income' : expense?.category ?? 'Expense')
  const category = isIncome
    ? ((entry as TaggedIncome).hustle?.name ?? 'Income')
    : expense?.category
      ? expense.category.charAt(0).toUpperCase() + expense.category.slice(1)
      : 'Expense'

  return (
    <Link
      href={`/log/${entry.id}`}
      className="squircle bg-[var(--surface-container-lowest)] p-4 flex items-center gap-3 active:scale-[0.98] transition-transform shadow-[0_2px_12px_rgba(2,36,72,0.06)]"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: isIncome ? 'rgba(134,244,241,0.3)' : 'var(--surface-container-high)',
          color: isIncome ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
        }}
      >
        {isIncome
          ? <ArrowUp className="w-4 h-4" strokeWidth={2} />
          : expense?.is_recurring
            ? <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            : <ArrowDown className="w-4 h-4" strokeWidth={2} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-[var(--on-surface)] truncate text-sm">{label}</p>
        <p className="font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] opacity-70 mt-0.5">
          {category} · {formatDate(entry.date, 'short')}
        </p>
        {isIncome && (entry as TaggedIncome).mileage && (entry as TaggedIncome).depreciation_cost_at_log != null && (entry as TaggedIncome).depreciation_cost_at_log! > 0 && (
          <p className="font-label text-[9px] uppercase tracking-[0.05rem] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>
            {formatMileage((entry as TaggedIncome).mileage!)} · {formatCurrency((entry as TaggedIncome).depreciation_cost_at_log!)} depr.
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
    </Link>
  )
}

function MobileCardSkeleton() {
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

// ── Desktop row ───────────────────────────────────────────────────────────────

function DesktopRow({ entry }: { entry: AnyEntry }) {
  const isIncome = entry.entry_type === 'income'
  const inc = isIncome ? (entry as TaggedIncome) : null
  const expense = !isIncome ? (entry as TaggedExpense) : null
  const label = entry.description ?? (isIncome ? 'Income' : expense?.category ?? 'Expense')
  const category = isIncome
    ? (inc?.hustle?.name ?? 'Income')
    : expense?.category
      ? expense.category.charAt(0).toUpperCase() + expense.category.slice(1)
      : 'Expense'
  const color = inc?.hustle?.color ?? (isIncome ? 'var(--secondary)' : 'var(--expense)')

  const date = new Date(entry.date + 'T00:00:00')
  const dayNum = date.getDate()
  const monthShort = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  let meta = ''
  if (inc?.mileage) {
    meta = formatMileage(inc.mileage)
    if (inc.fuel_cost_at_log) meta += ` · ~${formatCurrency(inc.fuel_cost_at_log)} fuel`
    if (inc.depreciation_cost_at_log && inc.depreciation_cost_at_log > 0) meta += ` · ${formatCurrency(inc.depreciation_cost_at_log)} depr.`
  } else if (expense?.is_recurring) {
    meta = 'Recurring'
  }

  return (
    <Link
      href={`/log/${entry.id}`}
      className="group squircle bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-lowest)] px-5 py-4 flex items-center gap-4 transition-colors"
    >
      <div className="w-12 text-center flex-shrink-0">
        <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">{monthShort}</p>
        <p className="font-headline font-bold text-lg leading-none text-[var(--on-surface)]">{dayNum}</p>
      </div>

      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

      <div className="w-28 flex-shrink-0 min-w-0">
        <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] truncate">{category}</p>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-headline font-semibold text-[var(--on-surface)] text-sm truncate">{label}</p>
        {meta && (
          <p className="font-label text-[10px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] opacity-60 mt-0.5">{meta}</p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <p
          className="font-headline font-bold text-sm tabular-nums"
          style={{ color: isIncome ? 'var(--secondary)' : 'var(--expense)' }}
        >
          {isIncome ? '+' : '−'}{formatCurrency(Number(entry.amount), 'USD', true)}
        </p>
      </div>

      <button
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface-container-high)]"
        onClick={e => e.preventDefault()}
      >
        <MoreHorizontal className="w-4 h-4 text-[var(--on-surface-variant)]" />
      </button>
    </Link>
  )
}

function DesktopRowSkeleton() {
  return (
    <div className="squircle bg-[var(--surface-container-low)] px-5 py-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 flex-shrink-0 space-y-1.5">
        <div className="h-2 w-8 bg-[var(--surface-container-high)] rounded-full mx-auto" />
        <div className="h-5 w-6 bg-[var(--surface-container-high)] rounded mx-auto" />
      </div>
      <div className="w-2.5 h-2.5 rounded-full bg-[var(--surface-container-high)] flex-shrink-0" />
      <div className="w-28 h-3 bg-[var(--surface-container-high)] rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-48 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-2 w-24 bg-[var(--surface-container)] rounded-full" />
      </div>
      <div className="h-3.5 w-16 bg-[var(--surface-container-high)] rounded-full flex-shrink-0" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [tab, setTab] = useState<TabType>('all')
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [hustleFilter, setHustleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [mobileVisible, setMobileVisible] = useState(MOBILE_PAGE_STEP)
  const [desktopPage, setDesktopPage] = useState(1)

  const { hustles } = useHustles()
  const { date_from, date_to } = getDateRange(dateRange)

  const incomeFilters = useMemo(() => ({
    hustle_id: hustleFilter || undefined,
    date_from,
    date_to,
  }), [hustleFilter, date_from, date_to])

  const expenseFilters = useMemo(() => ({
    hustle_id: hustleFilter || undefined,
    date_from,
    date_to,
  }), [hustleFilter, date_from, date_to])

  const { entries: incomeEntries, loading: incomeLoading } = useIncome(
    tab !== 'expenses' ? incomeFilters : undefined
  )
  const { entries: expenseEntries, loading: expenseLoading } = useExpenses(
    tab !== 'income' ? expenseFilters : undefined
  )

  const loading = (tab !== 'expenses' && incomeLoading) || (tab !== 'income' && expenseLoading)

  const merged = useMemo((): AnyEntry[] => {
    const inc: TaggedIncome[] = tab !== 'expenses'
      ? incomeEntries.map(e => ({ ...e, entry_type: 'income' as const }))
      : []
    const exp: TaggedExpense[] = tab !== 'income'
      ? expenseEntries.map(e => ({ ...e, entry_type: 'expense' as const }))
      : []
    const all = [...inc, ...exp].sort((a, b) => {
      const diff = b.date.localeCompare(a.date)
      return diff !== 0 ? diff : b.created_at.localeCompare(a.created_at)
    })
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter(e =>
      (e.description ?? '').toLowerCase().includes(q) ||
      (e.hustle?.name ?? '').toLowerCase().includes(q)
    )
  }, [tab, incomeEntries, expenseEntries, search])

  const totalIncome = useMemo(
    () => (tab !== 'expenses' ? incomeEntries : []).reduce((s, e) => s + Number(e.amount), 0),
    [tab, incomeEntries]
  )
  const totalExpenses = useMemo(
    () => (tab !== 'income' ? expenseEntries : []).reduce((s, e) => s + Number(e.amount), 0),
    [tab, expenseEntries]
  )
  const taxableIncome = useMemo(
    () => (tab !== 'expenses' ? incomeEntries : []).filter(e => e.is_taxable).reduce((s, e) => s + Number(e.amount), 0),
    [tab, incomeEntries]
  )
  const taxEst = taxableIncome * TAX_RATE_ESTIMATE
  const netProfit = totalIncome - totalExpenses - taxEst
  const activeHustles = hustles.filter(h => h.is_active).length

  // Desktop pagination (clamp page to valid range)
  const totalPages = Math.max(1, Math.ceil(merged.length / DESKTOP_PAGE_SIZE))
  const safePage = Math.min(desktopPage, totalPages)
  const desktopEntries = merged.slice((safePage - 1) * DESKTOP_PAGE_SIZE, safePage * DESKTOP_PAGE_SIZE)

  const grouped = useMemo(() => {
    const map = new Map<string, AnyEntry[]>()
    for (const e of desktopEntries) {
      const d = new Date(e.date + 'T00:00:00')
      const key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return map
  }, [desktopEntries])

  const mobileEntries = merged.slice(0, mobileVisible)

  function handleTabChange(t: TabType) {
    setTab(t)
    setMobileVisible(MOBILE_PAGE_STEP)
    setDesktopPage(1)
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">

      {/* ══════════════════ MOBILE ══════════════════ */}
      <div className="lg:hidden">

        {/* Sticky AppBar */}
        <div
          className="sticky top-0 z-20 px-4 pt-6 pb-3"
          style={{
            background: 'rgba(251,249,243,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <h1 className="font-headline font-bold text-xl text-[var(--primary)] mb-4">HustleBooks</h1>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--on-surface-variant)] opacity-50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions"
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--surface-container-highest)] font-label text-[10px] uppercase tracking-[0.08rem] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-50 focus:outline-none"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 p-1 bg-[var(--surface-container-low)] rounded-full">
            {(['all', 'income', 'expenses'] as TabType[]).map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`flex-1 py-1.5 rounded-full font-label text-[10px] uppercase tracking-[0.08rem] transition-colors ${
                  tab === t
                    ? 'bg-[var(--primary)] text-white font-semibold'
                    : 'text-[var(--on-surface-variant)] opacity-60'
                }`}
              >
                {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary bento */}
        <div className="px-4 pt-4 pb-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Net profit — dark card */}
            <div
              className="squircle relative overflow-hidden p-5 flex flex-col justify-between"
              style={{ backgroundColor: 'var(--primary-container)', minHeight: 160 }}
            >
              <div
                className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-25"
                style={{ backgroundColor: 'var(--secondary-container)', filter: 'blur(24px)' }}
              />
              <p className="font-label text-[9px] uppercase tracking-[0.08rem] text-white/60 relative z-10">
                Net Profit
              </p>
              <div className="relative z-10">
                <p className="font-headline font-black text-2xl leading-none text-white">
                  {formatCurrency(netProfit, 'USD', true)}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary-container)]" />
                  <span className="font-label text-[9px] uppercase tracking-[0.06rem] text-white/70">
                    {DATE_RANGE_LABELS[dateRange]}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: 2 small cards */}
            <div className="flex flex-col gap-3">
              <div className="squircle bg-[var(--surface-container-low)] p-4 flex-1 flex flex-col justify-between">
                <p className="font-label text-[9px] uppercase tracking-[0.08rem] text-[var(--on-surface-variant)]">
                  Active Hustles
                </p>
                <p className="font-headline font-black text-3xl text-[var(--primary)]">{activeHustles}</p>
              </div>
              <div className="squircle bg-[var(--surface-container-low)] p-4 flex-1 flex flex-col justify-between">
                <p className="font-label text-[9px] uppercase tracking-[0.08rem] text-[var(--on-surface-variant)]">
                  Tax Reserve
                </p>
                <p className="font-headline font-bold text-lg text-[var(--primary)]">
                  {formatCurrency(taxEst, 'USD', true)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Date range chips */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => { setDateRange(r); setMobileVisible(MOBILE_PAGE_STEP) }}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full font-label text-[10px] uppercase tracking-[0.06rem] transition-colors ${
                dateRange === r
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface-container-low)] text-[var(--on-surface-variant)]'
              }`}
            >
              {DATE_RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="px-4 pb-40 space-y-2.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <MobileCardSkeleton key={i} />)
          ) : merged.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)]">
                Nothing logged yet
              </p>
              <p className="text-xs text-[var(--on-surface-variant)] opacity-50 mt-1 mb-6">
                Tap Log to record your first entry
              </p>
              <Link
                href="/log"
                className="inline-block px-6 py-3 rounded-full font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                Log entry
              </Link>
            </div>
          ) : (
            <>
              {mobileEntries.map(entry => (
                <MobileCard key={`${entry.entry_type}-${entry.id}`} entry={entry} />
              ))}
              {mobileVisible < merged.length && (
                <button
                  onClick={() => setMobileVisible(v => v + MOBILE_PAGE_STEP)}
                  className="w-full py-3 rounded-full bg-[var(--surface-container-low)] font-label text-[10px] uppercase tracking-[0.08rem] text-[var(--on-surface-variant)] mt-1"
                >
                  Load More History
                </button>
              )}
            </>
          )}
        </div>

        {/* FAB */}
        <Link
          href="/log"
          className="fixed bottom-28 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_12px_32px_rgba(2,36,72,0.25)] z-30"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
        >
          <PlusCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
        </Link>
      </div>

      {/* ══════════════════ DESKTOP ══════════════════ */}
      <div className="hidden lg:block">

        {/* Sticky header */}
        <div
          className="top-0 z-20 px-8 pt-8 pb-4 flex items-center justify-between gap-6"
          style={{
            background: 'rgba(251,249,243,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--on-surface-variant)] opacity-50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[var(--surface-container-high)] font-label text-[10px] uppercase tracking-[0.08rem] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-50 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-8 pb-16 space-y-5 max-w-5xl">

          {/* Filter bar */}
          <div className="squircle bg-[var(--surface-container-low)] px-5 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 p-1 bg-[var(--surface-container)] rounded-full">
              {(['all', 'income', 'expenses'] as TabType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={`px-4 py-1.5 rounded-full font-label text-[10px] uppercase tracking-[0.08rem] transition-colors ${
                    tab === t
                      ? 'bg-[var(--primary)] text-white font-semibold'
                      : 'text-[var(--on-surface-variant)] opacity-60 hover:opacity-100'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
                </button>
              ))}
            </div>

            <select
              value={dateRange}
              onChange={e => { setDateRange(e.target.value as DateRange); setDesktopPage(1) }}
              className="bg-[var(--surface-container-high)] rounded-full px-4 py-1.5 font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] appearance-none cursor-pointer focus:outline-none"
            >
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => (
                <option key={r} value={r}>{DATE_RANGE_LABELS[r]}</option>
              ))}
            </select>

            <select
              value={hustleFilter}
              onChange={e => { setHustleFilter(e.target.value); setDesktopPage(1) }}
              className="bg-[var(--surface-container-high)] rounded-full px-4 py-1.5 font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] appearance-none cursor-pointer focus:outline-none"
            >
              <option value="">All Hustles</option>
              {hustles.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            {!loading && (
              <span className="ml-auto font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] opacity-60">
                {merged.length} {merged.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>

          {/* Summary stats bar */}
          <div
            className="squircle px-6 py-5 grid grid-cols-4 gap-6"
            style={{ backgroundColor: 'var(--primary-container)' }}
          >
            <div>
              <p className="font-label text-[9px] uppercase tracking-widest text-white/50">Net Income</p>
              <p className="font-headline font-black text-2xl text-white mt-1">
                {formatCurrency(totalIncome, 'USD', true)}
              </p>
            </div>
            <div>
              <p className="font-label text-[9px] uppercase tracking-widest text-white/50">Expenses</p>
              <p className="font-headline font-black text-2xl text-white mt-1">
                {formatCurrency(totalExpenses, 'USD', true)}
              </p>
            </div>
            <div>
              <p className="font-label text-[9px] uppercase tracking-widest text-white/50">Active Hustles</p>
              <p className="font-headline font-black text-2xl text-white mt-1">{activeHustles}</p>
            </div>
            <div>
              <p className="font-label text-[9px] uppercase tracking-widest text-white/50">Tax Est.</p>
              <p className="font-headline font-black text-2xl text-white mt-1">
                {formatCurrency(taxEst, 'USD', true)}
              </p>
            </div>
          </div>

          {/* Transaction list */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <DesktopRowSkeleton key={i} />)}
            </div>
          ) : merged.length === 0 ? (
            <div className="py-20 text-center squircle bg-[var(--surface-container-low)]">
              <p className="font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)]">
                No entries found
              </p>
              <p className="text-sm text-[var(--on-surface-variant)] opacity-50 mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([month, entries]) => (
                <div key={month}>
                  <div className="flex items-center gap-4 mb-3">
                    <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 whitespace-nowrap">
                      {month}
                    </p>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(2,36,72,0.08)' }} />
                  </div>
                  <div className="space-y-2">
                    {entries.map(entry => (
                      <DesktopRow key={`${entry.entry_type}-${entry.id}`} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && merged.length > DESKTOP_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <p className="font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] opacity-60">
                {(safePage - 1) * DESKTOP_PAGE_SIZE + 1}–{Math.min(safePage * DESKTOP_PAGE_SIZE, merged.length)} of {merged.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDesktopPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-8 h-8 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center text-[var(--on-surface-variant)] disabled:opacity-30 hover:bg-[var(--surface-container-high)] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center gap-2">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="font-label text-[10px] text-[var(--on-surface-variant)] opacity-40">…</span>
                      )}
                      <button
                        onClick={() => setDesktopPage(p)}
                        className={`w-8 h-8 rounded-full font-label text-[10px] transition-colors ${
                          p === safePage
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))
                }
                <button
                  onClick={() => setDesktopPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-8 h-8 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center text-[var(--on-surface-variant)] disabled:opacity-30 hover:bg-[var(--surface-container-high)] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Watermark */}
        <p
          className="fixed bottom-0 right-0 font-headline font-bold select-none pointer-events-none"
          style={{ fontSize: '12rem', lineHeight: 1, color: 'var(--primary)', opacity: 0.03 }}
        >
          ARCHIVE
        </p>
      </div>
    </div>
  )
}
