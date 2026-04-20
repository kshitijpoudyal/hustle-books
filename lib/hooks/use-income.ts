'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import { getIncome, createIncome, editIncome, removeIncome } from '@/lib/services/income'
import type { IncomeEntry } from '@/lib/types'
import type { IncomeFilters, CreateIncomeInput, UpdateIncomeInput } from '@/lib/services/income'

export type { IncomeFilters }

export function useIncome(filters?: IncomeFilters) {
  const cacheKey = `income:${filters?.hustle_id ?? ''}:${filters?.date_from ?? ''}:${filters?.date_to ?? ''}`
  const [entries, setEntries] = useState<IncomeEntry[]>(() => getCached<IncomeEntry[]>(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => !getCached<IncomeEntry[]>(cacheKey))

  const load = useCallback(async () => {
    const result = await getIncome(filters)
    setCached(cacheKey, result)
    setEntries(result)
    setLoading(false)
  }, [filters?.hustle_id, filters?.date_from, filters?.date_to, cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createIncomeHandler(data: CreateIncomeInput) {
    const result = await createIncome(data)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  async function updateIncomeHandler(id: string, data: UpdateIncomeInput) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return false
    const result = await editIncome(id, data, entry)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  async function deleteIncomeHandler(id: string) {
    const result = await removeIncome(id)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  return {
    entries,
    loading,
    createIncome: createIncomeHandler,
    updateIncome: updateIncomeHandler,
    deleteIncome: deleteIncomeHandler,
    refresh: load,
  }
}
