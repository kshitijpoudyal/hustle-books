'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { resolveSnapshot } from '@/lib/utils/rate-resolver'
import { calcFuelCost, calcDepreciationCost, calcMileageDeduction } from '@/lib/utils/calculations'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import type { IncomeEntry, RateSnapshot } from '@/lib/types'

export interface IncomeFilters {
  hustle_id?: string
  date_from?: string
  date_to?: string
}

export function useIncome(filters?: IncomeFilters) {
  const cacheKey = `income:${filters?.hustle_id ?? ''}:${filters?.date_from ?? ''}:${filters?.date_to ?? ''}`
  const [entries, setEntries] = useState<IncomeEntry[]>(() => getCached<IncomeEntry[]>(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => !getCached<IncomeEntry[]>(cacheKey))

  const load = useCallback(async () => {
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
    const result = (data ?? []) as IncomeEntry[]
    setCached(cacheKey, result)
    setEntries(result)
    setLoading(false)
  }, [filters?.hustle_id, filters?.date_from, filters?.date_to, cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function createIncome(data: {
    hustle_id: string
    amount: number
    description?: string
    mileage?: number
    cogs?: number
    date: string
    mileage_method: 'actual' | 'irs'
    is_taxable?: boolean
  }) {
    const supabase = createClient()

    // Resolve snapshot for the entry's date
    const { data: snaps } = await supabase
      .from('rate_snapshots')
      .select('*')
      .order('effective_date', { ascending: false })

    const snapshot = resolveSnapshot((snaps ?? []) as RateSnapshot[], new Date(data.date + 'T00:00:00'))

    let fuel_cost_at_log: number | null = null
    let depreciation_cost_at_log: number | null = null
    let rate_snapshot_id: string | null = null

    if (snapshot && data.mileage) {
      rate_snapshot_id = snapshot.id
      if (data.mileage_method === 'irs') {
        fuel_cost_at_log = calcMileageDeduction(data.mileage, snapshot)
      } else {
        fuel_cost_at_log = calcFuelCost(data.mileage, snapshot)
      }
      depreciation_cost_at_log = calcDepreciationCost(data.mileage, snapshot)
    } else if (snapshot) {
      rate_snapshot_id = snapshot.id
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return false }

    const { error } = await supabase.from('income').insert({
      user_id: user.id,
      hustle_id: data.hustle_id,
      amount: data.amount,
      description: data.description ?? null,
      mileage: data.mileage ?? null,
      cogs: data.cogs ?? null,
      date: data.date,
      rate_snapshot_id,
      fuel_cost_at_log,
      depreciation_cost_at_log,
      is_taxable: data.is_taxable ?? true,
    })

    if (error) { toast.error(error.message); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  async function updateIncome(id: string, data: Partial<{
    hustle_id: string
    amount: number
    description: string | null
    mileage: number | null
    cogs: number | null
    date: string
    mileage_method: 'actual' | 'irs'
    is_taxable: boolean
  }>) {
    const supabase = createClient()
    const entry = entries.find(e => e.id === id)
    if (!entry) return false

    const updatedData: Record<string, unknown> = { ...data }
    delete updatedData.mileage_method

    // If date or mileage changed, re-bake the rate snapshot
    const newDate = data.date ?? entry.date
    const newMileage = data.mileage !== undefined ? data.mileage : entry.mileage
    const method = data.mileage_method ?? 'actual'

    if ((data.date || data.mileage !== undefined) && newMileage) {
      const { data: snaps } = await supabase
        .from('rate_snapshots')
        .select('*')
        .order('effective_date', { ascending: false })

      const snapshot = resolveSnapshot((snaps ?? []) as RateSnapshot[], new Date(newDate + 'T00:00:00'))
      if (snapshot) {
        updatedData.rate_snapshot_id = snapshot.id
        updatedData.fuel_cost_at_log = method === 'irs'
          ? calcMileageDeduction(newMileage, snapshot)
          : calcFuelCost(newMileage, snapshot)
        updatedData.depreciation_cost_at_log = calcDepreciationCost(newMileage, snapshot)
      }
    } else if (data.mileage === null) {
      updatedData.fuel_cost_at_log = null
      updatedData.depreciation_cost_at_log = null
    }

    const { error } = await supabase.from('income').update(updatedData).eq('id', id)
    if (error) { toast.error(error.message); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  async function deleteIncome(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('income').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    invalidateCache(cacheKey)
    invalidateCache('dashboard:raw')
    await load()
    return true
  }

  return { entries, loading, createIncome, updateIncome, deleteIncome, refresh: load }
}
