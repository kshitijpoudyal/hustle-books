'use client'

import { useState, useEffect } from 'react'
import { X, Mic, TriangleAlert, CheckCircle2 } from 'lucide-react'
import type { ParsedVoiceTransaction } from '@/lib/utils/voice-parser'
import type { ExpenseEntry, Hustle } from '@/lib/types'
import { EXPENSE_CATEGORIES } from '@/lib/utils/constants'

interface VoicePreviewField {
  type: 'income' | 'expense' | null
  amount: string
  miles: string
  category: ExpenseEntry['category']
  hustleId: string
  notes: string
}

interface VoicePreviewModalProps {
  parsed: ParsedVoiceTransaction | null
  hustles: Hustle[]
  onApply: (fields: VoicePreviewField) => void
  onDismiss: () => void
}

const labelCls =
  'font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)] mb-1.5 block'

export function VoicePreviewModal({
  parsed,
  hustles,
  onApply,
  onDismiss,
}: VoicePreviewModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState('')
  const [miles, setMiles] = useState('')
  const [category, setCategory] = useState<ExpenseEntry['category']>('other')
  const [hustleId, setHustleId] = useState('')
  const [notes, setNotes] = useState('')

  // Populate from parsed data whenever a new result arrives
  useEffect(() => {
    if (!parsed) return
    setType(parsed.type ?? 'income')
    setAmount(parsed.amount != null ? String(parsed.amount) : '')
    setMiles(parsed.miles != null ? String(parsed.miles) : '')
    setCategory(parsed.category ?? 'other')
    setNotes(parsed.notes ?? '')

    // Match hustle name to ID
    if (parsed.hustleName) {
      const match = hustles.find(
        h => h.name.toLowerCase() === parsed.hustleName!.toLowerCase()
      )
      setHustleId(match?.id ?? '')
    } else {
      setHustleId('')
    }
  }, [parsed, hustles])

  if (!parsed) return null

  function handleApply() {
    onApply({ type, amount, miles, category, hustleId, notes })
  }

  const hasWarnings = parsed.warnings.length > 0

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onDismiss() }}
    >
      {/* Sheet */}
      <div
        className="w-full max-w-md rounded-[28px] overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-container-low)',
          boxShadow: '0 24px 64px rgba(30,58,95,0.18)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ backgroundColor: 'var(--surface-container)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(44,166,164,0.12)', color: 'var(--secondary)' }}
            >
              <Mic className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-headline font-bold text-[var(--primary)] text-sm leading-tight">
                Voice Entry Preview
              </p>
              <p className="font-label text-[9px] uppercase tracking-[0.08rem] text-[var(--on-surface-variant)] opacity-70 mt-0.5">
                Review and confirm before logging
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--on-surface-variant)', backgroundColor: 'var(--surface-container-high)' }}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Transcript */}
        <div className="px-6 pt-4 pb-2">
          <p className={labelCls}>You said</p>
          <p
            className="font-body text-sm italic leading-relaxed px-4 py-3 rounded-2xl"
            style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
          >
            &ldquo;{parsed.rawTranscript}&rdquo;
          </p>
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className="px-6 pb-2 space-y-1.5">
            {parsed.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-2xl"
                style={{ backgroundColor: 'var(--tertiary-fixed)', color: 'var(--tertiary-container)' }}
              >
                <TriangleAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <p className="font-label text-[10px] uppercase tracking-[0.04rem] leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className="px-6 pt-2 pb-6 space-y-4">

          {/* Type toggle */}
          <div>
            <p className={labelCls}>Type</p>
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="flex-1 py-2.5 rounded-2xl font-label text-[10px] uppercase tracking-[0.08rem] transition-all duration-200"
                  style={{
                    backgroundColor: type === t ? 'var(--primary)' : 'var(--surface-container)',
                    color: type === t ? 'white' : 'var(--on-surface-variant)',
                    fontWeight: type === t ? 700 : 500,
                  }}
                >
                  {t === 'income' ? '💰 Income' : '📤 Expense'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Amount</label>
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-2xl"
              style={{ backgroundColor: 'var(--surface-container)' }}
            >
              <span
                className="font-headline font-bold text-lg"
                style={{ color: 'var(--primary)', opacity: 0.5 }}
              >$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="bg-transparent border-none w-full font-headline font-bold text-lg text-[var(--primary)] focus:ring-0 focus:outline-none p-0 placeholder:text-[var(--primary)]/20"
              />
              {amount && (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--secondary)' }} strokeWidth={1.5} />
              )}
            </div>
          </div>

          {/* Hustle (income) or Category (expense) */}
          {type === 'income' ? (
            <div>
              <label className={labelCls}>Hustle</label>
              <div
                className="px-4 py-3 rounded-2xl"
                style={{ backgroundColor: 'var(--surface-container)' }}
              >
                <select
                  value={hustleId}
                  onChange={e => setHustleId(e.target.value)}
                  className="bg-transparent border-none w-full font-headline text-[var(--on-surface)] focus:ring-0 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select hustle…</option>
                  {hustles.filter(h => h.is_active).map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Category</label>
              <div
                className="px-4 py-3 rounded-2xl"
                style={{ backgroundColor: 'var(--surface-container)' }}
              >
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseEntry['category'])}
                  className="bg-transparent border-none w-full font-headline text-[var(--on-surface)] focus:ring-0 focus:outline-none appearance-none cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Miles (income only) */}
          {type === 'income' && (
            <div>
              <label className={labelCls}>Miles (Optional)</label>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                style={{ backgroundColor: 'var(--surface-container)' }}
              >
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={miles}
                  onChange={e => setMiles(e.target.value)}
                  className="bg-transparent border-none w-full font-headline text-[var(--primary)] focus:ring-0 focus:outline-none p-0 placeholder:text-[var(--primary)]/20"
                />
                <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 flex-shrink-0">
                  mi
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <div
              className="px-4 py-3 rounded-2xl"
              style={{ backgroundColor: 'var(--surface-container)' }}
            >
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional details…"
                rows={2}
                className="bg-transparent border-none w-full font-body text-sm text-[var(--on-surface)] focus:ring-0 focus:outline-none resize-none p-0 placeholder:text-[var(--on-surface-variant)]/40"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 py-4 rounded-2xl font-label text-[10px] uppercase tracking-[0.08rem] font-semibold transition-colors"
              style={{
                backgroundColor: 'var(--surface-container)',
                color: 'var(--on-surface-variant)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!amount}
              className="flex-[2] py-4 rounded-2xl font-headline font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
              }}
            >
              Apply to Form
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
