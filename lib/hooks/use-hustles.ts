'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import { getHustles, createHustle, editHustle, removeHustle } from '@/lib/services/hustles'
import type { Hustle } from '@/lib/types'
import type { HustleCategory } from '@/lib/utils/constants'

const CACHE_KEY = 'hustles'

export function useHustles() {
  const [hustles, setHustles] = useState<Hustle[]>(() => getCached<Hustle[]>(CACHE_KEY) ?? [])
  const [loading, setLoading] = useState(() => !getCached<Hustle[]>(CACHE_KEY))

  const load = useCallback(async () => {
    const result = await getHustles()
    setCached(CACHE_KEY, result)
    setHustles(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createHustleHandler(data: { name: string; color: string; icon: string; category?: HustleCategory | null }) {
    const result = await createHustle(data)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function updateHustleHandler(id: string, data: Partial<Pick<Hustle, 'name' | 'color' | 'icon' | 'is_active' | 'category'>>) {
    const result = await editHustle(id, data)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function deleteHustleHandler(id: string) {
    const result = await removeHustle(id)
    if (!result.ok) { toast.error(result.error); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  return {
    hustles,
    loading,
    createHustle: createHustleHandler,
    updateHustle: updateHustleHandler,
    deleteHustle: deleteHustleHandler,
    refresh: load,
  }
}

