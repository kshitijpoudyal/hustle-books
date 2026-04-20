'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import type { Hustle } from '@/lib/types'
import type { HustleCategory } from '@/lib/utils/constants'

const CACHE_KEY = 'hustles'

export function useHustles() {
  const [hustles, setHustles] = useState<Hustle[]>(() => getCached<Hustle[]>(CACHE_KEY) ?? [])
  const [loading, setLoading] = useState(() => !getCached<Hustle[]>(CACHE_KEY))

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('hustles')
      .select('*')
      .order('created_at', { ascending: true })
    const result = data ?? []
    setCached(CACHE_KEY, result)
    setHustles(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createHustle(data: { name: string; color: string; icon: string; category?: HustleCategory | null }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return false }
    const { error } = await supabase.from('hustles').insert({ ...data, user_id: user.id })
    if (error) { toast.error(error.message); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function updateHustle(id: string, data: Partial<Pick<Hustle, 'name' | 'color' | 'icon' | 'is_active' | 'category'>>) {
    const supabase = createClient()
    const { error } = await supabase.from('hustles').update(data).eq('id', id)
    if (error) { toast.error(error.message); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function deleteHustle(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('hustles').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  return { hustles, loading, createHustle, updateHustle, deleteHustle, refresh: load }
}
