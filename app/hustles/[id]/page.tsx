'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreVertical, Pencil, Trash2, Zap, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatMileage } from '@/lib/utils/formatters'
import { calcTaxSetAside, calcNetProfit } from '@/lib/utils/calculations'
import { HUSTLE_COLORS, HUSTLE_ICONS, HUSTLE_CATEGORIES } from '@/lib/utils/constants'
import { HustleIcon } from '@/lib/utils/hustle-icons'
import { MobileTransactionRow, DesktopTransactionRow, MobileTransactionRowSkeleton } from '@/components/transaction-row'
import StatCard from '@/components/shared/stat-card'
import { useUserSettings } from '@/lib/context/user-settings-context'
import type { HustleCategory } from '@/lib/utils/constants'
import { toast } from 'sonner'
import type { Hustle, IncomeEntry, ExpenseEntry } from '@/lib/types'
import GoalsList from '@/components/goals/goals-list'
import { useFeatureFlags } from '@/lib/context/feature-flags-context'

// ── Types ────────────────────────────────────────────────────────────────────

// Fallback tax rate (25%) used when no rate snapshot is available on this page
const FALLBACK_TAX_RATE = 25

type TaggedIncome = IncomeEntry & { entry_type: 'income' }
type TaggedExpense = ExpenseEntry & { entry_type: 'expense' }
type AnyEntry = TaggedIncome | TaggedExpense

interface HustleStats {
  income: number
  taxableIncome: number
  expenses: number
  totalCogs: number
  totalDepreciation: number
  totalMileage: number
}

// ── Category picker ───────────────────────────────────────────────────────────

function CategoryPicker({ value, onChange }: { value: HustleCategory | null; onChange: (v: HustleCategory | null) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange((e.target.value as HustleCategory) || null)}
      className="w-full bg-[var(--surface-container-high)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none font-label text-sm appearance-none"
      style={{ color: value ? 'var(--primary)' : 'var(--on-surface-variant)', border: 'none' }}
    >
      <option value="">No category</option>
      {HUSTLE_CATEGORIES.map(cat => (
        <option key={cat.value} value={cat.value}>{cat.label}</option>
      ))}
    </select>
  )
}

// ── Config form ───────────────────────────────────────────────────────────────

interface ConfigFormProps {
  name: string
  color: string
  icon: string
  category: HustleCategory | null
  saving: boolean
  onNameChange: (v: string) => void
  onColorChange: (v: string) => void
  onIconChange: (v: string) => void
  onCategoryChange: (v: HustleCategory | null) => void
  onSave: () => void
}

function ConfigForm({ name, color, icon, category, saving, onNameChange, onColorChange, onIconChange, onCategoryChange, onSave }: ConfigFormProps) {
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

      {/* Category */}
      <div>
        <label className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] block mb-3">
          Category
        </label>
        <CategoryPicker value={category} onChange={onCategoryChange} />
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
              className="aspect-square squircle flex items-center justify-center transition-colors"
              style={
                icon === ic
                  ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }
                  : { backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
              }
            >
              <HustleIcon name={ic} size={20} strokeWidth={1.5} />
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

// ── Main page ────────────────────────────────────────────────────────────────

export default function HustleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [hustle, setHustle] = useState<Hustle | null>(null)
  const [entries, setEntries] = useState<AnyEntry[]>([])
  const [stats, setStats] = useState<HustleStats>({
    income: 0, taxableIncome: 0, expenses: 0, totalCogs: 0,
    totalDepreciation: 0, totalMileage: 0,
  })
  const [loading, setLoading] = useState(true)
  const { includeDeprInProfit, includeTaxInProfit } = useUserSettings()
  const { flag } = useFeatureFlags()
  const goalsEnabled = flag('GOAL_MILESTONES')

  // Edit state
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>(HUSTLE_COLORS[0])
  const [editIcon, setEditIcon] = useState<string>(HUSTLE_ICONS[0])
  const [editCategory, setEditCategory] = useState<HustleCategory | null>(null)
  const [saving, setSaving] = useState(false)

  // More menu + edit form
  const [showMore, setShowMore] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  // Status confirmation
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()

    const [hustleRes, incomeRes, expensesRes] = await Promise.all([
      supabase.from('hustles').select('*').eq('id', id).single(),
      supabase.from('income').select('*').eq('hustle_id', id).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').eq('hustle_id', id).order('date', { ascending: false }).order('created_at', { ascending: false }),
    ])

    if (!hustleRes.data) { router.push('/hustles'); return }

    const h = hustleRes.data as Hustle
    setHustle(h)
    setEditName(h.name)
    setEditColor(h.color)
    setEditIcon(h.icon)
    setEditCategory(h.category ?? null)

    const incomes: TaggedIncome[] = ((incomeRes.data ?? []) as IncomeEntry[]).map(e => ({ ...e, hustle: h, entry_type: 'income' as const }))
    const expenses: TaggedExpense[] = ((expensesRes.data ?? []) as ExpenseEntry[]).map(e => ({ ...e, entry_type: 'expense' as const }))

    const all = [...incomes, ...expenses].sort((a, b) => {
      const d = b.date.localeCompare(a.date)
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at)
    })

    setEntries(all)

    const totalInc = incomes.reduce((s, e) => s + Number(e.amount), 0)
    const totalTaxableInc = incomes.filter(e => e.is_taxable).reduce((s, e) => s + Number(e.amount), 0)
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalCogs = incomes.reduce((s, e) => s + Number(e.cogs ?? 0), 0)
    const totalDepr = incomes.reduce((s, e) => s + Number(e.depreciation_cost_at_log ?? 0), 0)
    const totalMiles = incomes.reduce((s, e) => s + Number(e.mileage ?? 0), 0)

    setStats({ income: totalInc, taxableIncome: totalTaxableInc, expenses: totalExp, totalCogs, totalDepreciation: totalDepr, totalMileage: totalMiles })
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!editName.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('hustles').update({ name: editName.trim(), color: editColor, icon: editIcon, category: editCategory }).eq('id', id)
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

  async function handleStatusChange() {
    if (!hustle) return
    setUpdatingStatus(true)
    const supabase = createClient()
    const { error } = await supabase.from('hustles').update({ is_active: !hustle.is_active }).eq('id', id)
    setUpdatingStatus(false)
    if (error) { toast.error(error.message); return }
    toast.success(hustle.is_active ? 'Hustle archived' : 'Hustle marked active')
    setShowStatusConfirm(false)
    await load()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <div className="lg:hidden px-6 pb-32">
          <div className="h-14 w-64 bg-[var(--surface-container-high)] rounded-full animate-pulse mt-8 mb-12" />
          <div className="space-y-6 mb-12">
            {[1, 2, 3].map(i => <div key={i} className="squircle h-48 bg-[var(--surface-container-low)] animate-pulse" />)}
          </div>
          {Array.from({ length: 5 }).map((_, i) => <MobileTransactionRowSkeleton key={i} />)}
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

  const taxSetAside = calcTaxSetAside(stats.taxableIncome, FALLBACK_TAX_RATE)
  const netProfit = calcNetProfit(stats.income, stats.expenses, includeTaxInProfit ? FALLBACK_TAX_RATE : 0, stats.totalCogs, stats.taxableIncome, includeDeprInProfit ? stats.totalDepreciation : 0)
  const todayStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">

      {/* ══════════════════════════════════════════════════════════════
          MOBILE  (lg:hidden)
      ══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        <main className="px-6 pb-32">

          {/* Title & More */}
          <section className="mt-8 mb-12 flex items-center justify-between gap-4">
            <h1
              className="text-4xl font-black tracking-tight font-headline truncate flex-1"
              style={{ color: 'var(--primary)' }}
            >
              {hustle.name}
            </h1>
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMore(prev => !prev)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--surface-container-high)' }}
              >
                <MoreVertical className="w-5 h-5 text-[var(--primary)]" strokeWidth={1.5} />
              </button>
              {showMore && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                  <div
                    className="absolute right-0 top-12 z-40 w-44 squircle overflow-hidden shadow-lg"
                    style={{ backgroundColor: 'var(--surface-container-lowest)', boxShadow: '0 12px 32px rgba(30,58,95,0.12)' }}
                  >
                    <button
                      onClick={() => { setShowEditForm(true); setShowMore(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-container-low)] transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-[var(--primary)]" strokeWidth={1.5} />
                      <span className="font-label text-sm text-[var(--primary)]">Edit hustle</span>
                    </button>
                    <button
                      onClick={() => { setShowStatusConfirm(true); setShowMore(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-container-low)] transition-colors"
                    >
                      {hustle.is_active
                        ? <Archive className="w-4 h-4 text-[var(--secondary)]" strokeWidth={1.5} />
                        : <Zap className="w-4 h-4 text-[var(--secondary)]" strokeWidth={1.5} />}
                      <span className="font-label text-sm text-[var(--secondary)]">
                        {hustle.is_active ? 'Archive hustle' : 'Mark active'}
                      </span>
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMore(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-container-low)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--expense)' }} strokeWidth={1.5} />
                      <span className="font-label text-sm" style={{ color: 'var(--expense)' }}>Delete hustle</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Stats Cards */}
          <section className="grid grid-cols-2 gap-3 mb-12">
            <StatCard
              label="Net Profit"
              value={formatCurrency(netProfit)}
              valueColor="var(--secondary)"
              mobileAspectSquare
              height="h-40"
            />
            {stats.income !== 0 && (
              <StatCard
                label="Total Income"
                value={formatCurrency(stats.income)}
                mobileAspectSquare
                height="h-40"
              />
            )}
            {stats.expenses !== 0 && (
              <StatCard
                label="Total Expenses"
                value={formatCurrency(stats.expenses)}
                valueColor="var(--expense)"
                mobileAspectSquare
                height="h-40"
              />
            )}
            {taxSetAside !== 0 && (
              <StatCard
                label="Est. Taxes"
                value={formatCurrency(taxSetAside)}
                mobileAspectSquare
                height="h-40"
              />
            )}
            {hustle.category === 'reselling_and_flipping' && stats.totalCogs !== 0 && (
              <StatCard
                label="Cost of Goods"
                value={formatCurrency(stats.totalCogs)}
                valueColor="var(--expense)"
                mobileAspectSquare
                height="h-40"
              />
            )}
            {stats.totalMileage > 0 && (
              <StatCard
                label="Depreciation"
                value={formatCurrency(stats.totalDepreciation)}
                sub={`${formatMileage(stats.totalMileage)} mi`}
                mobileAspectSquare
                height="h-40"
              />
            )}
          </section>

          <div className="grid grid-cols-1 gap-12">

            {/* Hustle Goals */}
            {goalsEnabled && <GoalsList hustleId={id} hustleColor={hustle.color} title="Hustle Goals" />}

            {/* Recent Activity */}
            <section>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-[var(--primary)] tracking-tight font-headline">All Transactions</h2>
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
                      <MobileTransactionRow key={`${e.entry_type}-${e.id}`} entry={e} variant="hustle" />
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
        <main className="p-12 min-h-screen" style={{ backgroundColor: 'var(--surface)' }}>

          {/* Header */}
          <header className="flex justify-between items-end mb-16">
            <div className="flex items-center gap-6">
              <div
                className="w-20 h-20 squircle flex items-center justify-center"
                style={{ backgroundColor: `${hustle.color}18`, color: hustle.color }}
              >
                <HustleIcon name={hustle.icon} size={36} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-6xl font-black text-[var(--primary)] tracking-tight mb-2">{hustle.name}</h2>
                <div className="flex items-center gap-4">
                  <span
                    className="flex items-center gap-1.5 px-4 py-1 rounded-full text-white font-label text-[10px] font-bold tracking-widest uppercase"
                    style={{ backgroundColor: hustle.is_active ? 'var(--secondary)' : 'var(--on-surface-variant)' }}
                  >
                    {hustle.is_active
                      ? <><Zap size={10} strokeWidth={2} /> Active Stream</>
                      : <><Archive size={10} strokeWidth={2} /> Archived</>}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setShowMore(prev => !prev)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'var(--surface-container-high)' }}
                    >
                      <MoreVertical className="w-4 h-4 text-[var(--primary)]" strokeWidth={1.5} />
                    </button>
                    {showMore && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                        <div
                          className="absolute left-0 top-11 z-40 w-44 squircle overflow-hidden"
                          style={{ backgroundColor: 'var(--surface-container-lowest)', boxShadow: '0 12px 32px rgba(30,58,95,0.12)' }}
                        >
                          <button
                            onClick={() => { setShowEditForm(prev => !prev); setShowMore(false) }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-container-low)] transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-[var(--primary)]" strokeWidth={1.5} />
                            <span className="font-label text-sm text-[var(--primary)]">Edit hustle</span>
                          </button>
                          <button
                            onClick={() => { setShowStatusConfirm(true); setShowMore(false) }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-container-low)] transition-colors"
                          >
                            {hustle.is_active
                              ? <Archive className="w-4 h-4 text-[var(--secondary)]" strokeWidth={1.5} />
                              : <Zap className="w-4 h-4 text-[var(--secondary)]" strokeWidth={1.5} />}
                            <span className="font-label text-sm text-[var(--secondary)]">
                              {hustle.is_active ? 'Archive hustle' : 'Mark active'}
                            </span>
                          </button>
                          <button
                            onClick={() => { setShowDeleteConfirm(true); setShowMore(false) }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-container-low)] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: 'var(--expense)' }} strokeWidth={1.5} />
                            <span className="font-label text-sm" style={{ color: 'var(--expense)' }}>Delete hustle</span>
                          </button>
                        </div>
                      </>
                    )}
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

          {/* Financial Overview */}
          {(() => {
            const showIncome = stats.income !== 0
            const showExpenses = stats.expenses !== 0
            const showTax = taxSetAside !== 0
            const showCogs = hustle.category === 'reselling_and_flipping' && stats.totalCogs !== 0
            const showDepr = stats.totalMileage > 0
            const cols = 1 + (showIncome ? 1 : 0) + (showExpenses ? 1 : 0) + (showTax ? 1 : 0) + (showCogs ? 1 : 0) + (showDepr ? 1 : 0)
            const lgCols: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }
            const lgColClass = lgCols[cols] ?? 'lg:grid-cols-4'
            return (
              <section className={`grid gap-6 mb-12 grid-cols-2 ${lgColClass}`}>
                <StatCard label="Net Profit" value={formatCurrency(netProfit)} valueColor="var(--secondary)" height="h-48" className="p-8" />
                {showIncome && <StatCard label="Total Income" value={formatCurrency(stats.income)} height="h-48" className="p-8" />}
                {showExpenses && <StatCard label="Total Expenses" value={formatCurrency(stats.expenses)} valueColor="var(--expense)" height="h-48" className="p-8" />}
                {showTax && <StatCard label="Estimated Taxes" value={formatCurrency(taxSetAside)} height="h-48" className="p-8" />}
                {showCogs && <StatCard label="Cost of Goods" value={formatCurrency(stats.totalCogs)} valueColor="var(--expense)" height="h-48" className="p-8" />}
                {showDepr && <StatCard label="Depreciation" value={formatCurrency(stats.totalDepreciation)} sub={`${formatMileage(stats.totalMileage)} mi`} height="h-48" className="p-8" />}
              </section>
            )
          })()}

          {/* 12-col grid: Activity + Sidebar */}
          <div className="grid grid-cols-12 gap-8 items-start">

            {/* Recent Activity — 8-col */}
            <section className="col-span-8 bg-[var(--surface-container-low)] squircle p-8">
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-headline text-2xl font-bold text-[var(--primary)]">All Transactions</h3>
              </div>

              {entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">No entries yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.slice(0, 8).map(e => (
                    <DesktopTransactionRow key={`${e.entry_type}-${e.id}`} entry={e} variant="hustle" />
                  ))}
                </div>
              )}
            </section>

            {/* Sidebar — 4-col */}
            <aside className="col-span-4 space-y-8">

              {/* Hustle Goals */}
              {goalsEnabled && <GoalsList hustleId={id} hustleColor={hustle.color} title="Hustle Goals" />}

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
                    {netProfit >= 0
                      ? <>{formatCurrency(netProfit, 'USD', true)} profit<br />all time.</>
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

      {/* Edit Hustle Modal */}
      {showEditForm && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ backgroundColor: 'rgba(2,36,72,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditForm(false) }}
        >
          <div
            className="squircle w-full max-w-lg mx-4 mb-4 lg:mb-0 p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <div className="flex items-center justify-between">
              <p className="font-headline font-bold text-lg text-[var(--primary)]">Edit Hustle</p>
              <button
                onClick={() => setShowEditForm(false)}
                className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] hover:opacity-70"
              >
                Cancel
              </button>
            </div>
            <ConfigForm
              name={editName}
              color={editColor}
              icon={editIcon}
              category={editCategory}
              saving={saving}
              onNameChange={setEditName}
              onColorChange={setEditColor}
              onIconChange={setEditIcon}
              onCategoryChange={setEditCategory}
              onSave={async () => { await handleSave(); setShowEditForm(false) }}
            />
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {showStatusConfirm && (
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
                {hustle.is_active ? 'Archive hustle?' : 'Mark as active?'}
              </p>
              <p className="font-body text-sm text-[var(--on-surface-variant)]">
                {hustle.is_active
                  ? `${hustle.name} will be marked as inactive. Your existing entries won't be affected.`
                  : `${hustle.name} will be marked as active and appear in your dashboard.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStatusConfirm(false)}
                className="flex-1 py-4 squircle font-label text-[10px] font-bold uppercase tracking-widest"
                style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={updatingStatus}
                className="flex-1 py-4 squircle font-label text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: hustle.is_active ? 'var(--on-surface-variant)' : 'var(--secondary)' }}
              >
                {hustle.is_active
                  ? <><Archive size={12} strokeWidth={2} />{updatingStatus ? 'Saving…' : 'Archive'}</>
                  : <><Zap size={12} strokeWidth={2} />{updatingStatus ? 'Saving…' : 'Mark Active'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

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
