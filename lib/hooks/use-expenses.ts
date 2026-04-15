'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ExpenseEntry } from '@/lib/types'

export interface ExpenseFilters {
  hustle_id?: string | null
  date_from?: string
  date_to?: string
  category?: string
}

export function useExpenses(filters?: ExpenseFilters) {
  const [entries, setEntries] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
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
    setEntries((data ?? []) as ExpenseEntry[])
    setLoading(false)
  }, [filters?.hustle_id, filters?.date_from, filters?.date_to, filters?.category]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createExpense(data: {
    hustle_id?: string | null
    amount: number
    category: ExpenseEntry['category']
    description?: string
    is_recurring?: boolean
    date: string
  }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return false }
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      hustle_id: data.hustle_id ?? null,
      amount: data.amount,
      category: data.category,
      description: data.description ?? null,
      is_recurring: data.is_recurring ?? false,
      date: data.date,
    })
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  async function updateExpense(id: string, data: Partial<{
    hustle_id: string | null
    amount: number
    category: ExpenseEntry['category']
    description: string | null
    is_recurring: boolean
    date: string
  }>) {
    const supabase = createClient()
    const { error } = await supabase.from('expenses').update(data).eq('id', id)
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  async function deleteExpense(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  return { entries, loading, createExpense, updateExpense, deleteExpense, refresh: load }
}
