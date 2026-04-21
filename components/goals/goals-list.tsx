'use client'

import { useState, useCallback } from 'react'
import { Plus, Target } from 'lucide-react'
import { toast } from 'sonner'
import { useGoals } from '@/lib/hooks/use-goals'
import { useHustles } from '@/lib/hooks/use-hustles'
import { useGoalMilestones } from '@/lib/hooks/use-goal-milestones'
import GoalCard from './goal-card'
import GoalForm from './goal-form'
import type { GoalWithProgress } from '@/lib/hooks/use-goals'
import type { MilestonePct, MilestoneEvent } from '@/lib/hooks/use-goal-milestones'
import type { Hustle } from '@/lib/types'

interface GoalsListProps {
  hustleId?: string
  hustleColor?: string
  globalOnly?: boolean
  title?: string
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function GoalCardSkeleton() {
  return (
    <div className="squircle p-5 animate-pulse space-y-4" style={{ backgroundColor: 'var(--surface-container-low)' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-2xl bg-[var(--surface-container-high)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-40 bg-[var(--surface-container-high)] rounded-full" />
          <div className="h-2 w-24 bg-[var(--surface-container)] rounded-full" />
        </div>
      </div>
      <div className="h-2 w-full bg-[var(--surface-container-high)] rounded-full" />
      <div className="flex justify-between">
        <div className="h-5 w-20 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-5 w-16 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-5 w-12 bg-[var(--surface-container-high)] rounded-full" />
      </div>
    </div>
  )
}

const MILESTONE_TOAST: Record<MilestonePct, { emoji: string; msg: string; color: string }> = {
  25:  { emoji: '🔥', msg: 'You\'re off to a great start!', color: '#f59e0b' },
  50:  { emoji: '⚡', msg: 'Halfway to your goal!',          color: '#3b82f6' },
  75:  { emoji: '🚀', msg: 'Almost there — keep pushing!',   color: '#8b5cf6' },
  100: { emoji: '🎯', msg: 'Goal achieved! Amazing work!',   color: 'var(--secondary)' },
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function GoalsList({ hustleId, hustleColor, globalOnly, title }: GoalsListProps) {
  const filters = hustleId
    ? { hustle_id: hustleId }
    : globalOnly
    ? { type: 'global' as const }
    : undefined

  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals(filters)
  const { hustles } = useHustles()

  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<GoalWithProgress | null>(null)
  // Map of goalId → milestone being flashed on the card
  const [flashMap, setFlashMap] = useState<Record<string, MilestonePct>>({})

  const handleMilestone = useCallback(async ({ goal, milestone }: MilestoneEvent) => {
    const info = MILESTONE_TOAST[milestone]

    // Flash the specific card
    setFlashMap(prev => ({ ...prev, [goal.id]: milestone }))
    setTimeout(() => setFlashMap(prev => { const n = { ...prev }; delete n[goal.id]; return n }), 1400)

    // Toast notification
    toast(
      `${info.emoji} ${Math.round(goal.pct)}% — ${goal.title}`,
      {
        description: info.msg,
        duration: milestone === 100 ? 6000 : 4000,
        style: { borderLeft: `4px solid ${info.color}` },
      }
    )

    // Confetti only for 100%
    if (milestone === 100) {
      // Check reduced-motion preference
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return

      // Lazy-load canvas-confetti so it never blocks initial paint
      const confetti = (await import('canvas-confetti')).default
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#2ca6a4', '#1e3a5f', '#4ade80', '#fbbf24', '#a78bfa'],
        scalar: 0.9,
        gravity: 0.9,
        drift: 0.05,
      })
      // Second burst for flair
      setTimeout(() => confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.45, x: 0.3 },
        colors: ['#2ca6a4', '#1e3a5f', '#4ade80'],
        scalar: 0.75,
        gravity: 1.0,
      }), 250)
    }
  }, [])

  // Wire up milestone detector (always enabled)
  useGoalMilestones(goals, handleMilestone, true)

  const hustleMap = hustles.reduce<Record<string, Hustle>>((m, h) => { m[h.id] = h; return m }, {})

  async function handleSave(data: Parameters<typeof createGoal>[0]) {
    if (editGoal) return updateGoal(editGoal.id, data)
    return createGoal(data)
  }

  function handleEdit(goal: GoalWithProgress) { setEditGoal(goal); setShowForm(true) }
  function handleCloseForm() { setShowForm(false); setEditGoal(null) }

  const headingTitle = title ?? (hustleId ? 'Hustle Goals' : 'Goals')

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: hustleColor ?? 'var(--primary)' }} strokeWidth={1.5} />
          <h2 className="font-headline font-bold text-lg text-[var(--primary)]">{headingTitle}</h2>
          {!loading && goals.length > 0 && (
            <span
              className="font-label text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
            >
              {goals.filter(g => g.is_complete).length}/{goals.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditGoal(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full font-label text-[10px] uppercase tracking-widest font-bold transition-all active:scale-95"
          style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--primary)' }}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add Goal
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3"><GoalCardSkeleton /><GoalCardSkeleton /></div>
      ) : goals.length === 0 ? (
        <div
          className="squircle p-8 flex flex-col items-center text-center gap-4"
          style={{ backgroundColor: 'var(--surface-container-low)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-container-highest)' }}>
            <Target className="w-6 h-6" style={{ color: 'var(--on-surface-variant)' }} strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-headline font-bold text-base text-[var(--on-surface)]">No goals yet</p>
            <p className="font-body text-sm text-[var(--on-surface-variant)] mt-1 leading-relaxed">
              {hustleId
                ? 'Set a target for this hustle and track your progress.'
                : 'Create a global income goal across all your hustles.'}
            </p>
          </div>
          <button
            onClick={() => { setEditGoal(null); setShowForm(true) }}
            className="px-6 py-3 rounded-full text-white font-label text-[10px] font-bold tracking-widest uppercase active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
          >
            Set First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              hustleColor={goal.hustle_id ? (hustleMap[goal.hustle_id]?.color ?? hustleColor) : hustleColor}
              flashMilestone={flashMap[goal.id] ?? null}
              onEdit={handleEdit}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}

      {showForm && (
        <GoalForm
          goal={editGoal}
          defaultType={hustleId ? 'hustle' : globalOnly ? 'global' : undefined}
          defaultHustleId={hustleId}
          hustles={hustles}
          onSave={handleSave}
          onClose={handleCloseForm}
        />
      )}
    </section>
  )
}
