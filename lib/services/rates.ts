import {
  fetchRateSnapshots,
  fetchLinkedEntryCounts,
  insertRateSnapshot,
  updateRateSnapshot,
  deleteRateSnapshot,
} from '@/lib/data/rates'
import { getAuthUserId } from '@/lib/data/auth'
import type { RateSnapshot } from '@/lib/types'

export interface RateSnapshotWithCount extends RateSnapshot {
  linked_entry_count: number
}

export async function getRateSnapshots(): Promise<RateSnapshotWithCount[]> {
  const snaps = await fetchRateSnapshots()
  const countMap = await fetchLinkedEntryCounts(snaps.map(s => s.id))
  return snaps.map(s => ({ ...s, linked_entry_count: countMap[s.id] ?? 0 }))
}

export async function createSnapshot(
  data: Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>,
  existingSnapshots: RateSnapshotWithCount[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not authenticated' }

  // Business rule: one snapshot per effective_date — update if exists and not locked
  const existing = existingSnapshots.find(s => s.effective_date === data.effective_date)
  if (existing) {
    if (existing.is_locked) return { ok: false, error: 'This date has a locked snapshot. Unlock it first.' }
    const error = await updateRateSnapshot(existing.id, data)
    if (error) return { ok: false, error }
    return { ok: true }
  }

  const error = await insertRateSnapshot(userId, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function editSnapshot(
  id: string,
  data: Partial<Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>>,
  existing: RateSnapshotWithCount
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (existing.is_locked) return { ok: false, error: 'Snapshot is locked. Unlock it first.' }
  if (existing.linked_entry_count > 0) return { ok: false, error: 'Snapshot has linked entries and cannot be edited.' }
  const error = await updateRateSnapshot(id, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function removeSnapshot(
  id: string,
  existing: RateSnapshotWithCount
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (existing.linked_entry_count > 0) {
    return { ok: false, error: `${existing.linked_entry_count} entries use these rates — cannot delete.` }
  }
  const error = await deleteRateSnapshot(id)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function setSnapshotLock(
  id: string,
  locked: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await updateRateSnapshot(id, { is_locked: locked })
  if (error) return { ok: false, error }
  return { ok: true }
}
