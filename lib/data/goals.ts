import { createClient } from '@/lib/supabase/client'
import type { Goal } from '@/lib/types'

export interface GoalFilters {
  type?: 'hustle' | 'global'
  hustle_id?: string
}

export async function fetchGoals(filters?: GoalFilters): Promise<Goal[]> {
  const supabase = createClient()
  let query = supabase.from('goals').select('*').order('created_at', { ascending: true })
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.hustle_id) query = query.eq('hustle_id', filters.hustle_id)
  const { data } = await query
  return (data ?? []) as Goal[]
}

/** Fetches minimal income rows needed for progress calculation. */
export async function fetchIncomeForGoals(): Promise<{ hustle_id: string; amount: number; date: string }[]> {
  const supabase = createClient()
  const { data } = await supabase.from('income').select('hustle_id, amount, date')
  return (data ?? []) as { hustle_id: string; amount: number; date: string }[]
}

export async function insertGoal(
  userId: string,
  payload: {
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id?: string | null
    timeframe_start?: string | null
    timeframe_end?: string | null
  }
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('goals').insert({
    user_id: userId,
    title: payload.title.trim(),
    target_amount: payload.target_amount,
    type: payload.type,
    hustle_id: payload.hustle_id ?? null,
    timeframe_start: payload.timeframe_start ?? null,
    timeframe_end: payload.timeframe_end ?? null,
  })
  return error?.message ?? null
}

export async function updateGoal(
  id: string,
  payload: Partial<{
    title: string
    target_amount: number
    type: 'hustle' | 'global'
    hustle_id: string | null
    timeframe_start: string | null
    timeframe_end: string | null
  }>
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase
    .from('goals')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error?.message ?? null
}

export async function deleteGoal(id: string): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('goals').delete().eq('id', id)
  return error?.message ?? null
}
