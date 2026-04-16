'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, ArrowRight, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useHustles } from '@/lib/hooks/use-hustles'
import { useIncome } from '@/lib/hooks/use-income'
import { useExpenses } from '@/lib/hooks/use-expenses'
import { useRates } from '@/lib/hooks/use-rates'
import { resolveSnapshot } from '@/lib/utils/rate-resolver'
import { calcFuelCost, calcDepreciationCost } from '@/lib/utils/calculations'
import { formatCurrency, formatGasPrice, formatMpg } from '@/lib/utils/formatters'
import { EXPENSE_CATEGORIES, IRS_MILEAGE_RATE_DEFAULT } from '@/lib/utils/constants'
import type { ExpenseEntry } from '@/lib/types'

type Tab = 'income' | 'expense'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function ChevronDown() {
  return (
    <svg width="14" height="9" viewBox="0 0 14 9" fill="none" className="pointer-events-none flex-shrink-0">
      <path d="M1 1l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function LogPage() {
  const { hustles, loading: hustlesLoading } = useHustles()
  const { createIncome } = useIncome()
  const { createExpense } = useExpenses()
  const { snapshots, loading: ratesLoading } = useRates()

  const [tab, setTab] = useState<Tab>('income')
  const [submitting, setSubmitting] = useState(false)

  // Income state
  const [incomeHustleId, setIncomeHustleId] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeCogs, setIncomeCogs] = useState('')
  const [incomeDesc, setIncomeDesc] = useState('')
  const [incomeMileage, setIncomeMileage] = useState('')
  const [incomeDate, setIncomeDate] = useState(todayStr())

  const [incomeTaxable, setIncomeTaxable] = useState(true)

  // Expense state
  const [expenseHustleId, setExpenseHustleId] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseEntry['category']>('fuel')
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseRecurring, setExpenseRecurring] = useState(false)
  const [expenseDate, setExpenseDate] = useState(todayStr())
  const [hasMileageOnDate, setHasMileageOnDate] = useState(false)

  // Check if any income entry on the same date already has mileage tracked
  useEffect(() => {
    if (expenseCategory !== 'fuel' || !expenseDate) {
      setHasMileageOnDate(false)
      return
    }
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('income')
      .select('id')
      .eq('date', expenseDate)
      .gt('mileage', 0)
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setHasMileageOnDate((data?.length ?? 0) > 0)
      })
    return () => { cancelled = true }
  }, [expenseCategory, expenseDate])

  const ratePreview = useMemo(() => {
    const miles = parseFloat(incomeMileage)
    if (!miles || miles <= 0 || ratesLoading) return null
    const snapshot = resolveSnapshot(snapshots, new Date(incomeDate + 'T00:00:00'))
    if (!snapshot) return null
    return {
      snapshot,
      fuelCost: calcFuelCost(miles, snapshot),
      deprCost: calcDepreciationCost(miles, snapshot),
    }
  }, [incomeMileage, incomeDate, snapshots, ratesLoading])

  function resetIncomeForm() {
    setIncomeHustleId(''); setIncomeAmount(''); setIncomeCogs(''); setIncomeDesc('')
    setIncomeMileage(''); setIncomeDate(todayStr()); setIncomeTaxable(true)
  }
  function resetExpenseForm() {
    setExpenseHustleId(''); setExpenseAmount(''); setExpenseCategory('fuel')
    setExpenseDesc(''); setExpenseRecurring(false); setExpenseDate(todayStr())
  }

  async function doSubmitIncome() {
    if (!incomeHustleId) { toast.error('Please select a hustle.'); return }
    const amount = parseFloat(incomeAmount)
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount.'); return }
    setSubmitting(true)
    const miles = parseFloat(incomeMileage) || undefined
    const cogs = isReselling ? (parseFloat(incomeCogs) || undefined) : undefined
    const ok = await createIncome({
      hustle_id: incomeHustleId, amount,
      description: incomeDesc.trim() || undefined,
      mileage: miles, cogs, date: incomeDate, mileage_method: 'actual',
      is_taxable: incomeTaxable,
    })
    setSubmitting(false)
    if (ok) { toast.success('Income logged!'); resetIncomeForm() }
  }

  async function doSubmitExpense() {
    const amount = parseFloat(expenseAmount)
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount.'); return }
    setSubmitting(true)
    const ok = await createExpense({
      hustle_id: expenseHustleId || null, amount, category: expenseCategory,
      description: expenseDesc.trim() || undefined,
      is_recurring: expenseRecurring, date: expenseDate,
    })
    setSubmitting(false)
    if (ok) { toast.success('Expense logged!'); resetExpenseForm() }
  }

  function handleIncomeSubmit(e: React.FormEvent) { e.preventDefault(); doSubmitIncome() }
  function handleExpenseSubmit(e: React.FormEvent) { e.preventDefault(); doSubmitExpense() }

  const activeHustles = hustles.filter(h => h.is_active)
  const selectedHustle = useMemo(
    () => activeHustles.find(h => h.id === incomeHustleId) ?? null,
    [incomeHustleId, activeHustles]
  )
  const isReselling = selectedHustle?.category === 'reselling_and_flipping'

  // Shared label style
  const labelCls = 'font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)] mb-2 block'
  // Bare input inside squircle card (no border, transparent bg)
  const bareInput = 'bg-transparent w-full border-none p-0 focus:ring-0 focus:outline-none text-[var(--primary)] font-headline font-bold'

  return (
    <div className="min-h-screen bg-[var(--surface)]">

      {/* ══════════════════ MOBILE ══════════════════ */}
      <div className="lg:hidden pb-32 overflow-x-hidden">

        {/* Fixed AppBar */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: 'var(--surface)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <h1 className="font-headline font-black text-2xl tracking-tight text-[var(--primary)]">HustleBooks</h1>
        </header>

        <main className="mt-20 px-6 max-w-lg mx-auto">

          {/* Segment Toggle */}
          <div className="flex p-1 bg-[var(--surface-container)] rounded-full mb-8">
            {(['income', 'expense'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 px-6 rounded-full font-headline font-bold transition-all duration-300 ${
                  tab === t
                    ? 'bg-[var(--surface-container-lowest)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--on-surface-variant)] font-medium'
                }`}
              >
                {t === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>

          {/* ── INCOME FORM ── */}
          {tab === 'income' && (
            <form onSubmit={handleIncomeSubmit} className="space-y-6">

              {/* Hustle selector */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Select Hustle</label>
                {hustlesLoading ? (
                  <div className="h-6 w-36 bg-[var(--surface-container-high)] rounded-full animate-pulse" />
                ) : activeHustles.length === 0 ? (
                  <Link href="/hustles" className="text-sm text-[var(--secondary)] font-semibold">
                    Create a hustle first →
                  </Link>
                ) : (
                  <div className="relative flex items-center">
                    <select
                      value={incomeHustleId}
                      onChange={e => setIncomeHustleId(e.target.value)}
                      required
                      className={`${bareInput} pr-5 cursor-pointer appearance-none`}
                    >
                      <option value="">Choose hustle…</option>
                      {activeHustles.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                    <span className="absolute right-0 text-[var(--on-surface-variant)]"><ChevronDown /></span>
                  </div>
                )}
              </div>

              {/* Hero amount */}
              <div
                className="rounded-[32px] p-8 flex flex-col items-center justify-center transition-all duration-300"
                style={{ backgroundColor: 'var(--surface-dim)' }}
              >
                <label className={`${labelCls} mb-2 text-center`}>Amount</label>
                <div className="flex items-center gap-2 border-b-2 border-transparent focus-within:border-[var(--primary)] transition-all duration-300">
                  <span className="text-3xl font-headline font-bold text-[var(--primary)] opacity-50">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={incomeAmount}
                    onChange={e => setIncomeAmount(e.target.value)}
                    required
                    className="bg-transparent text-5xl font-headline font-black text-[var(--primary)] text-center w-full border-none focus:ring-0 focus:outline-none p-0 placeholder:text-[var(--primary)]/20"
                  />
                </div>
              </div>

              {/* Item Cost — reselling only */}
              {isReselling && (
                <div className="bg-[var(--surface-container-low)] squircle p-5">
                  <label className={labelCls}>Item Cost (What you paid)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-headline font-bold text-[var(--on-surface-variant)] opacity-50">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={incomeCogs}
                      onChange={e => setIncomeCogs(e.target.value)}
                      className={bareInput}
                    />
                  </div>
                  {parseFloat(incomeCogs) > 0 && parseFloat(incomeAmount) > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">Gross margin</span>
                      <span
                        className="px-2.5 py-0.5 rounded-full font-label text-[10px] font-bold"
                        style={{
                          backgroundColor: parseFloat(incomeAmount) - parseFloat(incomeCogs) >= 0
                            ? 'rgba(0,106,104,0.1)' : 'rgba(180,60,40,0.1)',
                          color: parseFloat(incomeAmount) - parseFloat(incomeCogs) >= 0
                            ? 'var(--secondary)' : 'var(--expense)',
                        }}
                      >
                        ${(parseFloat(incomeAmount) - parseFloat(incomeCogs)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={e => setIncomeDate(e.target.value)}
                  required
                  className={bareInput}
                />
              </div>

              {/* Mileage */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Mileage (Optional)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="Enter miles driven"
                  value={incomeMileage}
                  onChange={e => setIncomeMileage(e.target.value)}
                  className={bareInput}
                />

                {ratePreview && (
                  <div
                    className="mt-4 p-4 squircle"
                    style={{ backgroundColor: 'rgba(228,226,221,0.5)', border: '1px solid rgba(196,198,207,0.15)' }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-label text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)]">
                        Archival Specimen Rate
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full font-label text-[9px] font-bold"
                        style={{ backgroundColor: 'rgba(0,106,104,0.1)', color: 'var(--secondary)' }}
                      >
                        ESTIMATED
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-label text-[10px] text-[var(--on-surface-variant)] opacity-60">FUEL</p>
                        <p className="text-xs font-bold text-[var(--primary)]">{formatCurrency(ratePreview.fuelCost)}</p>
                      </div>
                      <div>
                        <p className="font-label text-[10px] text-[var(--on-surface-variant)] opacity-60">DEPR.</p>
                        <p className="text-xs font-bold text-[var(--primary)]">
                          {ratePreview.snapshot.depreciation_per_mile > 0 ? formatCurrency(ratePreview.deprCost) : '—'}
                        </p>
                      </div>
                      <div style={{ borderLeft: '1px solid rgba(196,198,207,0.2)' }}>
                        <p className="font-label text-[10px] text-[var(--on-surface-variant)] opacity-60">TOTAL</p>
                        <p className="text-xs font-black" style={{ color: 'var(--secondary)' }}>
                          {formatCurrency(ratePreview.fuelCost + (ratePreview.snapshot.depreciation_per_mile > 0 ? ratePreview.deprCost : 0))}
                        </p>
                      </div>
                    </div>
                    <p className="font-label text-[8px] uppercase tracking-wider text-[var(--on-surface-variant)] opacity-40 mt-2 text-center">
                      IRS &amp; analytics only — log a fuel expense for actual spend
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Notes</label>
                <textarea
                  value={incomeDesc}
                  onChange={e => setIncomeDesc(e.target.value)}
                  placeholder="Details about this transaction..."
                  rows={3}
                  className="bg-transparent w-full border-none p-0 text-[var(--on-surface)] font-body focus:ring-0 focus:outline-none resize-none"
                />
              </div>

              {/* Taxable Income toggle */}
              <div className="flex justify-between items-center bg-[var(--surface-container-low)] squircle p-5">
                <div>
                  <label className={`${labelCls} mb-0.5`}>Taxable Income</label>
                  <p className="text-xs text-[var(--on-surface-variant)]/60 font-medium">Apply standard SE tax rate</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={incomeTaxable}
                  onClick={() => setIncomeTaxable(v => !v)}
                  className="w-12 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0"
                  style={{ backgroundColor: incomeTaxable ? 'var(--primary)' : 'var(--surface-container-high)' }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300"
                    style={{ left: incomeTaxable ? '1.5rem' : '0.25rem' }}
                  />
                </button>
              </div>

              {/* CTA */}
              <button
                type="submit"
                disabled={submitting || activeHustles.length === 0}
                className="w-full py-5 squircle text-white font-headline font-bold text-lg shadow-[0_32px_64px_rgba(2,36,72,0.15)] active:scale-[0.98] transition-transform duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : 'Log Transaction'}
              </button>
            </form>
          )}

          {/* ── EXPENSE FORM ── */}
          {tab === 'expense' && (
            <form onSubmit={handleExpenseSubmit} className="space-y-6">

              {/* Hustle selector (optional) */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Hustle (Optional)</label>
                <div className="relative flex items-center">
                  <select
                    value={expenseHustleId}
                    onChange={e => setExpenseHustleId(e.target.value)}
                    className={`${bareInput} pr-5 cursor-pointer appearance-none`}
                  >
                    <option value="">General — all hustles</option>
                    {activeHustles.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  <span className="absolute right-0 text-[var(--on-surface-variant)]"><ChevronDown /></span>
                </div>
              </div>

              {/* Hero amount */}
              <div
                className="rounded-[32px] p-8 flex flex-col items-center justify-center transition-all duration-300"
                style={{ backgroundColor: 'var(--surface-dim)' }}
              >
                <label className={`${labelCls} mb-2 text-center`}>Amount</label>
                <div className="flex items-center gap-2 border-b-2 border-transparent focus-within:border-[var(--primary)] transition-all duration-300">
                  <span className="text-3xl font-headline font-bold text-[var(--primary)] opacity-50">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    required
                    className="bg-transparent text-5xl font-headline font-black text-[var(--primary)] text-center w-full border-none focus:ring-0 focus:outline-none p-0 placeholder:text-[var(--primary)]/20"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Category</label>
                <div className="relative flex items-center">
                  <select
                    value={expenseCategory}
                    onChange={e => setExpenseCategory(e.target.value as ExpenseEntry['category'])}
                    required
                    className={`${bareInput} pr-5 cursor-pointer appearance-none`}
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-0 text-[var(--on-surface-variant)]"><ChevronDown /></span>
                </div>
                {expenseCategory === 'fuel' && !hasMileageOnDate && (
                  <p className="mt-3 font-label text-[9px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] opacity-70 leading-relaxed">
                    Log actual fill-up here. Mileage on income entries is for IRS records only.
                  </p>
                )}
                {expenseCategory === 'fuel' && hasMileageOnDate && (
                  <div
                    className="flex items-start gap-2 mt-3 p-3 squircle"
                    style={{ backgroundColor: 'var(--tertiary-fixed)' }}
                  >
                    <TriangleAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--tertiary-container)' }} strokeWidth={1.5} />
                    <p className="font-label text-[9px] uppercase tracking-[0.04rem] leading-relaxed" style={{ color: 'var(--tertiary-container)' }}>
                      You already tracked mileage on this date. Logging a fuel expense too may duplicate your fuel cost — mileage is for IRS records, not profit.
                    </p>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  required
                  className={bareInput}
                />
              </div>

              {/* Recurring toggle */}
              <div className="flex justify-between items-center bg-[var(--surface-container-low)] squircle p-5">
                <div>
                  <label className={`${labelCls} mb-0.5`}>Recurring</label>
                  <p className="text-xs text-[var(--on-surface-variant)]/60 font-medium">Repeats monthly</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={expenseRecurring}
                  onClick={() => setExpenseRecurring(v => !v)}
                  className="w-12 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0"
                  style={{ backgroundColor: expenseRecurring ? 'var(--primary)' : 'var(--surface-container-high)' }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300"
                    style={{ left: expenseRecurring ? '1.5rem' : '0.25rem' }}
                  />
                </button>
              </div>

              {/* Notes */}
              <div className="bg-[var(--surface-container-low)] squircle p-5">
                <label className={labelCls}>Notes</label>
                <textarea
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  placeholder="Details about this expense..."
                  rows={3}
                  className="bg-transparent w-full border-none p-0 text-[var(--on-surface)] font-body focus:ring-0 focus:outline-none resize-none"
                />
              </div>

              {/* CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 squircle text-white font-headline font-bold text-lg shadow-[0_32px_64px_rgba(2,36,72,0.15)] active:scale-[0.98] transition-transform duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : 'Log Transaction'}
              </button>
            </form>
          )}
        </main>
      </div>

      {/* ══════════════════ DESKTOP ══════════════════ */}
      <div className="hidden lg:block">
        <main className="pt-8 pb-12 px-8 min-h-screen">
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            <div className="flex p-1 bg-[var(--surface-container)] rounded-full w-fit">
              {(['income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-full font-label text-[10px] uppercase tracking-[0.08rem] transition-all duration-300 ${
                    tab === t
                      ? 'bg-[var(--surface-container-lowest)] text-[var(--primary)] font-semibold shadow-sm'
                      : 'text-[var(--on-surface-variant)] opacity-60 hover:opacity-100'
                  }`}
                >
                  {t === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>

            {/* Hero amount */}
            <section
              className="squircle p-12 flex flex-col items-center justify-center gap-4"
              style={{ backgroundColor: 'rgba(220,218,212,0.4)' }}
            >
              <span className="font-label text-[0.65rem] uppercase tracking-[0.2rem] text-[var(--primary)]/60">
                {tab === 'income' ? 'Amount Earned' : 'Amount Spent'}
              </span>
              <div className="flex items-baseline gap-2 w-full max-w-sm justify-center">
                <span className="text-3xl font-headline text-[var(--primary)]/40">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={tab === 'income' ? incomeAmount : expenseAmount}
                  onChange={e => tab === 'income' ? setIncomeAmount(e.target.value) : setExpenseAmount(e.target.value)}
                  className="bg-transparent border-none text-center font-headline text-7xl text-[var(--primary)] focus:ring-0 focus:outline-none w-full placeholder:text-[var(--primary)]/20"
                />
              </div>
            </section>

            {/* Form bento */}
            <div className="grid grid-cols-2 gap-6">

              {/* Left col */}
              <div className="space-y-6">

                {/* Hustle */}
                <div className="bg-[var(--surface-container-low)] p-6 squircle space-y-4">
                  <label className="font-label text-[0.65rem] uppercase tracking-widest text-[var(--on-surface-variant)] block">
                    {tab === 'income' ? 'Select Hustle' : 'Hustle (Optional)'}
                  </label>
                  {hustlesLoading ? (
                    <div className="h-14 squircle bg-[var(--surface-container-high)] animate-pulse" />
                  ) : tab === 'income' && activeHustles.length === 0 ? (
                    <Link href="/hustles" className="text-sm text-[var(--secondary)] font-semibold">Create a hustle first →</Link>
                  ) : (
                    <div className="relative">
                      <select
                        value={tab === 'income' ? incomeHustleId : expenseHustleId}
                        onChange={e => tab === 'income' ? setIncomeHustleId(e.target.value) : setExpenseHustleId(e.target.value)}
                        required={tab === 'income'}
                        className="w-full bg-[var(--surface-container-highest)] border-none squircle h-14 px-4 pr-10 font-headline text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)]/10 focus:outline-none appearance-none cursor-pointer"
                      >
                        {tab === 'income' && <option value="">Choose hustle…</option>}
                        {tab === 'expense' && <option value="">General — all hustles</option>}
                        {activeHustles.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none">
                        <ChevronDown />
                      </span>
                    </div>
                  )}
                </div>

                {/* Date + Category (expense) */}
                <div className="bg-[var(--surface-container-low)] p-6 squircle space-y-4">
                  {tab === 'expense' && (
                    <div className="space-y-2">
                      <label className="font-label text-[0.65rem] uppercase tracking-widest text-[var(--on-surface-variant)] block">Category</label>
                      <div className="relative">
                        <select
                          value={expenseCategory}
                          onChange={e => setExpenseCategory(e.target.value as ExpenseEntry['category'])}
                          required
                          className="w-full bg-[var(--surface-container-highest)] border-none squircle h-14 px-4 pr-10 font-headline text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)]/10 focus:outline-none appearance-none cursor-pointer"
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none">
                          <ChevronDown />
                        </span>
                      </div>
                      {expenseCategory === 'fuel' && !hasMileageOnDate && (
                        <p className="font-label text-[9px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] opacity-60">
                          Log actual fill-up here. Mileage on income entries is for IRS records only.
                        </p>
                      )}
                      {expenseCategory === 'fuel' && hasMileageOnDate && (
                        <div
                          className="flex items-start gap-2 p-3 squircle"
                          style={{ backgroundColor: 'var(--tertiary-fixed)' }}
                        >
                          <TriangleAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--tertiary-container)' }} strokeWidth={1.5} />
                          <p className="font-label text-[9px] uppercase tracking-[0.04rem] leading-relaxed" style={{ color: 'var(--tertiary-container)' }}>
                            You already tracked mileage on this date. Logging a fuel expense too may duplicate your fuel cost — mileage is for IRS records, not profit.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="font-label text-[0.65rem] uppercase tracking-widest text-[var(--on-surface-variant)] block">Date</label>
                    <input
                      type="date"
                      value={tab === 'income' ? incomeDate : expenseDate}
                      onChange={e => tab === 'income' ? setIncomeDate(e.target.value) : setExpenseDate(e.target.value)}
                      required
                      className="w-full bg-[var(--surface-container-highest)] border-none squircle h-14 px-4 font-headline text-sm text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)]/10 focus:outline-none"
                    />
                  </div>

                  {/* Item Cost — reselling only */}
                  {tab === 'income' && isReselling && (
                    <div className="space-y-2">
                      <label className="font-label text-[0.65rem] uppercase tracking-widest text-[var(--on-surface-variant)] block">Item Cost (What you paid)</label>
                      <div className="relative flex items-center bg-[var(--surface-container-highest)] squircle h-14 px-4 gap-2">
                        <span className="font-headline text-[var(--on-surface)] opacity-40">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={incomeCogs}
                          onChange={e => setIncomeCogs(e.target.value)}
                          className="flex-1 bg-transparent border-none p-0 font-headline text-[var(--on-surface)] focus:ring-0 focus:outline-none"
                        />
                        {parseFloat(incomeCogs) > 0 && parseFloat(incomeAmount) > 0 && (
                          <span
                            className="px-2.5 py-0.5 rounded-full font-label text-[10px] font-bold whitespace-nowrap"
                            style={{
                              backgroundColor: parseFloat(incomeAmount) - parseFloat(incomeCogs) >= 0
                                ? 'rgba(0,106,104,0.1)' : 'rgba(180,60,40,0.1)',
                              color: parseFloat(incomeAmount) - parseFloat(incomeCogs) >= 0
                                ? 'var(--secondary)' : 'var(--expense)',
                            }}
                          >
                            ${(parseFloat(incomeAmount) - parseFloat(incomeCogs)).toFixed(2)} margin
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right col — Notes + Toggle */}
              <div>
                <div className="bg-[var(--surface-container-low)] p-6 squircle h-full flex flex-col gap-4">
                  <label className="font-label text-[0.65rem] uppercase tracking-widest text-[var(--on-surface-variant)] block">
                    Session Notes
                  </label>
                  <textarea
                    value={tab === 'income' ? incomeDesc : expenseDesc}
                    onChange={e => tab === 'income' ? setIncomeDesc(e.target.value) : setExpenseDesc(e.target.value)}
                    placeholder="Archival details of the transaction..."
                    className="flex-grow bg-[var(--surface-container-highest)] border-none squircle p-4 font-body text-sm text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)]/10 focus:outline-none resize-none min-h-[140px]"
                  />
                  <div
                    className="flex items-center justify-between pt-4 mt-auto"
                    style={{ borderTop: '1px solid rgba(196,198,207,0.3)' }}
                  >
                    <div className="flex flex-col">
                      <span className="font-headline font-semibold text-sm text-[var(--on-surface)]">
                        {tab === 'income' ? 'Taxable Income' : 'Recurring Expense'}
                      </span>
                      <span className="font-label text-[0.6rem] uppercase tracking-tight text-[var(--on-surface-variant)]">
                        {tab === 'income' ? 'Apply standard SE tax rate' : 'Repeats monthly'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={tab === 'expense' ? expenseRecurring : incomeTaxable}
                      onClick={() => { if (tab === 'income') setIncomeTaxable(v => !v); else setExpenseRecurring(v => !v) }}
                      className="w-11 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0"
                      style={{
                        backgroundColor: (tab === 'income' ? incomeTaxable : expenseRecurring)
                          ? 'var(--secondary)' : 'var(--surface-container-highest)',
                      }}
                    >
                      <span
                        className="absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300"
                        style={{ left: (tab === 'income' ? incomeTaxable : expenseRecurring) ? '1.25rem' : '0.125rem' }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mileage row — income only, full width */}
              {tab === 'income' && (
                <div className="col-span-2 grid grid-cols-3 gap-6">
                  <div className="col-span-2 bg-[var(--surface-container-low)] p-6 squircle flex flex-col gap-4">
                    <label className="font-label text-[0.65rem] uppercase tracking-widest text-[var(--on-surface-variant)] block">
                      Business Mileage
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="Distance in miles"
                      value={incomeMileage}
                      onChange={e => setIncomeMileage(e.target.value)}
                      className="w-full bg-[var(--surface-container-highest)] border-none squircle h-14 px-6 font-headline text-xl text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)]/10 focus:outline-none"
                    />
                    {ratePreview && (
                      <div className="grid grid-cols-3 gap-3 text-center p-4 squircle" style={{ backgroundColor: 'rgba(228,226,221,0.5)' }}>
                        <div>
                          <p className="font-label text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">Fuel</p>
                          <p className="text-sm font-bold text-[var(--primary)]">{formatCurrency(ratePreview.fuelCost)}</p>
                          <p className="font-label text-[8px] text-[var(--on-surface-variant)] opacity-40 mt-0.5">
                            {formatGasPrice(ratePreview.snapshot.gas_price)} · {formatMpg(ratePreview.snapshot.mpg)}
                          </p>
                        </div>
                        <div>
                          <p className="font-label text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">Depr.</p>
                          <p className="text-sm font-bold text-[var(--primary)]">
                            {ratePreview.snapshot.depreciation_per_mile > 0 ? formatCurrency(ratePreview.deprCost) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="font-label text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">Total Est.</p>
                          <p className="text-sm font-black" style={{ color: 'var(--secondary)' }}>
                            {formatCurrency(ratePreview.fuelCost + (ratePreview.snapshot.depreciation_per_mile > 0 ? ratePreview.deprCost : 0))}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* IRS Specimen card */}
                  <div
                    className="squircle p-6 flex flex-col justify-between overflow-hidden relative shadow-[0_24px_48px_-12px_rgba(0,106,104,0.15)]"
                    style={{ backgroundColor: 'var(--secondary-container)' }}
                  >
                    <div className="relative z-10">
                      <span className="font-label text-[0.6rem] uppercase tracking-widest text-[var(--on-secondary-fixed-variant)] opacity-80">
                        IRS 2024 SPECIMEN
                      </span>
                      <h3 className="text-3xl font-headline font-black text-[var(--on-secondary-fixed)] mt-1">
                        {(IRS_MILEAGE_RATE_DEFAULT * 100).toFixed(0)}¢
                      </h3>
                      <p className="font-body text-[0.7rem] text-[var(--on-secondary-container)] mt-2 leading-relaxed">
                        Deduction rate per business mile — archival reference only.
                      </p>
                    </div>
                    <div className="absolute -bottom-4 -right-4 opacity-10 text-[var(--on-secondary-container)]">
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop CTA */}
            <div className="flex justify-center pt-4">
              <button
                onClick={tab === 'income' ? doSubmitIncome : doSubmitExpense}
                disabled={submitting || (tab === 'income' && activeHustles.length === 0)}
                className="group relative px-12 py-5 rounded-full text-white flex items-center gap-4 overflow-hidden shadow-[0_32px_64px_-16px_rgba(2,36,72,0.5)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                    <span className="font-label text-sm font-semibold uppercase tracking-[0.15rem] relative z-10">Saving…</span>
                  </>
                ) : (
                  <>
                    <span className="font-label text-sm font-semibold uppercase tracking-[0.15rem] relative z-10">Log Transaction</span>
                    <ArrowRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
                  </>
                )}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
