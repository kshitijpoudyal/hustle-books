'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp } from 'lucide-react'
import { useHustles } from '@/lib/hooks/use-hustles'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatters'
import { HUSTLE_COLORS, HUSTLE_ICONS, HUSTLE_CATEGORIES } from '@/lib/utils/constants'
import { HustleIcon } from '@/lib/utils/hustle-icons'
import type { HustleCategory } from '@/lib/utils/constants'
import { toast } from 'sonner'
import type { Hustle } from '@/lib/types'

// ── Per-hustle profits ────────────────────────────────────────────────────────

interface HustleProfit {
  hustle_id: string
  income: number
  expenses: number
}

function useAllTimeProfits(hustleIds: string[]): { profits: Record<string, HustleProfit>; loading: boolean } {
  const [profits, setProfits] = useState<Record<string, HustleProfit>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hustleIds.length === 0) { setLoading(false); return }
    async function load() {
      const supabase = createClient()
      const [incRes, expRes] = await Promise.all([
        supabase.from('income').select('hustle_id, amount').in('hustle_id', hustleIds),
        supabase.from('expenses').select('hustle_id, amount').in('hustle_id', hustleIds),
      ])
      const map: Record<string, HustleProfit> = {}
      for (const id of hustleIds) map[id] = { hustle_id: id, income: 0, expenses: 0 }
      for (const row of incRes.data ?? []) {
        if (row.hustle_id && map[row.hustle_id]) map[row.hustle_id].income += Number(row.amount)
      }
      for (const row of expRes.data ?? []) {
        if (row.hustle_id && map[row.hustle_id]) map[row.hustle_id].expenses += Number(row.amount)
      }
      setProfits(map)
      setLoading(false)
    }
    load()
  }, [hustleIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return { profits, loading }
}

// ── Category select ───────────────────────────────────────────────────────────

function CategorySelect({ value, onChange }: { value: HustleCategory | null; onChange: (v: HustleCategory | null) => void }) {
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

// ── Hustle form ───────────────────────────────────────────────────────────────

interface HustleFormProps {
  onSubmit: (data: { name: string; color: string; icon: string; category: HustleCategory | null }) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

function HustleForm({ onSubmit, onCancel, submitting }: HustleFormProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(HUSTLE_COLORS[0])
  const [icon, setIcon] = useState<string>(HUSTLE_ICONS[0])
  const [category, setCategory] = useState<HustleCategory | null>(null)
  const [nameError, setNameError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setNameError('Name is required'); return }
    setNameError('')
    await onSubmit({ name: name.trim(), color, icon, category })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="font-label text-[10px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase mb-2 block">
          Hustle Identity
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setNameError('') }}
          placeholder="e.g. DoorDash, Etsy Shop"
          className="w-full bg-[var(--surface-container-highest)] border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none text-[var(--primary)] font-medium placeholder:text-[var(--on-surface-variant)]/40"
        />
        {nameError && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--expense)' }}>{nameError}</p>
        )}
      </div>

      <div>
        <label className="font-label text-[10px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase mb-2 block">
          Category
        </label>
        <CategorySelect value={category} onChange={setCategory} />
      </div>

      <div>
        <label className="font-label text-[10px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase mb-3 block">
          Color Signature
        </label>
        <div className="flex gap-3 flex-wrap">
          {HUSTLE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-10 h-10 rounded-full transition-transform active:scale-90"
              style={{
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : 'none',
                outlineOffset: '3px',
                opacity: color === c ? 1 : 0.6,
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="font-label text-[10px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase mb-3 block">
          Asset Icon
        </label>
        <div className="grid grid-cols-6 gap-2">
          {HUSTLE_ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className="aspect-square rounded-2xl flex items-center justify-center transition-all"
              style={
                icon === ic
                  ? { backgroundColor: 'var(--primary)', color: 'white' }
                  : { backgroundColor: 'var(--surface-container)', color: 'var(--primary)' }
              }
            >
              <HustleIcon name={ic} size={18} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-5 rounded-full text-white font-label font-bold tracking-widest text-sm uppercase shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
      >
        {submitting ? 'Creating…' : 'Create Hustle'}
      </button>
    </form>
  )
}

// ── Mobile hustle card ────────────────────────────────────────────────────────

function MobileHustleCard({ hustle, income }: { hustle: Hustle; income: number }) {
  return (
    <Link
      href={`/hustles/${hustle.id}`}
      className="squircle bg-[var(--surface-container-low)] p-8 relative overflow-hidden group transition-all duration-300 hover:bg-[var(--surface-container)] block"
    >
      {/* Left color bar */}
      <div
        className="absolute top-0 left-0 w-2 h-full"
        style={{ backgroundColor: hustle.color }}
      />
      <div className="flex justify-between items-start mb-12">
        <div
          className="p-3 bg-[var(--surface-container-lowest)] rounded-full shadow-sm"
          style={{ color: hustle.color }}
        >
          <HustleIcon name={hustle.icon} size={18} strokeWidth={1.5} />
        </div>
        <span
          className="font-label text-[10px] px-3 py-1 rounded-full font-bold tracking-wider"
          style={
            hustle.is_active
              ? { backgroundColor: `${hustle.color}18`, color: hustle.color }
              : { backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
          }
        >
          {hustle.is_active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-[var(--primary)] mb-1 truncate">{hustle.name}</h3>
      <p className="font-label text-xs text-[var(--on-surface-variant)] uppercase tracking-widest">Total Revenue</p>
      <p className="text-3xl font-black text-[var(--primary)] mt-2">{formatCurrency(income, 'USD', true)}</p>
    </Link>
  )
}

// ── Desktop hustle card ───────────────────────────────────────────────────────

function DesktopHustleCard({ hustle, income }: { hustle: Hustle; income: number }) {
  return (
    <Link
      href={`/hustles/${hustle.id}`}
      className="squircle bg-[var(--surface-container-lowest)] overflow-hidden flex flex-col group hover:shadow-[0_32px_64px_-20px_rgba(2,36,72,0.1)] transition-all duration-500 cursor-pointer block"
    >
      {/* Top color bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: hustle.color }} />
      <div className="p-8 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${hustle.color}20`, color: hustle.color }}
          >
            <HustleIcon name={hustle.icon} size={20} strokeWidth={1.5} />
          </div>
          <span
            className="font-label text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider"
            style={
              hustle.is_active
                ? { backgroundColor: `${hustle.color}18`, color: hustle.color }
                : { backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }
            }
          >
            {hustle.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-[var(--primary)] mb-1 truncate">{hustle.name}</h3>
        <p className="text-[var(--on-surface-variant)] text-sm mb-6 font-label uppercase tracking-widest truncate">
          {hustle.category ? (HUSTLE_CATEGORIES.find(c => c.value === hustle.category)?.label ?? hustle.icon) : hustle.icon}
        </p>
        <div className="mt-auto">
          <span className="font-label text-[10px] uppercase text-[var(--on-surface-variant)]">Total Earned</span>
          <div className="text-2xl font-black text-[var(--primary)]">{formatCurrency(income, 'USD', true)}</div>
        </div>
      </div>
    </Link>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ desktop }: { desktop?: boolean }) {
  if (desktop) {
    return (
      <div className="squircle bg-[var(--surface-container-lowest)] overflow-hidden animate-pulse">
        <div className="h-1.5 bg-[var(--surface-container-high)]" />
        <div className="p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-container-high)]" />
          <div className="h-4 w-28 bg-[var(--surface-container-high)] rounded-full" />
          <div className="h-3 w-20 bg-[var(--surface-container)] rounded-full" />
          <div className="h-6 w-24 bg-[var(--surface-container-high)] rounded-full mt-6" />
        </div>
      </div>
    )
  }
  return (
    <div className="squircle bg-[var(--surface-container-low)] p-8 animate-pulse space-y-3">
      <div className="w-10 h-10 rounded-full bg-[var(--surface-container-high)]" />
      <div className="h-4 w-32 bg-[var(--surface-container-high)] rounded-full mt-10" />
      <div className="h-3 w-20 bg-[var(--surface-container)] rounded-full" />
      <div className="h-6 w-24 bg-[var(--surface-container-high)] rounded-full" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HustlesPage() {
  const { hustles, loading, createHustle, refresh } = useHustles()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const allIds = useMemo(() => hustles.map(h => h.id), [hustles])
  const { profits, loading: profitsLoading } = useAllTimeProfits(allIds)

  const totalIncome = useMemo(
    () => Object.values(profits).reduce((s, p) => s + p.income, 0),
    [profits]
  )
  const topHustle = useMemo(() => {
    if (hustles.length === 0) return null
    return hustles.reduce((best, h) => {
      const bestIncome = profits[best.id]?.income ?? 0
      const hIncome = profits[h.id]?.income ?? 0
      return hIncome > bestIncome ? h : best
    }, hustles[0])
  }, [hustles, profits])

  const topIncome = topHustle ? (profits[topHustle.id]?.income ?? 0) : 0
  const topPct = totalIncome > 0 ? Math.round((topIncome / totalIncome) * 100) : 0

  async function handleCreate(data: { name: string; color: string; icon: string; category: HustleCategory | null }) {
    setSubmitting(true)
    const ok = await createHustle(data)
    setSubmitting(false)
    if (ok) {
      toast.success('Hustle created!')
      setShowForm(false)
      refresh()
    }
  }

  const getIncome = (id: string) => profitsLoading ? 0 : (profits[id]?.income ?? 0)

  return (
    <div className="min-h-screen bg-[var(--surface)]">

      {/* ══════════════════ MOBILE ══════════════════ */}
      <div className="lg:hidden pb-40">

        <main className="px-6 pt-4 max-w-5xl mx-auto">
          <header className="mb-10">
            <h2 className="text-4xl font-black text-[var(--primary)] tracking-tight">Your Hustles</h2>
          </header>

          {loading ? (
            <div className="grid grid-cols-2 gap-6">
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : hustles.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)]">
                No hustles yet
              </p>
              <p className="text-sm text-[var(--on-surface-variant)] opacity-50 mt-1 mb-6">
                Create your first hustle to start tracking
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-block px-6 py-3 rounded-full font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                Add First Hustle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* Left column */}
              <div className="flex flex-col gap-6">
                {hustles.filter((_, i) => i % 2 === 0).map(h => (
                  <MobileHustleCard key={h.id} hustle={h} income={getIncome(h.id)} />
                ))}
              </div>
              {/* Right column — offset down */}
              <div className="flex flex-col gap-6 md:translate-y-10">
                {hustles.filter((_, i) => i % 2 === 1).map(h => (
                  <MobileHustleCard key={h.id} hustle={h} income={getIncome(h.id)} />
                ))}
                {/* Ghost card */}
                <button
                  onClick={() => setShowForm(true)}
                  className="squircle border-2 border-dashed bg-transparent p-8 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-[var(--surface-container-low)] transition-all duration-300 min-h-[240px]"
                  style={{ borderColor: 'rgba(196,198,207,0.3)' }}
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                    <Plus className="w-7 h-7 text-[var(--primary)]" strokeWidth={1.5} />
                  </div>
                  <p className="font-label text-sm font-bold tracking-widest text-[var(--primary)] uppercase">Add New Hustle</p>
                  <p className="text-[var(--on-surface-variant)] text-sm mt-2 font-medium">Expand your empire</p>
                </button>
              </div>
            </div>
          )}
        </main>

      </div>

      {/* ══════════════════ DESKTOP ══════════════════ */}
      <div className="hidden lg:block">
        <main className="pt-8 pb-12 px-12 min-h-screen">
          <div className="max-w-6xl mx-auto space-y-10">
            {/* Stats banner */}
            {!profitsLoading && hustles.length > 0 && (
              <section className="grid grid-cols-12 gap-6">
                <div className="col-span-8 p-8 bg-[var(--surface-container-low)] squircle flex justify-between items-end">
                  <div className="flex flex-col gap-4">
                    <span className="font-label text-xs uppercase tracking-widest text-[var(--on-secondary-container)]">
                      Total Portfolio Value
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black text-[var(--primary)] tracking-tighter">
                        {formatCurrency(totalIncome)}
                      </span>
                      <span className="text-[var(--secondary)] font-bold flex items-center text-sm gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
                        All time
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="font-label text-[10px] uppercase text-[var(--on-surface-variant)]">Hustles</span>
                      <span className="text-xl font-bold text-[var(--primary)]">{hustles.length}</span>
                    </div>
                  </div>
                </div>
                <div
                  className="col-span-4 p-8 squircle relative overflow-hidden"
                  style={{ backgroundColor: 'var(--primary-container)' }}
                >
                  <div className="relative z-10">
                    <span className="font-label text-xs uppercase tracking-widest text-white/60">High Performance</span>
                    <h3 className="text-2xl font-bold mt-2 text-white truncate">{topHustle?.name ?? '—'}</h3>
                    <p className="text-[var(--on-primary-container)] text-sm mt-1">
                      Driving {topPct}% of total revenue
                    </p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z" />
                    </svg>
                  </div>
                </div>
              </section>
            )}

            {/* Hustle grid */}
            {loading ? (
              <div className="grid grid-cols-4 gap-8">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} desktop />)}
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {hustles.map(h => (
                  <DesktopHustleCard key={h.id} hustle={h} income={getIncome(h.id)} />
                ))}
                {/* Ghost card */}
                <button
                  onClick={() => setShowForm(v => !v)}
                  className="bg-transparent squircle p-8 flex flex-col items-center justify-center gap-4 group hover:bg-[var(--surface-container-low)] transition-all duration-300 min-h-[320px]"
                  style={{ border: '2px dashed rgba(196,198,207,0.3)' }}
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center text-[var(--outline)] transition-transform group-hover:scale-110">
                    <Plus className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-[var(--primary)]">Add New Hustle</h3>
                    <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mt-1">
                      Scale your income
                    </p>
                  </div>
                </button>
              </section>
            )}

          </div>
        </main>
      </div>

      {/* ── New Hustle Modal (shared mobile + desktop) ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ backgroundColor: 'rgba(2,36,72,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div
            className="squircle w-full max-w-lg mx-4 mb-4 lg:mb-0 p-8 space-y-2 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-headline font-bold text-lg text-[var(--primary)]">New Hustle</p>
              <button
                onClick={() => setShowForm(false)}
                className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] hover:opacity-70"
              >
                Cancel
              </button>
            </div>
            <HustleForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              submitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  )
}
