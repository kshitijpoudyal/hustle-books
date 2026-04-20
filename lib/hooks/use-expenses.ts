'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import { getExpenses, createExpense, editExpense, removeExpense } from '@/lib/services/expenses'
import type { ExpenseEntry } from '@/lib/types'
import type { ExpenseFilters } from '@/lib/services/expenses'

export type { ExpenseFilters }

export function useExpenses(filters?: ExpenseFilters) {
  const cacheKey = `expenses:${filters?.hustle_id ?? ''}:${filters?.date_from ?? ''}:${filters?.date_to ?? ''}:${filters?.category ?? ''}`
  const [entries, setEntries] = useState<ExpenseEntry[]>(() => getCached<ExpenseEntry[]>(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => !getCached<ExpenseEntry[]>(cacheKey))

  const load = useCallback(async () => {
    const result = await getExpenses(filters)
    setCached(cacheKey, result)
    setEntries(result)
    setLoading(false)
  }, [filters?.hustle_id, filters?.date_from, filters?.date_to, filters?.category, cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createExpenseHandler(data: {
    hustle_id?: string | null
    amount: number
    category: ExpenseEntry['category']
    description?: string
    is_recurring?: boolean
    date: string
  }) {
    const result = await createExpense(data)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  async function updateExpenseHandler(id: string, data: Partial<{
    hustle_id: string | null
    amount: number
    category: ExpenseEntry['category']
    description: string | null
    is_recurring: boolean
    date: string
  }>) {
    const result = await editExpense(id, data)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  async function deleteExpenseHandler(id: string) {
    const result = await removeExpense(id)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  return {
    entries,
    loading,
    createExpense: createExpenseHandler,
    updateExpense: updateExpenseHandler,
    deleteExpense: deleteExpenseHandler,
    refresh: load,
  }
}
