'use client'

import { useEffect, useRef } from 'react'
import type { GoalWithProgress } from './use-goals'

export type MilestonePct = 25 | 50 | 75 | 100

export interface MilestoneEvent {
  goal: GoalWithProgress
  milestone: MilestonePct
}

const MILESTONES: MilestonePct[] = [25, 50, 75, 100]

/** sessionStorage key for milestones below 100% (resets per browser session) */
const sessionKey = (goalId: string) => `hb_ms_${goalId}`
/** localStorage key for 100% completion (persists — so we don't re-confetti every visit) */
const completeKey = (goalId: string) => `hb_ms100_${goalId}`

function getSessionMilestone(goalId: string): number {
  try { return parseInt(sessionStorage.getItem(sessionKey(goalId)) ?? '0', 10) || 0 } catch { return 0 }
}
function setSessionMilestone(goalId: string, ms: number) {
  try { sessionStorage.setItem(sessionKey(goalId), String(ms)) } catch { /* noop */ }
}
function hasCompletedCelebration(goalId: string): boolean {
  try { return localStorage.getItem(completeKey(goalId)) === '1' } catch { return false }
}
function markCompletedCelebration(goalId: string) {
  try { localStorage.setItem(completeKey(goalId), '1') } catch { /* noop */ }
}

/**
 * Detects milestone crossings for a list of goals and calls `onMilestone`
 * for each newly crossed milestone.
 *
 * - 25 / 50 / 75 → tracked in sessionStorage (resets per tab/session)
 * - 100          → tracked in localStorage (fires only once per goal ever)
 */
export function useGoalMilestones(
  goals: GoalWithProgress[],
  onMilestone: (event: MilestoneEvent) => void,
  enabled: boolean,
) {
  // Ref so the callback identity doesn't cause re-runs
  const onMilestoneRef = useRef(onMilestone)
  onMilestoneRef.current = onMilestone

  // Track which goal IDs we've already processed in this render cycle
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || goals.length === 0) return

    for (const goal of goals) {
      const currentPct = goal.pct

      // Find the highest milestone the goal has reached
      const reached = MILESTONES.filter(ms => currentPct >= ms)
      const highestReached = reached.length > 0 ? reached[reached.length - 1] : 0

      if (highestReached === 0) continue

      if (highestReached === 100) {
        // Only fire 100% once per goal (localStorage), and only if not already processed this mount
        if (!hasCompletedCelebration(goal.id) && !processedRef.current.has(`${goal.id}-100`)) {
          processedRef.current.add(`${goal.id}-100`)
          markCompletedCelebration(goal.id)
          onMilestoneRef.current({ goal, milestone: 100 })
        }
      } else {
        // For 25/50/75: fire if we've crossed into a new tier since last session check
        const prevHighest = getSessionMilestone(goal.id)
        if (highestReached > prevHighest && !processedRef.current.has(`${goal.id}-${highestReached}`)) {
          processedRef.current.add(`${goal.id}-${highestReached}`)
          setSessionMilestone(goal.id, highestReached)
          onMilestoneRef.current({ goal, milestone: highestReached as MilestonePct })
        }
      }
    }
  }, [goals, enabled]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Returns the highest milestone tier reached for a given pct */
export function getMilestoneTier(pct: number): MilestonePct | null {
  if (pct >= 100) return 100
  if (pct >= 75) return 75
  if (pct >= 50) return 50
  if (pct >= 25) return 25
  return null
}
