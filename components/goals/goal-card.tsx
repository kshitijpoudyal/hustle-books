'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Target, Pencil, Trash2, CalendarRange } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import GoalProgressBar from './goal-progress-bar'
import { getMilestoneTier } from '@/lib/hooks/use-goal-milestones'
import type { GoalWithProgress } from '@/lib/hooks/use-goals'
import type { MilestonePct } from '@/lib/hooks/use-goal-milestones'

interface GoalCardProps {
  goal: GoalWithProgress
  hustleColor?: string
  /** When set, briefly flash the card to celebrate the crossed milestone */
  flashMilestone?: MilestonePct | null
  onEdit: (goal: GoalWithProgress) => void
  onDelete: (id: string) => void
}

const MILESTONE_LABELS: Record<MilestonePct, string> = {
  25:  '🔥 25% — You\'ve started!',
  50:  '⚡ Halfway there!',
  75:  '🚀 75% — Almost there!',
  100: '🎯 Goal Achieved!',
}

const MILESTONE_COLORS: Record<MilestonePct, string> = {
  25:  '#f59e0b',
  50:  '#3b82f6',
  75:  '#8b5cf6',
  100: 'var(--secondary)',
}

export default function GoalCard({ goal, hustleColor, flashMilestone, onEdit, onDelete }: GoalCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)

  const tier = getMilestoneTier(goal.pct)
  const remaining = goal.target_amount - goal.current_amount
  const hasTimeframe = goal.timeframe_start || goal.timeframe_end

  // Trigger flash animation when flashMilestone prop arrives
  useEffect(() => {
    if (!flashMilestone) return
    setIsFlashing(true)
    const t = setTimeout(() => setIsFlashing(false), 1200)
    return () => clearTimeout(t)
  }, [flashMilestone])

  // Border color driven by milestone tier
  const tierColor = goal.is_complete
    ? 'var(--secondary)'
    : tier === 75 ? '#8b5cf6'
    : tier === 50 ? '#3b82f6'
    : tier === 25 ? '#f59e0b'
    : 'transparent'

  const tierGlow = goal.is_complete
    ? '0 0 24px 4px rgba(44,166,164,0.18)'
    : tier === 75 ? '0 0 16px 2px rgba(139,92,246,0.12)'
    : tier === 50 ? '0 0 16px 2px rgba(59,130,246,0.10)'
    : '0 12px 32px rgba(30,58,95,0.06)'

  return (
    <div
      className="squircle p-5 flex flex-col gap-4 transition-all duration-500"
      style={{
        backgroundColor: 'var(--surface-container-low)',
        outline: tier ? `1.5px solid ${tierColor}26` : '1.5px solid transparent',
        boxShadow: isFlashing
          ? `0 0 0 3px ${tierColor}44, ${tierGlow}`
          : tierGlow,
        transform: isFlashing ? 'scale(1.012)' : 'scale(1)',
        transition: isFlashing
          ? 'transform 0.15s ease-out, box-shadow 0.15s ease-out, outline 0.3s'
          : 'transform 0.4s ease-in, box-shadow 0.6s ease-out, outline 0.4s',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center transition-colors duration-500"
            style={{
              backgroundColor: goal.is_complete
                ? 'var(--secondary)'
                : tier === 75 ? '#8b5cf622'
                : tier === 50 ? '#3b82f622'
                : tier === 25 ? '#f59e0b22'
                : (hustleColor ? `${hustleColor}22` : 'var(--surface-container-highest)'),
              color: goal.is_complete
                ? 'white'
                : tier ? MILESTONE_COLORS[tier]
                : (hustleColor ?? 'var(--primary)'),
            }}
          >
            {goal.is_complete
              ? <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
              : <Target className="w-4 h-4" strokeWidth={1.5} />
            }
          </div>
          <div className="min-w-0">
            <h3
              className="font-headline font-bold text-sm leading-snug truncate"
              style={{ color: 'var(--on-surface)' }}
            >
              {goal.title}
            </h3>
            {hasTimeframe && (
              <div className="flex items-center gap-1 mt-0.5">
                <CalendarRange className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--on-surface-variant)' }} strokeWidth={1.5} />
                <span className="font-label text-[9px] uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                  {goal.timeframe_start ? formatDate(goal.timeframe_start, 'short') : '—'}
                  {' → '}
                  {goal.timeframe_end ? formatDate(goal.timeframe_end, 'short') : 'Ongoing'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Milestone badge */}
        {tier && tier < 100 && (
          <span
            className="flex-shrink-0 font-label text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${MILESTONE_COLORS[tier]}1a`,
              color: MILESTONE_COLORS[tier],
            }}
          >
            {tier}%
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--surface-container-high)]"
            aria-label="Edit goal"
          >
            <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} strokeWidth={1.5} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(goal.id); setConfirmDelete(false) }}
                className="font-label text-[9px] uppercase tracking-widest px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: 'var(--expense)' }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="font-label text-[9px] uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--surface-container-high)]"
              aria-label="Delete goal"
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--expense)' }} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <GoalProgressBar pct={goal.pct} isComplete={goal.is_complete} color={hustleColor ?? (tier ? MILESTONE_COLORS[tier] : undefined)} animate={isFlashing} />

      {/* Amounts row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-label text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>
            Progress
          </p>
          <p className="font-body font-bold text-lg leading-none" style={{ color: goal.is_complete ? 'var(--secondary)' : 'var(--on-surface)' }}>
            {formatCurrency(goal.current_amount)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-label text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>
            {goal.is_complete ? 'Achieved' : 'Remaining'}
          </p>
          <p className="font-body font-semibold text-sm leading-none" style={{ color: 'var(--on-surface-variant)' }}>
            {goal.is_complete ? formatCurrency(goal.target_amount) : formatCurrency(remaining)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-label text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>
            Target
          </p>
          <p
            className="font-body font-bold text-lg leading-none"
            style={{ color: goal.is_complete ? 'var(--secondary)' : (tier ? MILESTONE_COLORS[tier] : 'var(--primary)') }}
          >
            {Math.round(goal.pct)}%
          </p>
        </div>
      </div>

      {/* Milestone / completion banner */}
      {tier && (
        <div
          className="rounded-2xl py-2 px-4 text-center transition-all duration-500"
          style={{
            backgroundColor: `${MILESTONE_COLORS[tier]}14`,
          }}
        >
          <span
            className="font-label text-[10px] uppercase tracking-widest font-bold"
            style={{ color: MILESTONE_COLORS[tier] }}
          >
            {MILESTONE_LABELS[tier]}
          </span>
        </div>
      )}
    </div>
  )
}

