'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Trash2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useHustles } from '@/lib/hooks/use-hustles'
import { useIncome } from '@/lib/hooks/use-income'
import { useExpenses } from '@/lib/hooks/use-expenses'
import { ImageAttachment } from '@/components/image-attachment'
import { useRates } from '@/lib/hooks/use-rates'
import { resolveSnapshot } from '@/lib/utils/rate-resolver'
import { calcFuelCost, calcDepreciationCost, calcNetMargin, calcMileagePreviewTotal } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatters'
import { EXPENSE_CATEGORIES } from '@/lib/utils/constants'
import type { IncomeEntry, ExpenseEntry } from '@/lib/types'

type EntryType = 'income' | 'expense'

function ChevronDown() {
  return (
    <svg width="14" height="9" viewBox="0 0 14 9" fill="none" className="pointer-events-none flex-shrink-0">
      <path d="M1 1l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-32 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-container-low)] animate-pulse" />
          <div className="w-32 h-4 rounded-full bg-[var(--surface-container-highest)] animate-pulse" />
          <div className="w-9" />
        </div>
        <div className="h-36 squircle bg-[var(--surface-container-highest)] animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 squircle bg-[var(--surface-container-low)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function EditEntryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { hustles, loading: hustlesLoading } = useHustles()
  const { updateIncome, deleteIncome } = useIncome()
  const { updateExpense, deleteExpense } = useExpenses()
  const { snapshots, loading: ratesLoading } = useRates()

  const [entryType, setEntryType] = useState<EntryType | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Income fields
  const [incomeHustleId, setIncomeHustleId] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeCogs, setIncomeCogs] = useState('')
  const [incomeDesc, setIncomeDesc] = useState('')
  const [incomeMileage, setIncomeMileage] = useState('')
  const [incomeDate, setIncomeDate] = useState('')
  const [incomeTaxable, setIncomeTaxable] = useState(true)
  const [incomeReceiptUrl, setIncomeReceiptUrl] = useState<string | null>(null)

  // Expense fields
  const [expenseHustleId, setExpenseHustleId] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseEntry['category']>('fuel')
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseRecurring, setExpenseRecurring] = useState(false)
  const [expenseDate, setExpenseDate] = useState('')
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      setLoading(true)

      const { data: incomeData } = await supabase
        .from('income')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (incomeData) {
        const entry = incomeData as IncomeEntry
        setEntryType('income')
        setIncomeHustleId(entry.hustle_id)
        setIncomeAmount(String(entry.amount))
        setIncomeCogs(entry.cogs != null ? String(entry.cogs) : '')
        setIncomeDesc(entry.description ?? '')
        setIncomeMileage(entry.mileage != null ? String(entry.mileage) : '')
        setIncomeDate(entry.date)
        setIncomeTaxable(entry.is_taxable)
        setIncomeReceiptUrl(entry.receipt_image_url ?? null)
        setLoading(false)
        return
      }

      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (expenseData) {
        const entry = expenseData as ExpenseEntry
        setEntryType('expense')
        setExpenseHustleId(entry.hustle_id ?? '')
        setExpenseAmount(String(entry.amount))
        setExpenseCategory(entry.category)
        setExpenseDesc(entry.description ?? '')
        setExpenseRecurring(entry.is_recurring)
        setExpenseDate(entry.date)
        setExpenseReceiptUrl(entry.receipt_image_url ?? null)
        setLoading(false)
        return
      }

      toast.error('Entry not found')
      router.push('/history')
    }
    load()
  }, [id, router])

  const ratePreview = useMemo(() => {
    if (entryType !== 'income') return null
    const miles = parseFloat(incomeMileage)
    if (!miles || miles <= 0 || ratesLoading || !incomeDate) return null
    const snapshot = resolveSnapshot(snapshots, new Date(incomeDate + 'T00:00:00'))
    if (!snapshot) return null
    return {
      snapshot,
      fuelCost: calcFuelCost(miles, snapshot),
      deprCost: calcDepreciationCost(miles, snapshot),
    }
  }, [entryType, incomeMileage, incomeDate, snapshots, ratesLoading])

  const activeHustles = hustles.filter(h => h.is_active)
  const selectedHustle = useMemo(
    () => hustles.find(h => h.id === incomeHustleId) ?? null,
    [incomeHustleId, hustles]
  )
  const isReselling = selectedHustle?.category === 'reselling_and_flipping'

  async function handleIncomeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!incomeHustleId) { toast.error('Please select a hustle.'); return }
    const amount = parseFloat(incomeAmount)
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount.'); return }
    setSubmitting(true)
    const miles = parseFloat(incomeMileage)
    const cogs = isReselling ? (parseFloat(incomeCogs) || null) : null
    const ok = await updateIncome(id, {
      hustle_id: incomeHustleId,
      amount,
      description: incomeDesc.trim() || null,
      mileage: miles > 0 ? miles : null,
      cogs,
      date: incomeDate,
      mileage_method: 'actual',
      is_taxable: incomeTaxable,
      receipt_image_url: incomeReceiptUrl,
    })
    setSubmitting(false)
    if (ok) { toast.success('Entry updated!'); router.push('/history') }
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(expenseAmount)
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount.'); return }
    setSubmitting(true)
    const ok = await updateExpense(id, {
      hustle_id: expenseHustleId || null,
      amount,
      category: expenseCategory,
      description: expenseDesc.trim() || null,
      is_recurring: expenseRecurring,
      date: expenseDate,
      receipt_image_url: expenseReceiptUrl,
    })
    setSubmitting(false)
    if (ok) { toast.success('Entry updated!'); router.push('/history') }
  }

  async function handleDelete() {
    setDeleting(true)
    let ok = false
    if (entryType === 'income') ok = await deleteIncome(id)
    else if (entryType === 'expense') ok = await deleteExpense(id)
    setDeleting(false)
    if (ok) { toast.success('Entry deleted.'); router.push('/history') }
  }

  if (loading || hustlesLoading) return <LoadingSkeleton />

  const labelCls = 'font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)] mb-2 block'
  const bareInput = 'bg-transparent w-full border-none p-0 focus:ring-0 focus:outline-none text-[var(--primary)] font-headline font-bold'

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-32">

        {/* AppBar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] active:scale-95 transition-transform"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="font-label text-[11px] font-semibold uppercase tracking-[0.15rem] text-[var(--primary)]">
            Edit {entryType === 'income' ? 'Income' : 'Expense'}
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-container-low)] text-[var(--expense)] active:scale-95 transition-transform"
            aria-label="Delete entry"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* ── INCOME FORM ── */}
        {entryType === 'income' && (
          <form onSubmit={handleIncomeSubmit} className="space-y-4">

            {/* Hustle */}
            <div className="bg-[var(--surface-container-low)] squircle p-5">
              <label className={labelCls}>Hustle</label>
              <div className="relative flex items-center">
                <select
                  value={incomeHustleId}
                  onChange={e => setIncomeHustleId(e.target.value)}
                  required
                  className={`${bareInput} pr-5 cursor-pointer appearance-none`}
                >
                  <option value="">Select a hustle…</option>
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
                        backgroundColor: calcNetMargin(parseFloat(incomeAmount), parseFloat(incomeCogs)) >= 0
                          ? 'rgba(0,106,104,0.1)' : 'rgba(180,60,40,0.1)',
                        color: calcNetMargin(parseFloat(incomeAmount), parseFloat(incomeCogs)) >= 0
                          ? 'var(--secondary)' : 'var(--expense)',
                      }}
                    >
                      ${calcNetMargin(parseFloat(incomeAmount), parseFloat(incomeCogs)).toFixed(2)}
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
                      RECALCULATED ON SAVE
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
                        {formatCurrency(calcMileagePreviewTotal(ratePreview.fuelCost, ratePreview.deprCost, ratePreview.snapshot.depreciation_per_mile))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5">
                <Lock size={10} className="text-[var(--on-surface-variant)] opacity-50" />
                <p className="font-label text-[8px] uppercase tracking-wider text-[var(--on-surface-variant)] opacity-50">
                  Changing date or mileage rebakes rates from that date&apos;s snapshot
                </p>
              </div>
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

            {/* Receipt */}
            <ImageAttachment value={incomeReceiptUrl} onChange={setIncomeReceiptUrl} />

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

            {/* Save CTA */}
            <button
              type="submit"
              disabled={submitting || activeHustles.length === 0}
              className="w-full py-5 squircle text-white font-headline font-bold text-lg shadow-[0_32px_64px_rgba(2,36,72,0.15)] active:scale-[0.98] transition-transform duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── EXPENSE FORM ── */}
        {entryType === 'expense' && (
          <form onSubmit={handleExpenseSubmit} className="space-y-4">

            {/* Hustle */}
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

            {/* Receipt */}
            <ImageAttachment value={expenseReceiptUrl} onChange={setExpenseReceiptUrl} />

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

            {/* Save CTA */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 squircle text-white font-headline font-bold text-lg shadow-[0_32px_64px_rgba(2,36,72,0.15)] active:scale-[0.98] transition-transform duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : 'Save Changes'}
            </button>
          </form>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: 'rgba(2,36,72,0.4)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="w-full max-w-lg mx-auto squircle p-6 mb-6 mx-4 space-y-4"
              style={{ backgroundColor: 'var(--surface-container-lowest)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(186,26,26,0.1)' }}
                >
                  <Trash2 size={16} className="text-[var(--expense)]" />
                </div>
                <div>
                  <p className="font-headline font-bold text-sm text-[var(--on-surface)] mb-1">Delete this entry?</p>
                  <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    This action cannot be undone.
                    {entryType === 'income' && ' Baked-in rates from the linked snapshot will be lost.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 squircle font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)]"
                  style={{ backgroundColor: 'var(--surface-container-high)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-4 squircle font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--expense)' }}
                >
                  {deleting ? <><Loader2 size={13} className="animate-spin" /> Deleting…</> : <><Trash2 size={13} /> Delete</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
