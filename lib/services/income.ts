import { fetchIncome, insertIncome, updateIncome, deleteIncome } from '@/lib/data/income'
import { fetchRateSnapshots } from '@/lib/data/rates'
import { getAuthUserId } from '@/lib/data/auth'
import { resolveSnapshot } from '@/lib/utils/rate-resolver'
import { calcFuelCost, calcDepreciationCost, calcMileageDeduction } from '@/lib/utils/calculations'
import type { IncomeEntry, RateSnapshot } from '@/lib/types'
import type { IncomeFilters } from '@/lib/data/income'

export type { IncomeFilters }

export async function getIncome(filters?: IncomeFilters): Promise<IncomeEntry[]> {
  return fetchIncome(filters)
}

export interface CreateIncomeInput {
  hustle_id: string
  amount: number
  description?: string
  mileage?: number
  cogs?: number
  date: string
  mileage_method: 'actual' | 'irs'
  is_taxable?: boolean
  receipt_image_url?: string | null
}

/** Resolves the correct rate snapshot for the entry's date and bakes in fuel/depreciation costs. */
async function resolveCosts(
  mileage: number | undefined,
  date: string,
  mileageMethod: 'actual' | 'irs'
): Promise<{ rate_snapshot_id: string | null; fuel_cost_at_log: number | null; depreciation_cost_at_log: number | null }> {
  const snaps = await fetchRateSnapshots()
  const snapshot = resolveSnapshot(snaps as RateSnapshot[], new Date(date + 'T00:00:00'))

  if (!snapshot) return { rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null }

  if (!mileage) return { rate_snapshot_id: snapshot.id, fuel_cost_at_log: null, depreciation_cost_at_log: null }

  const fuel_cost_at_log = mileageMethod === 'irs'
    ? calcMileageDeduction(mileage, snapshot)
    : calcFuelCost(mileage, snapshot)
  const depreciation_cost_at_log = calcDepreciationCost(mileage, snapshot)

  return { rate_snapshot_id: snapshot.id, fuel_cost_at_log, depreciation_cost_at_log }
}

export async function createIncome(
  data: CreateIncomeInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not authenticated' }

  const { rate_snapshot_id, fuel_cost_at_log, depreciation_cost_at_log } =
    await resolveCosts(data.mileage, data.date, data.mileage_method)

  const error = await insertIncome({
    user_id: userId,
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
    receipt_image_url: data.receipt_image_url ?? null,
  })

  if (error) return { ok: false, error }
  return { ok: true }
}

export interface UpdateIncomeInput {
  hustle_id?: string
  amount?: number
  description?: string | null
  mileage?: number | null
  cogs?: number | null
  date?: string
  mileage_method?: 'actual' | 'irs'
  is_taxable?: boolean
  receipt_image_url?: string | null
}

export async function editIncome(
  id: string,
  data: UpdateIncomeInput,
  currentEntry: IncomeEntry
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = { ...data }
  delete payload.mileage_method

  const newDate = data.date ?? currentEntry.date
  const newMileage = data.mileage !== undefined ? data.mileage : currentEntry.mileage
  const method = data.mileage_method ?? 'actual'

  if ((data.date || data.mileage !== undefined) && newMileage) {
    const { rate_snapshot_id, fuel_cost_at_log, depreciation_cost_at_log } =
      await resolveCosts(newMileage, newDate, method)
    payload.rate_snapshot_id = rate_snapshot_id
    payload.fuel_cost_at_log = fuel_cost_at_log
    payload.depreciation_cost_at_log = depreciation_cost_at_log
  } else if (data.mileage === null) {
    payload.fuel_cost_at_log = null
    payload.depreciation_cost_at_log = null
  }

  const error = await updateIncome(id, payload)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function removeIncome(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await deleteIncome(id)
  if (error) return { ok: false, error }
  return { ok: true }
}
