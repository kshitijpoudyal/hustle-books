'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import { getGoals, createGoal, editGoal, removeGoal } from '@/lib/services/goals'
import type { GoalWithProgress, GoalFilters } from '@/lib/services/goals'

export type { GoalWithProgress, GoalFilters }

export function useGoals(filters?: GoalFilters) {
  const cacheKey = `goals:${filters?.type ?? ''}:${filters?.hustle_id ?? ''}`
  const [goals, setGoals] = useState<GoalWithProgress[]>(() => getCached<GoalWithProgress[]>(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => !getCached<GoalWithProgress[]>(cacheKey))

  const load = useCallback(async () => {
    const result = await getGoals(filters)
    setCached(cacheKey, result)
    setGoals(result)
    setLoading(false)
  }, [filters?.type, filters?.hustle_id, cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createGoalHandler(data: {
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id?: string | null
    timeframe_start?: string | null
    timeframe_end?: string | null
  }) {
    const result = await createGoal(data)
    if (!result.ok) { toast.error(result.error); return false }
    toast.success('Goal created')
    invalidateCache(cacheKey)
    await load()
    return true
  }

  async function updateGoalHandler(id: string, data: Partial<{
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id: string | null
    timeframe_start: string | null
    timeframe_end: string | null
  }>) {
    const result = await editGoal(id, data)
    if (!result.ok) { toast.error(result.error); return false }
    toast.success('Goal updated')
    invalidateCache(cacheKey)
    await load()
    return true
  }

  async function deleteGoalHandler(id: string) {
    const result = await removeGoal(id)
    if (!result.ok) { toast.error(result.error); return false }
    toast.success('Goal deleted')
    invalidateCache(cacheKey)
    await load()
    return true
  }

  return {
    goals,
    loading,
    createGoal: createGoalHandler,
    updateGoal: updateGoalHandler,
    deleteGoal: deleteGoalHandler,
    refresh: load,
  }
}
