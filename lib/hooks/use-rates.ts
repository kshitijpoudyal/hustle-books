'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { RateSnapshot } from '@/lib/types'

export interface RateSnapshotWithCount extends RateSnapshot {
  linked_entry_count: number
}

export function useRates() {
  const [snapshots, setSnapshots] = useState<RateSnapshotWithCount[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: snaps } = await supabase
      .from('rate_snapshots')
      .select('*')
      .order('effective_date', { ascending: false })

    if (!snaps) { setLoading(false); return }

    // Get linked entry counts
    const ids = snaps.map((s: RateSnapshot) => s.id)
    const { data: counts } = await supabase
      .from('income')
      .select('rate_snapshot_id')
      .in('rate_snapshot_id', ids)

    const countMap: Record<string, number> = {}
    for (const row of counts ?? []) {
      if (row.rate_snapshot_id) {
        countMap[row.rate_snapshot_id] = (countMap[row.rate_snapshot_id] ?? 0) + 1
      }
    }

    setSnapshots(snaps.map((s: RateSnapshot) => ({ ...s, linked_entry_count: countMap[s.id] ?? 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const activeSnapshot = snapshots[0] ?? null

  async function createSnapshot(data: Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return false }

    // Upsert: if snapshot exists for this date, update it (unless locked)
    const existing = snapshots.find(s => s.effective_date === data.effective_date)
    if (existing) {
      if (existing.is_locked) { toast.error('This date has a locked snapshot. Unlock it first.'); return false }
      const { error } = await supabase.from('rate_snapshots').update(data).eq('id', existing.id)
      if (error) { toast.error(error.message); return false }
    } else {
      const { error } = await supabase.from('rate_snapshots').insert({ ...data, user_id: user.id })
      if (error) { toast.error(error.message); return false }
    }
    await load()
    return true
  }

  async function updateSnapshot(id: string, data: Partial<Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>>) {
    const snap = snapshots.find(s => s.id === id)
    if (!snap) return false
    if (snap.is_locked) { toast.error('Snapshot is locked. Unlock it first.'); return false }
    if (snap.linked_entry_count > 0) { toast.error('Snapshot has linked entries and cannot be edited.'); return false }

    const supabase = createClient()
    const { error } = await supabase.from('rate_snapshots').update(data).eq('id', id)
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  async function deleteSnapshot(id: string) {
    const snap = snapshots.find(s => s.id === id)
    if (!snap) return false
    if (snap.linked_entry_count > 0) { toast.error(`${snap.linked_entry_count} entries use these rates — cannot delete.`); return false }

    const supabase = createClient()
    const { error } = await supabase.from('rate_snapshots').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  async function toggleLock(id: string, locked: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from('rate_snapshots').update({ is_locked: locked }).eq('id', id)
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  return { snapshots, activeSnapshot, loading, createSnapshot, updateSnapshot, deleteSnapshot, toggleLock, refresh: load }
}
