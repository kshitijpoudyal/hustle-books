'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import { getRateSnapshots, createSnapshot, editSnapshot, removeSnapshot, setSnapshotLock } from '@/lib/services/rates'
import type { RateSnapshot } from '@/lib/types'
import type { RateSnapshotWithCount } from '@/lib/services/rates'

export type { RateSnapshotWithCount }

const CACHE_KEY = 'rate_snapshots'

export function useRates() {
  const [snapshots, setSnapshots] = useState<RateSnapshotWithCount[]>(
    () => getCached<RateSnapshotWithCount[]>(CACHE_KEY) ?? []
  )
  const [loading, setLoading] = useState(() => !getCached<RateSnapshotWithCount[]>(CACHE_KEY))

  const load = useCallback(async () => {
    const result = await getRateSnapshots()
    setCached(CACHE_KEY, result)
    setSnapshots(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const activeSnapshot = snapshots[0] ?? null

  async function createSnapshotHandler(data: Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>) {
    const result = await createSnapshot(data, snapshots)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function updateSnapshotHandler(id: string, data: Partial<Omit<RateSnapshot, 'id' | 'user_id' | 'created_at'>>) {
    const existing = snapshots.find(s => s.id === id)
    if (!existing) return false
    const result = await editSnapshot(id, data, existing)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function deleteSnapshotHandler(id: string) {
    const existing = snapshots.find(s => s.id === id)
    if (!existing) return false
    const result = await removeSnapshot(id, existing)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function toggleLock(id: string, locked: boolean) {
    const result = await setSnapshotLock(id, locked)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  return {
    snapshots,
    activeSnapshot,
    loading,
    createSnapshot: createSnapshotHandler,
    updateSnapshot: updateSnapshotHandler,
    deleteSnapshot: deleteSnapshotHandler,
    toggleLock,
    refresh: load,
  }
}

