import { createClient } from '@/lib/supabase/client'
import type { RateSnapshot } from '@/lib/types'

export async function fetchRateSnapshots(): Promise<RateSnapshot[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('rate_snapshots')
    .select('*')
    .order('effective_date', { ascending: false })
  return (data ?? []) as RateSnapshot[]
}

/** Returns snapshot IDs that have at least one linked income entry, with counts. */
export async function fetchLinkedEntryCounts(snapshotIds: string[]): Promise<Record<string, number>> {
  if (snapshotIds.length === 0) return {}
  const supabase = createClient()
  const { data } = await supabase
    .from('income')
    .select('rate_snapshot_id')
    .in('rate_snapshot_id', snapshotIds)
  const countMap: Record<string, number> = {}
  for (const row of (data ?? []) as { rate_snapshot_id: string }[]) {
    if (row.rate_snapshot_id) {
      countMap[row.rate_snapshot_id] = (countMap[row.rate_snapshot_id] ?? 0) + 1
    }
  }
  return countMap
}

export async function insertRateSnapshot(
  userId: string,
  payload: Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('rate_snapshots').insert({ ...payload, user_id: userId })
  return error?.message ?? null
}

export async function updateRateSnapshot(
  id: string,
  payload: Partial<Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>>
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('rate_snapshots').update(payload).eq('id', id)
  return error?.message ?? null
}

export async function deleteRateSnapshot(id: string): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('rate_snapshots').delete().eq('id', id)
  return error?.message ?? null
}
