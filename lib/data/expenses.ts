import { createClient } from '@/lib/supabase/client'
import type { ExpenseEntry } from '@/lib/types'

export interface ExpenseFilters {
  hustle_id?: string | null
  date_from?: string
  date_to?: string
  category?: string
}

export async function fetchExpenses(filters?: ExpenseFilters): Promise<ExpenseEntry[]> {
  const supabase = createClient()
  let query = supabase
    .from('expenses')
    .select('*, hustle:hustles(id, name, color, icon)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.hustle_id) query = query.eq('hustle_id', filters.hustle_id)
  if (filters?.date_from) query = query.gte('date', filters.date_from)
  if (filters?.date_to) query = query.lte('date', filters.date_to)
  if (filters?.category) query = query.eq('category', filters.category)

  const { data } = await query
  return (data ?? []) as ExpenseEntry[]
}

export async function insertExpense(
  userId: string,
  payload: {
    hustle_id?: string | null
    amount: number
    category: ExpenseEntry['category']
    description?: string
    is_recurring?: boolean
    date: string
    receipt_image_url?: string | null
  }
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').insert({
    user_id: userId,
    hustle_id: payload.hustle_id ?? null,
    amount: payload.amount,
    category: payload.category,
    description: payload.description ?? null,
    is_recurring: payload.is_recurring ?? false,
    date: payload.date,
    receipt_image_url: payload.receipt_image_url ?? null,
  })
  return error?.message ?? null
}

export async function updateExpense(
  id: string,
  payload: Partial<Pick<ExpenseEntry, 'amount' | 'category' | 'description' | 'hustle_id' | 'is_recurring' | 'date' | 'receipt_image_url'>>
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').update(payload).eq('id', id)
  return error?.message ?? null
}

export async function deleteExpense(id: string): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  return error?.message ?? null
}
