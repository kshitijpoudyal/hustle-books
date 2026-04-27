import { createClient } from '@/lib/supabase/client'
import type { IncomeEntry } from '@/lib/types'

export interface IncomeFilters {
  hustle_id?: string
  date_from?: string
  date_to?: string
}

export async function fetchIncome(filters?: IncomeFilters): Promise<IncomeEntry[]> {
  const supabase = createClient()
  let query = supabase
    .from('income')
    .select('*, hustle:hustles(id, name, color, icon, category)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.hustle_id) query = query.eq('hustle_id', filters.hustle_id)
  if (filters?.date_from) query = query.gte('date', filters.date_from)
  if (filters?.date_to) query = query.lte('date', filters.date_to)

  const { data } = await query
  return (data ?? []) as IncomeEntry[]
}

export interface IncomeInsertPayload {
  user_id: string
  hustle_id: string
  amount: number
  description: string | null
  mileage: number | null
  cogs: number | null
  date: string
  rate_snapshot_id: string | null
  fuel_cost_at_log: number | null
  depreciation_cost_at_log: number | null
  is_taxable: boolean
  receipt_image_url: string | null
}

export async function insertIncome(payload: IncomeInsertPayload): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('income').insert(payload)
  return error?.message ?? null
}

export async function updateIncome(
  id: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('income').update(payload).eq('id', id)
  return error?.message ?? null
}

export async function deleteIncome(id: string): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('income').delete().eq('id', id)
  return error?.message ?? null
}
