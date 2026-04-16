'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  BookOpen,
  User,
  SlidersHorizontal,
  ChevronDown,
  Check,
} from 'lucide-react'
import { useIncome } from '@/lib/hooks/use-income'
import { useExpenses } from '@/lib/hooks/use-expenses'
import { useHustles } from '@/lib/hooks/use-hustles'
import { formatCurrency } from '@/lib/utils/formatters'
import { MobileTransactionRow, DesktopTransactionRow, MobileTransactionRowSkeleton, DesktopTransactionRowSkeleton } from '@/components/transaction-row'
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

// ── Custom Dropdown ───────────────────────────────────────────────────────────

interface DropdownOption { value: string; label: string }

interface CustomDropdownProps {
  value: string
  options: DropdownOption[]
  onChange: (v: string) => void
  defaultValue?: string
  fullWidth?: boolean
  alignRight?: boolean
}

function CustomDropdown({ value, options, onChange, defaultValue = '', fullWidth = false, alignRight = false }: CustomDropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  const isActive = value !== defaultValue

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-label text-[10px] uppercase tracking-widest transition-all ${
          fullWidth ? 'w-full justify-between' : ''
        } ${
          isActive
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)]'
        }`}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-[calc(100%+8px)] z-50 py-2 min-w-[160px] ${fullWidth ? 'w-full left-0' : alignRight ? 'right-0' : 'left-0'}`}
            style={{
              backgroundColor: 'var(--surface-container-lowest)',
              borderRadius: '1.25rem',
              boxShadow: '0 12px 32px rgba(30,58,95,0.14)',
            }}
          >
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--surface-container-low)] transition-colors first:rounded-t-[1.25rem] last:rounded-b-[1.25rem]"
              >
                <span
                  className="font-label text-[10px] uppercase tracking-widest"
                  style={{ color: opt.value === value ? 'var(--primary)' : 'var(--on-surface-variant)' }}
                >
                  {opt.label}
                </span>
                {opt.value === value && (
                  <Check className="w-3.5 h-3.5 text-[var(--secondary)]" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [tab, setTab] = useState<TabType>('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [hustleFilter, setHustleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
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

  const isFiltered = tab !== 'all' || dateRange !== 'all' || !!hustleFilter

  // Desktop pagination
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

  // Dropdown option arrays
  const dateOptions: DropdownOption[] = (Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => ({
    value: r,
    label: DATE_RANGE_LABELS[r],
  }))
  const hustleOptions: DropdownOption[] = [
    { value: '', label: 'All Hustles' },
    ...hustles.map(h => ({ value: h.id, label: h.name })),
  ]

  return (
    <div className="min-h-screen bg-[var(--surface)]">

      {/* ══════════════════ MOBILE ══════════════════ */}
      <div className="lg:hidden pb-40">

        {/* Sticky AppBar */}
        <header
          className="sticky top-0 z-20 flex justify-between items-center px-6 py-4"
          style={{
            background: 'rgba(251,249,243,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[var(--primary)]" strokeWidth={2} />
            <h1 className="font-headline font-black text-xl tracking-tight text-[var(--primary)]">
              HustleBooks
            </h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[var(--surface-container-high)] flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
        </header>

        <div className="px-4 pt-4 space-y-5">

          {/* ── Section 1: Summary ── */}
          <section className="grid grid-cols-2 gap-3">
            <div
              className="squircle relative overflow-hidden p-5 flex flex-col justify-between row-span-2"
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

            <div className="squircle bg-[var(--surface-container-low)] p-4 flex flex-col justify-between">
              <p className="font-label text-[9px] uppercase tracking-[0.08rem] text-[var(--on-surface-variant)]">
                Active Hustles
              </p>
              <p className="font-headline font-black text-3xl text-[var(--primary)]">{activeHustles}</p>
            </div>

            <div className="squircle bg-[var(--surface-container-low)] p-4 flex flex-col justify-between">
              <p className="font-label text-[9px] uppercase tracking-[0.08rem] text-[var(--on-surface-variant)]">
                Tax Reserve
              </p>
              <p className="font-headline font-bold text-lg text-[var(--primary)]">
                {formatCurrency(taxEst, 'USD', true)}
              </p>
            </div>
          </section>

          {/* ── Section 2: Search + Filters ── */}
          <section className="space-y-3">

            {/* Search bar + filter toggle */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--on-surface-variant)] opacity-40" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search transactions…"
                  className="w-full pl-12 pr-4 py-3.5 rounded-full bg-[var(--surface-container-high)] font-body text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <button
                onClick={() => setShowFilters(v => !v)}
                className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  backgroundColor: showFilters || isFiltered ? 'var(--primary)' : 'var(--surface-container-high)',
                  color: showFilters || isFiltered ? 'white' : 'var(--on-surface-variant)',
                }}
              >
                <SlidersHorizontal className="w-4.5 h-4.5" strokeWidth={1.75} style={{ width: 18, height: 18 }} />
                {isFiltered && !showFilters && (
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--secondary)' }}
                  />
                )}
              </button>
            </div>

            {/* Expandable filter panel */}
            {showFilters && (
              <div
                className="squircle p-4 space-y-4"
                style={{ backgroundColor: 'var(--surface-container-low)' }}
              >
                {/* Type segmented control */}
                <div>
                  <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mb-2">
                    Type
                  </p>
                  <div className="flex gap-1.5 p-1 bg-[var(--surface-container)] rounded-full">
                    {(['all', 'income', 'expenses'] as TabType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => handleTabChange(t)}
                        className={`flex-1 py-2 rounded-full font-label text-[10px] uppercase tracking-[0.08rem] transition-colors ${
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

                {/* Date range chips */}
                <div>
                  <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mb-2">
                    Date Range
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => (
                      <button
                        key={r}
                        onClick={() => { setDateRange(r); setMobileVisible(MOBILE_PAGE_STEP) }}
                        className={`px-3.5 py-1.5 rounded-full font-label text-[10px] uppercase tracking-[0.06rem] transition-colors ${
                          dateRange === r
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]'
                        }`}
                      >
                        {DATE_RANGE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hustle dropdown */}
                {hustles.length > 0 && (
                  <div>
                    <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mb-2">
                      Hustle
                    </p>
                    <CustomDropdown
                      value={hustleFilter}
                      options={hustleOptions}
                      onChange={v => { setHustleFilter(v); setMobileVisible(MOBILE_PAGE_STEP) }}
                      defaultValue=""
                      fullWidth
                    />
                  </div>
                )}
              </div>
            )}

          </section>

          {/* ── Section 3: Transaction list ── */}
          <section className="space-y-2.5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <MobileTransactionRowSkeleton key={i} />)
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
                  <MobileTransactionRow key={`${entry.entry_type}-${entry.id}`} entry={entry} variant="detailed" />
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
          </section>

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
      <div className="hidden lg:block px-8 pb-16">

        {/* Page Header */}
        <div className="flex items-end justify-between pt-10 mb-10">
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mb-2">
              Transaction Archive
            </p>
            <h1 className="font-headline font-black text-5xl text-[var(--primary)] tracking-tight">
              History
            </h1>
          </div>
          {!loading && (
            <span
              className="squircle px-5 py-2 font-label text-[10px] uppercase tracking-widest"
              style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}
            >
              {merged.length} {merged.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {/* ── Section 1: Summary ── */}
        <section className="grid grid-cols-4 gap-6 mb-8">
          <div className="squircle bg-[var(--surface-container-low)] p-8 h-32 flex flex-col justify-between">
            <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase text-[var(--on-surface-variant)]">Net Profit</span>
            <p className="font-headline font-black text-3xl" style={{ color: 'var(--secondary)' }}>
              {formatCurrency(netProfit, 'USD', true)}
            </p>
          </div>
          <div className="squircle bg-[var(--surface-container-low)] p-8 h-32 flex flex-col justify-between">
            <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase text-[var(--on-surface-variant)]">Total Income</span>
            <p className="font-headline font-black text-3xl text-[var(--primary)]">
              {formatCurrency(totalIncome, 'USD', true)}
            </p>
          </div>
          <div className="squircle bg-[var(--surface-container-low)] p-8 h-32 flex flex-col justify-between">
            <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase text-[var(--on-surface-variant)]">Total Expenses</span>
            <p className="font-headline font-black text-3xl" style={{ color: 'var(--expense)' }}>
              {formatCurrency(totalExpenses, 'USD', true)}
            </p>
          </div>
          <div className="squircle bg-[var(--surface-container-low)] p-8 h-32 flex flex-col justify-between">
            <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase text-[var(--on-surface-variant)]">Tax Estimate</span>
            <p className="font-headline font-black text-3xl text-[var(--primary)]">
              {formatCurrency(taxEst, 'USD', true)}
            </p>
          </div>
        </section>

        {/* ── Section 2: Unified search + filter card ── */}
        <section
          className="squircle mb-8"
          style={{ backgroundColor: 'var(--surface-container-low)' }}
        >
          {/* Row 1: Search */}
          <div className="relative">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--on-surface-variant)] opacity-40"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="w-full pl-16 pr-6 py-5 bg-transparent font-body text-base text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-40 focus:outline-none rounded-t-[2rem]"
            />
          </div>

          {/* Divider */}
          <div className="mx-6 h-px" style={{ backgroundColor: 'rgba(2,36,72,0.06)' }} />

          {/* Row 2: Filters */}
          <div className="px-5 py-3.5 flex items-center gap-3">

            {/* Type segmented control */}
            <div className="flex gap-0.5 p-1 bg-[var(--surface-container)] rounded-full">
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

            {/* Date range dropdown */}
            <CustomDropdown
              value={dateRange}
              options={dateOptions}
              onChange={v => { setDateRange(v as DateRange); setDesktopPage(1) }}
              defaultValue="all"
              alignRight={false}
            />

            {/* Hustle dropdown */}
            <CustomDropdown
              value={hustleFilter}
              options={hustleOptions}
              onChange={v => { setHustleFilter(v); setDesktopPage(1) }}
              defaultValue=""
              alignRight={false}
            />

            {/* Entry count */}
            {!loading && (
              <span className="ml-auto font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] opacity-60">
                {merged.length} {merged.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
        </section>

        {/* ── Section 3: Transaction list ── */}
        <section>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <DesktopTransactionRowSkeleton key={i} />)}
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
                      <DesktopTransactionRow key={`${entry.entry_type}-${entry.id}`} entry={entry} variant="detailed" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && merged.length > DESKTOP_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-6">
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
        </section>

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
