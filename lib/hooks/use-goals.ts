'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import type { Goal } from '@/lib/types'

export interface GoalWithProgress extends Goal {
  current_amount: number
  pct: number          // 0–100+ (can exceed 100)
  is_complete: boolean
}

export interface GoalFilters {
  type?: 'hustle' | 'global'
  hustle_id?: string
}

function calcProgress(goal: Goal, incomeRows: { hustle_id: string; amount: number; date: string }[]): number {
  let rows = incomeRows

  if (goal.type === 'hustle' && goal.hustle_id) {
    rows = rows.filter(r => r.hustle_id === goal.hustle_id)
  }

  if (goal.timeframe_start) {
    rows = rows.filter(r => r.date >= goal.timeframe_start!)
  }
  if (goal.timeframe_end) {
    rows = rows.filter(r => r.date <= goal.timeframe_end!)
  }

  return rows.reduce((s, r) => s + Number(r.amount), 0)
}

export function useGoals(filters?: GoalFilters) {
  const cacheKey = `goals:${filters?.type ?? ''}:${filters?.hustle_id ?? ''}`
  const [goals, setGoals] = useState<GoalWithProgress[]>(() => getCached<GoalWithProgress[]>(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => !getCached<GoalWithProgress[]>(cacheKey))

  const load = useCallback(async () => {
    const supabase = createClient()

    let goalsQuery = supabase.from('goals').select('*').order('created_at', { ascending: true })

    if (filters?.type) goalsQuery = goalsQuery.eq('type', filters.type)
    if (filters?.hustle_id) goalsQuery = goalsQuery.eq('hustle_id', filters.hustle_id)

    const [goalsRes, incomeRes] = await Promise.all([
      goalsQuery,
      supabase.from('income').select('hustle_id, amount, date'),
    ])

    const incomeRows = (incomeRes.data ?? []) as { hustle_id: string; amount: number; date: string }[]
    const rawGoals = (goalsRes.data ?? []) as Goal[]

    const withProgress: GoalWithProgress[] = rawGoals.map(goal => {
      const current = calcProgress(goal, incomeRows)
      const pct = goal.target_amount > 0 ? Math.min(100, (current / goal.target_amount) * 100) : 0
      return { ...goal, current_amount: current, pct, is_complete: current >= goal.target_amount }
    })

    setCached(cacheKey, withProgress)
    setGoals(withProgress)
    setLoading(false)
  }, [filters?.type, filters?.hustle_id, cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createGoal(data: {
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id?: string | null
    timeframe_start?: string | null
    timeframe_end?: string | null
  }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return false }

    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      title: data.title.trim(),
      target_amount: data.target_amount,
      type: data.type,
      hustle_id: data.hustle_id ?? null,
      timeframe_start: data.timeframe_start ?? null,
      timeframe_end: data.timeframe_end ?? null,
    })

    if (error) { toast.error(error.message); return false }
    toast.success('Goal created')
    invalidateCache(cacheKey)
    await load()
    return true
  }

  async function updateGoal(id: string, data: Partial<{
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id: string | null
    timeframe_start: string | null
    timeframe_end: string | null
  }>) {
    const supabase = createClient()
    const { error } = await supabase.from('goals').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error(error.message); return false }
    toast.success('Goal updated')
    invalidateCache(cacheKey)
    await load()
    return true
  }

  async function deleteGoal(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    toast.success('Goal deleted')
    invalidateCache(cacheKey)
    await load()
    return true
  }

  return { goals, loading, createGoal, updateGoal, deleteGoal, refresh: load }
}
