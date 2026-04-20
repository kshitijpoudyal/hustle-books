'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { GoalWithProgress } from '@/lib/hooks/use-goals'
import type { Hustle } from '@/lib/types'

interface GoalFormProps {
  /** null = create, GoalWithProgress = edit */
  goal: GoalWithProgress | null
  /** Pre-lock type when opening from a hustle page */
  defaultType?: 'hustle' | 'global'
  /** Pre-lock hustle when opening from a hustle page */
  defaultHustleId?: string
  hustles: Hustle[]
  onSave: (data: {
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id: string | null
    timeframe_start: string | null
    timeframe_end: string | null
  }) => Promise<boolean>
  onClose: () => void
}

export default function GoalForm({ goal, defaultType, defaultHustleId, hustles, onSave, onClose }: GoalFormProps) {
  const isEdit = !!goal

  const [title, setTitle] = useState(goal?.title ?? '')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
  const [type, setType] = useState<'hustle' | 'global'>(goal?.type ?? defaultType ?? 'global')
  const [hustleId, setHustleId] = useState<string>(goal?.hustle_id ?? defaultHustleId ?? '')
  const [timeframeStart, setTimeframeStart] = useState(goal?.timeframe_start ?? '')
  const [timeframeEnd, setTimeframeEnd] = useState(goal?.timeframe_end ?? '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // When type switches away from hustle, clear hustle selection (unless pre-locked)
  useEffect(() => {
    if (type === 'global' && !defaultHustleId) setHustleId('')
  }, [type, defaultHustleId])

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    const amt = parseFloat(targetAmount)
    if (isNaN(amt) || amt <= 0) e.targetAmount = 'Enter a valid amount greater than zero'
    if (type === 'hustle' && !hustleId) e.hustleId = 'Select a hustle for this goal'
    if (timeframeStart && timeframeEnd && timeframeStart > timeframeEnd)
      e.timeframe = 'Start date must be before end date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const ok = await onSave({
      title: title.trim(),
      target_amount: parseFloat(targetAmount),
      type,
      hustle_id: type === 'hustle' ? hustleId || null : null,
      timeframe_start: timeframeStart || null,
      timeframe_end: timeframeEnd || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const inputClass = "w-full bg-[var(--surface-container-low)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none font-body text-sm text-[var(--on-surface)]"
  const labelClass = "font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] block mb-2"
  const errorClass = "font-label text-[10px] mt-1" 

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full lg:max-w-md lg:mx-4 squircle overflow-hidden"
        style={{
          backgroundColor: 'var(--surface)',
          boxShadow: '0 -12px 48px rgba(30,58,95,0.12)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        {/* Handle (mobile) */}
        <div className="lg:hidden flex justify-center pt-4 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--outline-variant)]" />
        </div>

        <div className="px-6 pb-8 lg:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline font-black text-xl text-[var(--primary)]">
              {isEdit ? 'Edit Goal' : 'New Goal'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--surface-container-high)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--on-surface-variant)]" strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className={labelClass}>Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Earn $1,000 this month"
                className={inputClass}
                style={{ border: 'none' }}
              />
              {errors.title && <p className={errorClass} style={{ color: 'var(--expense)' }}>{errors.title}</p>}
            </div>

            {/* Target Amount */}
            <div>
              <label className={labelClass}>Target Amount</label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-sm font-bold"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  $
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-8`}
                  style={{ border: 'none' }}
                />
              </div>
              {errors.targetAmount && <p className={errorClass} style={{ color: 'var(--expense)' }}>{errors.targetAmount}</p>}
            </div>

            {/* Type toggle — only shown when not pre-locked to a hustle */}
            {!defaultHustleId && (
              <div>
                <label className={labelClass}>Goal Type</label>
                <div className="flex gap-1 p-1 rounded-full" style={{ backgroundColor: 'var(--surface-container-low)' }}>
                  {(['global', 'hustle'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className="flex-1 py-2.5 rounded-full font-label text-[10px] uppercase tracking-widest transition-all"
                      style={type === t
                        ? { backgroundColor: 'var(--primary)', color: 'white' }
                        : { color: 'var(--on-surface-variant)' }}
                    >
                      {t === 'global' ? 'All Hustles' : 'One Hustle'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hustle selector */}
            {type === 'hustle' && !defaultHustleId && (
              <div>
                <label className={labelClass}>Hustle</label>
                <select
                  value={hustleId}
                  onChange={e => setHustleId(e.target.value)}
                  className={inputClass}
                  style={{ border: 'none' }}
                >
                  <option value="">Select a hustle…</option>
                  {hustles.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                {errors.hustleId && <p className={errorClass} style={{ color: 'var(--expense)' }}>{errors.hustleId}</p>}
              </div>
            )}

            {/* Timeframe */}
            <div>
              <label className={labelClass}>Timeframe (optional)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-label text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>Start</p>
                  <input
                    type="date"
                    value={timeframeStart}
                    onChange={e => setTimeframeStart(e.target.value)}
                    className={inputClass}
                    style={{ border: 'none' }}
                  />
                </div>
                <div>
                  <p className="font-label text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>End</p>
                  <input
                    type="date"
                    value={timeframeEnd}
                    onChange={e => setTimeframeEnd(e.target.value)}
                    className={inputClass}
                    style={{ border: 'none' }}
                  />
                </div>
              </div>
              {errors.timeframe && <p className={errorClass} style={{ color: 'var(--expense)' }}>{errors.timeframe}</p>}
              <p className="font-label text-[9px] uppercase tracking-widest mt-1.5 opacity-50" style={{ color: 'var(--on-surface-variant)' }}>
                Leave blank to track all-time income
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-full text-white font-label text-[10px] font-bold tracking-widest uppercase disabled:opacity-50 active:scale-95 transition-all mt-2"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
            >
              {saving ? 'Saving…' : isEdit ? 'Update Goal' : 'Create Goal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
