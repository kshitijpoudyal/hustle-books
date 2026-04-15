'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Hustle } from '@/lib/types'

export function useHustles() {
  const [hustles, setHustles] = useState<Hustle[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('hustles')
      .select('*')
      .order('created_at', { ascending: true })
    setHustles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createHustle(data: { name: string; color: string; icon: string }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return false }
    const { error } = await supabase.from('hustles').insert({ ...data, user_id: user.id })
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  async function updateHustle(id: string, data: Partial<Pick<Hustle, 'name' | 'color' | 'icon' | 'is_active'>>) {
    const supabase = createClient()
    const { error } = await supabase.from('hustles').update(data).eq('id', id)
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  async function deleteHustle(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('hustles').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  return { hustles, loading, createHustle, updateHustle, deleteHustle, refresh: load }
}
