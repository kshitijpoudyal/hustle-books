import { fetchGoals, fetchIncomeForGoals, insertGoal, updateGoal, deleteGoal } from '@/lib/data/goals'
import { getAuthUserId } from '@/lib/data/auth'
import type { Goal } from '@/lib/types'
import type { GoalFilters } from '@/lib/data/goals'

export type { GoalFilters }

export interface GoalWithProgress extends Goal {
  current_amount: number
  pct: number
  is_complete: boolean
}

function calcProgress(
  goal: Goal,
  incomeRows: { hustle_id: string; amount: number; date: string }[]
): number {
  let rows = incomeRows
  if (goal.type === 'hustle' && goal.hustle_id) rows = rows.filter(r => r.hustle_id === goal.hustle_id)
  if (goal.timeframe_start) rows = rows.filter(r => r.date >= goal.timeframe_start!)
  if (goal.timeframe_end) rows = rows.filter(r => r.date <= goal.timeframe_end!)
  return rows.reduce((s, r) => s + Number(r.amount), 0)
}

export async function getGoals(filters?: GoalFilters): Promise<GoalWithProgress[]> {
  const [rawGoals, incomeRows] = await Promise.all([
    fetchGoals(filters),
    fetchIncomeForGoals(),
  ])
  return rawGoals.map(goal => {
    const current = calcProgress(goal, incomeRows)
    const pct = goal.target_amount > 0 ? Math.min(100, (current / goal.target_amount) * 100) : 0
    return { ...goal, current_amount: current, pct, is_complete: current >= goal.target_amount }
  })
}

export async function createGoal(
  data: {
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id?: string | null
    timeframe_start?: string | null
    timeframe_end?: string | null
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not authenticated' }
  const error = await insertGoal(userId, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function editGoal(
  id: string,
  data: Partial<{
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id: string | null
    timeframe_start: string | null
    timeframe_end: string | null
  }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await updateGoal(id, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function removeGoal(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await deleteGoal(id)
  if (error) return { ok: false, error }
  return { ok: true }
}
