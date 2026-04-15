'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatMileage } from '@/lib/utils/formatters'
import { EXPENSE_CATEGORIES, HUSTLE_COLORS, HUSTLE_ICONS } from '@/lib/utils/constants'
import { toast } from 'sonner'
import type { Hustle, IncomeEntry, ExpenseEntry } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

type TaggedIncome = IncomeEntry & { entry_type: 'income' }
type TaggedExpense = ExpenseEntry & { entry_type: 'expense' }
type AnyEntry = TaggedIncome | TaggedExpense

interface HustleStats {
  monthIncome: number
  monthExpenses: number
  allTimeIncome: number
  allTimeExpenses: number
  totalDepreciation: number
  totalMileage: number
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function currentMonthRange(): { from: string; to: string } {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return {
    from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: fmt(today),
  }
}

// ── Config form ───────────────────────────────────────────────────────────────

interface ConfigFormProps {
  name: string
  color: string
  icon: string
  saving: boolean
  onNameChange: (v: string) => void
  onColorChange: (v: string) => void
  onIconChange: (v: string) => void
  onSave: () => void
}

function ConfigForm({ name, color, icon, saving, onNameChange, onColorChange, onIconChange, onSave }: ConfigFormProps) {
  return (
    <div className="space-y-8">
      {/* Name */}
      <div>
        <label className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] block mb-2">
          Hustle Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className="w-full bg-transparent border-b-2 py-3 text-2xl font-bold focus:outline-none transition-colors text-[var(--primary)]"
          style={{ borderColor: 'var(--outline-variant)' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
        />
      </div>

      {/* Color */}
      <div>
        <label className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] block mb-4">
          Identity Tone
        </label>
        <div className="flex gap-3 flex-wrap">
          {HUSTLE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className="w-10 h-10 rounded-full transition-all active:scale-90"
              style={{
                backgroundColor: c,
                outline: color === c ? `4px solid ${c}` : 'none',
                outlineOffset: '3px',
                transform: color === c ? 'scale(1.1)' : 'scale(1)',
                opacity: color === c ? 1 : 0.65,
              }}
            />
          ))}
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] block mb-4">
          Symbol
        </label>
        <div className="grid grid-cols-4 gap-3">
          {HUSTLE_ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              onClick={() => onIconChange(ic)}
              className="aspect-square squircle flex items-center justify-center font-label text-[9px] uppercase font-bold tracking-wider transition-colors"
              style={
                icon === ic
                  ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }
                  : { backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
              }
            >
              {ic.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full py-4 rounded-full text-white font-label text-[10px] font-bold tracking-widest uppercase disabled:opacity-50 active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
      >
        {saving ? 'Saving…' : 'Save Configuration'}
      </button>
    </div>
  )
}

// ── Mobile entry row ──────────────────────────────────────────────────────────

function MobileEntryRow({ entry }: { entry: AnyEntry }) {
  const isIncome = entry.entry_type === 'income'
  const inc = isIncome ? (entry as TaggedIncome) : null
  const exp = !isIncome ? (entry as TaggedExpense) : null
  const label = entry.description
    ?? (isIncome ? 'Income' : EXPENSE_CATEGORIES.find(c => c.value === exp?.category)?.label ?? 'Expense')
  let meta = ''
  if (inc?.mileage) meta = `${formatMileage(inc.mileage)} Travelled`
  else if (exp?.is_recurring) meta = 'Recurring'
  else if (exp?.category) meta = exp.category.charAt(0).toUpperCase() + exp.category.slice(1)

  return (
    <Link
      href={`/log/${entry.id}`}
      className="group flex items-center justify-between p-6 hover:bg-[var(--surface-container-low)] transition-colors squircle"
    >
      <div className="flex items-center gap-6 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: isIncome ? 'var(--secondary)' : 'var(--expense)' }}
        />
        <div className="min-w-0">
          <p className="font-label text-xs uppercase tracking-widest text-[var(--on-surface-variant)]/60 mb-1">
            {formatDate(entry.date, 'short')}
          </p>
          <p className="text-base font-bold text-[var(--primary)] truncate">{label}</p>
          {meta && (
            <p className="font-label text-xs uppercase tracking-tighter text-[var(--on-surface-variant)] mt-0.5">{meta}</p>
          )}
          {inc?.depreciation_cost_at_log != null && inc.depreciation_cost_at_log > 0 && (
            <p className="font-label text-[9px] uppercase tracking-tighter text-[var(--on-surface-variant)] opacity-50 mt-0.5">
              {formatCurrency(inc.depreciation_cost_at_log)} depr.
            </p>
          )}
        </div>
      </div>
      <span
        className="text-lg font-black flex-shrink-0 ml-4"
        style={{ color: isIncome ? 'var(--secondary)' : 'var(--on-surface)' }}
      >
        {isIncome ? '+' : '−'}{formatCurrency(Number(entry.amount))}
      </span>
    </Link>
  )
}

// ── Desktop entry row ─────────────────────────────────────────────────────────

function DesktopEntryRow({ entry }: { entry: AnyEntry }) {
  const isIncome = entry.entry_type === 'income'
  const inc = isIncome ? (entry as TaggedIncome) : null
  const exp = !isIncome ? (entry as TaggedExpense) : null
  const label = entry.description
    ?? (isIncome ? 'Income' : EXPENSE_CATEGORIES.find(c => c.value === exp?.category)?.label ?? 'Expense')
  let meta = ''
  if (inc?.mileage) meta = `${formatMileage(inc.mileage)} Miles`
  else if (exp?.is_recurring) meta = 'Recurring'
  else if (exp?.category) meta = exp.category.charAt(0).toUpperCase() + exp.category.slice(1)

  const d = new Date(entry.date + 'T00:00:00')
  const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()

  return (
    <Link
      href={`/log/${entry.id}`}
      className="flex items-center justify-between p-6 rounded-2xl hover:bg-[var(--surface)] transition-all cursor-pointer"
    >
      <div className="flex items-center gap-6 min-w-0">
        <p className="font-label text-[10px] font-bold tracking-[0.1rem] text-[var(--primary)]/40 w-24 flex-shrink-0">
          {dateStr}
        </p>
        <div className="min-w-0">
          <h4 className="font-bold text-[var(--primary)] text-lg truncate">{label}</h4>
          <div className="flex gap-3 items-center mt-1 flex-wrap">
            <span
              className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full uppercase font-label flex-shrink-0"
              style={{
                backgroundColor: isIncome ? 'rgba(0,106,104,0.1)' : 'rgba(186,26,26,0.1)',
                color: isIncome ? 'var(--secondary)' : 'var(--expense)',
              }}
            >
              {isIncome ? 'Income' : 'Expense'}
            </span>
            {meta && (
              <span className="text-[var(--primary)]/40 text-[10px] font-label uppercase">{meta}</span>
            )}
            {inc?.depreciation_cost_at_log != null && inc.depreciation_cost_at_log > 0 && (
              <span className="text-[var(--on-surface-variant)] text-[10px] font-label uppercase opacity-50">
                {formatCurrency(inc.depreciation_cost_at_log)} depr.
              </span>
            )}
          </div>
        </div>
      </div>
      <p
        className="text-xl font-black flex-shrink-0 ml-4"
        style={{ color: isIncome ? 'var(--secondary)' : 'var(--expense)' }}
      >
        {isIncome ? '+' : '−'}{formatCurrency(Number(entry.amount))}
      </p>
    </Link>
  )
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-6 p-6 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-[var(--surface-container-high)] flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-48 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-2.5 w-24 bg-[var(--surface-container)] rounded-full" />
      </div>
      <div className="h-4 w-20 bg-[var(--surface-container-high)] rounded-full" />
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function HustleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [hustle, setHustle] = useState<Hustle | null>(null)
  const [entries, setEntries] = useState<AnyEntry[]>([])
  const [stats, setStats] = useState<HustleStats>({
    monthIncome: 0, monthExpenses: 0,
    allTimeIncome: 0, allTimeExpenses: 0,
    totalDepreciation: 0, totalMileage: 0,
  })
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>(HUSTLE_COLORS[0])
  const [editIcon, setEditIcon] = useState<string>(HUSTLE_ICONS[0])
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { from, to } = currentMonthRange()

    const [hustleRes, incomeRes, expensesRes, monthIncRes, monthExpRes] = await Promise.all([
      supabase.from('hustles').select('*').eq('id', id).single(),
      supabase.from('income').select('*').eq('hustle_id', id).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').eq('hustle_id', id).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('income').select('amount').eq('hustle_id', id).gte('date', from).lte('date', to),
      supabase.from('expenses').select('amount').eq('hustle_id', id).gte('date', from).lte('date', to),
    ])

    if (!hustleRes.data) { router.push('/hustles'); return }

    const h = hustleRes.data as Hustle
    setHustle(h)
    setEditName(h.name)
    setEditColor(h.color)
    setEditIcon(h.icon)

    const incomes: TaggedIncome[] = ((incomeRes.data ?? []) as IncomeEntry[]).map(e => ({ ...e, entry_type: 'income' as const }))
    const expenses: TaggedExpense[] = ((expensesRes.data ?? []) as ExpenseEntry[]).map(e => ({ ...e, entry_type: 'expense' as const }))

    const all = [...incomes, ...expenses].sort((a, b) => {
      const d = b.date.localeCompare(a.date)
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at)
    })

    setEntries(all)

    const monthInc = (monthIncRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    const monthExp = (monthExpRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    const allTimeInc = incomes.reduce((s, e) => s + Number(e.amount), 0)
    const allTimeExp = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalDepr = incomes.reduce((s, e) => s + Number(e.depreciation_cost_at_log ?? 0), 0)
    const totalMiles = incomes.reduce((s, e) => s + Number(e.mileage ?? 0), 0)

    setStats({ monthIncome: monthInc, monthExpenses: monthExp, allTimeIncome: allTimeInc, allTimeExpenses: allTimeExp, totalDepreciation: totalDepr, totalMileage: totalMiles })
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!editName.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('hustles').update({ name: editName.trim(), color: editColor, icon: editIcon }).eq('id', id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Hustle updated')
    await load()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('hustles').delete().eq('id', id)
    setDeleting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Hustle deleted')
    router.push('/hustles')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <div className="lg:hidden px-6 pb-32">
          <div className="h-14 w-64 bg-[var(--surface-container-high)] rounded-full animate-pulse mt-8 mb-12" />
          <div className="space-y-6 mb-12">
            {[1, 2, 3].map(i => <div key={i} className="squircle h-48 bg-[var(--surface-container-low)] animate-pulse" />)}
          </div>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
        <div className="hidden lg:flex ml-64 p-12 flex-col gap-8">
          <div className="h-20 w-96 bg-[var(--surface-container-high)] rounded-full animate-pulse" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="squircle h-48 bg-[var(--surface-container-low)] animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!hustle) return null

  const taxSetAside = stats.monthIncome * 0.25
  const netProfit = stats.monthIncome - stats.monthExpenses - taxSetAside
  const allTimeTax = stats.allTimeIncome * 0.25
  const allTimeNetProfit = stats.allTimeIncome - stats.allTimeExpenses - allTimeTax
  const todayStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">

      {/* ══════════════════════════════════════════════════════════════
          MOBILE  (lg:hidden)
      ══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* TopAppBar */}
        <nav
          className="sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <div className="flex items-center gap-3">
            <Link href="/hustles" className="text-[var(--primary)]">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
            <span className="text-xl font-black tracking-tighter text-[var(--primary)]">HUSTLEBOOKS</span>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-container-high)' }}
          >
            <span className="font-label text-xs font-bold text-[var(--primary)]">HB</span>
          </div>
        </nav>

        <main className="px-6 pb-32">

          {/* Title & Edit */}
          <section className="mt-8 mb-12 flex items-baseline justify-between gap-4">
            <h1
              className="text-4xl font-black tracking-tight font-headline truncate flex-1"
              style={{ color: 'var(--primary)' }}
            >
              {hustle.name}
            </h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="font-label text-sm uppercase tracking-widest font-bold border-b-2 pb-1 transition-all flex-shrink-0 disabled:opacity-50"
              style={{ color: 'var(--secondary)', borderColor: 'rgba(0,106,104,0.3)' }}
            >
              SAVE
            </button>
          </section>

          {/* Stats Cards */}
          <section className="grid grid-cols-1 gap-6 mb-12">
            <div className="squircle bg-[var(--surface-container-low)] p-8 flex flex-col justify-between h-48">
              <span className="font-label text-xs uppercase tracking-[0.1rem] text-[var(--on-surface-variant)] font-bold">Monthly Income</span>
              <div>
                <span className="text-4xl font-black text-[var(--primary)] tracking-tighter">{formatCurrency(stats.monthIncome)}</span>
                <p className="font-label text-xs text-[var(--on-surface-variant)]/70 mt-2 uppercase">Gross Revenue</p>
              </div>
            </div>

            <div className="squircle bg-[var(--surface-container-low)] p-8 flex flex-col justify-between h-48">
              <span className="font-label text-xs uppercase tracking-[0.1rem] text-[var(--on-surface-variant)] font-bold">Monthly Expenses</span>
              <div>
                <span className="text-4xl font-black tracking-tighter" style={{ color: 'var(--expense)' }}>
                  −{formatCurrency(stats.monthExpenses)}
                </span>
                <p className="font-label text-xs text-[var(--on-surface-variant)]/70 mt-2 uppercase">Operating Costs</p>
              </div>
            </div>

            <div
              className="squircle p-8 flex flex-col justify-between h-48"
              style={{ backgroundColor: 'rgba(0,106,104,0.05)', border: '1px solid rgba(0,106,104,0.05)' }}
            >
              <div className="flex justify-between items-start">
                <span className="font-label text-xs uppercase tracking-[0.1rem] text-[var(--secondary)] font-bold">Tax Set-aside</span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--secondary)' }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" />
                  <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <span className="text-4xl font-black text-[var(--secondary)] tracking-tighter">{formatCurrency(taxSetAside)}</span>
                <p className="font-label text-xs mt-2 uppercase" style={{ color: 'rgba(0,106,104,0.6)' }}>25% Estimated Tax</p>
              </div>
            </div>
          </section>

          {/* Summary Pivot */}
          <div className="mb-16 flex items-center gap-6 px-4">
            <div className="h-[2px] flex-grow bg-[var(--surface-container)]" />
            <div className="text-center">
              <span className="font-label text-xs uppercase tracking-widest block mb-1 text-[var(--on-surface-variant)]">
                Estimated Net Profit
              </span>
              <span className="text-4xl font-black tracking-tighter" style={{ color: 'var(--secondary)' }}>
                {formatCurrency(netProfit)}
              </span>
            </div>
            <div className="h-[2px] flex-grow bg-[var(--surface-container)]" />
          </div>

          <div className="grid grid-cols-1 gap-12">

            {/* Hustle Configuration */}
            <section>
              <div
                className="squircle p-8"
                style={{ backgroundColor: 'rgba(228,226,221,0.4)' }}
              >
                <h2 className="font-label text-sm uppercase tracking-widest text-[var(--primary)] font-bold mb-8">
                  Hustle Configuration
                </h2>
                <ConfigForm
                  name={editName}
                  color={editColor}
                  icon={editIcon}
                  saving={saving}
                  onNameChange={setEditName}
                  onColorChange={setEditColor}
                  onIconChange={setEditIcon}
                  onSave={handleSave}
                />
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold"
                  style={{ backgroundColor: 'rgba(186,26,26,0.08)', color: 'var(--expense)' }}
                >
                  Delete Hustle
                </button>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-[var(--primary)] tracking-tight font-headline">Recent Activity</h2>
                <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">All Time</span>
              </div>

              {entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">No entries yet</p>
                  <Link
                    href="/log"
                    className="mt-4 inline-block px-6 py-3 rounded-full font-label text-[10px] uppercase tracking-wider text-white"
                    style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
                  >
                    Log Entry
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {entries.slice(0, 10).map(e => (
                      <MobileEntryRow key={`${e.entry_type}-${e.id}`} entry={e} />
                    ))}
                  </div>
                  {entries.length > 10 && (
                    <div className="mt-8 flex justify-center">
                      <Link
                        href="/history"
                        className="squircle px-8 py-4 font-label text-xs uppercase tracking-widest font-bold hover:bg-[var(--surface-container-highest)] transition-colors"
                        style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--primary)' }}
                      >
                        View All Activity
                      </Link>
                    </div>
                  )}
                </>
              )}
            </section>

          </div>
        </main>

        {/* FAB */}
        <Link
          href="/log"
          className="fixed bottom-28 right-8 w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 text-white"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
            boxShadow: '0 32px 64px rgba(2,36,72,0.12)',
          }}
        >
          <Plus className="w-7 h-7" strokeWidth={2} />
        </Link>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP  (hidden lg:block)
      ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">

        {/* Side Nav */}
        <nav
          className="h-screen w-64 fixed left-0 top-0 flex flex-col py-8 z-40"
          style={{ backgroundColor: 'var(--surface-container-low)' }}
        >
          <div className="px-8 mb-8">
            <h1 className="font-black text-[var(--primary)] text-2xl tracking-tighter">LEGER_01</h1>
            <p
              className="font-label text-[10px] font-medium uppercase tracking-[0.1rem] mt-1"
              style={{ color: 'rgba(2,36,72,0.6)' }}
            >
              Hustle Status: {hustle.is_active ? 'Active' : 'Archived'}
            </p>
          </div>

          <div className="flex flex-col flex-grow">
            {[
              { href: '/', label: 'DASHBOARD' },
              { href: '/hustles', label: 'HUSTLES', active: true },
              { href: '/history', label: 'HISTORY' },
              { href: '/rates', label: 'RATES' },
              { href: '/settings', label: 'SETTINGS' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="pl-6 py-4 flex items-center gap-4 hover:bg-[var(--surface-container)] transition-all"
                style={{
                  color: item.active ? 'var(--primary)' : 'rgba(2,36,72,0.4)',
                  borderRight: item.active ? '4px solid var(--primary)' : '4px solid transparent',
                }}
              >
                <span className="font-label text-xs font-semibold tracking-[0.05rem]">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="px-6 mt-auto">
            <Link
              href="/log"
              className="block w-full py-4 rounded-full text-center text-white font-label text-xs font-bold tracking-[0.1rem] active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
                boxShadow: '0 32px 64px -12px rgba(2,36,72,0.08)',
              }}
            >
              NEW_ENTRY
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="ml-64 p-12 min-h-screen" style={{ backgroundColor: 'var(--surface)' }}>

          {/* Header */}
          <header className="flex justify-between items-end mb-16">
            <div className="flex items-center gap-6">
              <div
                className="w-20 h-20 squircle flex items-center justify-center"
                style={{ backgroundColor: `${hustle.color}18`, color: hustle.color }}
              >
                <span className="font-label text-2xl font-black">{hustle.icon.slice(0, 3).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-6xl font-black text-[var(--primary)] tracking-tight mb-2">{hustle.name}</h2>
                <div className="flex items-center gap-4">
                  <span
                    className="px-4 py-1 rounded-full text-white font-label text-[10px] font-bold tracking-widest uppercase"
                    style={{ backgroundColor: hustle.is_active ? 'var(--secondary)' : 'var(--on-surface-variant)' }}
                  >
                    {hustle.is_active ? 'Active Stream' : 'Archived'}
                  </span>
                  <div className="flex gap-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="font-label text-[10px] font-bold tracking-widest transition-colors hover:opacity-100 disabled:opacity-30"
                      style={{ color: 'rgba(2,36,72,0.6)' }}
                    >
                      {saving ? 'SAVING…' : 'SAVE'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="font-label text-[10px] font-bold tracking-widest transition-colors hover:opacity-100"
                      style={{ color: 'rgba(186,26,26,0.6)' }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-label text-[10px] tracking-[0.1rem] uppercase mb-1" style={{ color: 'rgba(2,36,72,0.4)' }}>
                Last Synced
              </p>
              <p className="text-[var(--primary)] font-bold">{todayStr}</p>
            </div>
          </header>

          {/* 4-col Financial Overview */}
          <section className="grid grid-cols-4 gap-6 mb-12">
            <div className="squircle bg-[var(--surface-container-low)] p-8 flex flex-col justify-between h-48">
              <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase" style={{ color: 'rgba(2,36,72,0.6)' }}>Net Profit</span>
              <p className="text-4xl font-black" style={{ color: 'var(--secondary)' }}>{formatCurrency(allTimeNetProfit)}</p>
            </div>
            <div className="squircle bg-[var(--surface-container-low)] p-8 flex flex-col justify-between h-48">
              <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase" style={{ color: 'rgba(2,36,72,0.6)' }}>Total Income</span>
              <p className="text-4xl font-black text-[var(--primary)]">{formatCurrency(stats.allTimeIncome)}</p>
            </div>
            <div className="squircle bg-[var(--surface-container-low)] p-8 flex flex-col justify-between h-48">
              <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase" style={{ color: 'rgba(2,36,72,0.6)' }}>Total Expenses</span>
              <p className="text-4xl font-black" style={{ color: 'var(--expense)' }}>{formatCurrency(stats.allTimeExpenses)}</p>
            </div>
            <div className="squircle bg-[var(--surface-container-low)] p-8 flex flex-col justify-between h-48">
              <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase" style={{ color: 'rgba(2,36,72,0.6)' }}>Estimated Taxes</span>
              <p className="text-4xl font-black text-[var(--primary)]">{formatCurrency(allTimeTax)}</p>
            </div>
          </section>

          {/* 12-col grid: Activity + Sidebar */}
          <div className="grid grid-cols-12 gap-8 items-start">

            {/* Recent Activity — 8-col */}
            <section className="col-span-8 bg-[var(--surface-container-low)] squircle p-8">
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-headline text-2xl font-bold text-[var(--primary)]">Recent Activity</h3>
                <Link
                  href="/history"
                  className="px-6 py-2 rounded-full font-label text-[10px] font-bold tracking-widest hover:bg-[var(--surface-container-highest)] transition-colors"
                  style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--primary)' }}
                >
                  VIEW ALL
                </Link>
              </div>

              {entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">No entries yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.slice(0, 8).map(e => (
                    <DesktopEntryRow key={`${e.entry_type}-${e.id}`} entry={e} />
                  ))}
                </div>
              )}
            </section>

            {/* Sidebar — 4-col */}
            <aside className="col-span-4 space-y-8">

              {/* Configuration panel */}
              <div className="squircle p-8" style={{ backgroundColor: 'var(--surface-container-high)' }}>
                <h3
                  className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase mb-6"
                  style={{ color: 'rgba(2,36,72,0.6)' }}
                >
                  Hustle Configuration
                </h3>
                <ConfigForm
                  name={editName}
                  color={editColor}
                  icon={editIcon}
                  saving={saving}
                  onNameChange={setEditName}
                  onColorChange={setEditColor}
                  onIconChange={setEditIcon}
                  onSave={handleSave}
                />
              </div>

              {/* Growth Pulse */}
              <div
                className="relative overflow-hidden squircle p-8 flex flex-col justify-end"
                style={{ backgroundColor: 'var(--primary-container)', minHeight: 240 }}
              >
                <div
                  className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full opacity-30 blur-3xl"
                  style={{ backgroundColor: 'var(--primary)' }}
                />
                <div
                  className="absolute -left-10 -top-10 w-40 h-40 rounded-full opacity-10 blur-2xl"
                  style={{ backgroundColor: '#69d8d5' }}
                />
                <div className="relative z-10">
                  <span className="font-label text-[10px] font-bold tracking-[0.1rem] uppercase mb-2 block text-white/60">
                    Growth Pulse
                  </span>
                  <h4 className="text-3xl font-black text-white leading-tight">
                    {allTimeNetProfit >= 0
                      ? <>{formatCurrency(allTimeNetProfit, 'USD', true)} profit<br />all time.</>
                      : <>Keep going!<br />You got this.</>}
                  </h4>
                  <p className="text-white/70 text-sm mt-3 font-medium">
                    {stats.totalMileage > 0
                      ? `${stats.totalMileage.toLocaleString()} miles · ${formatCurrency(stats.totalDepreciation)} vehicle depr.`
                      : 'Log income and expenses to track your hustle health.'}
                  </p>
                </div>
              </div>

            </aside>
          </div>

        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(2,36,72,0.4)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="squircle p-8 mx-4 max-w-sm w-full space-y-6"
            style={{ backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <div>
              <p className="font-headline font-bold text-lg text-[var(--primary)] mb-2">
                Delete {hustle.name}?
              </p>
              <p className="font-body text-sm text-[var(--on-surface-variant)]">
                This will permanently delete the hustle and all its entries. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-4 squircle font-label text-[10px] font-bold uppercase tracking-widest"
                style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-4 squircle font-label text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--expense)' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
