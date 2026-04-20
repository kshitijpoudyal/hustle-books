'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getCached, setCached, invalidateCache } from '@/lib/utils/query-cache'
import type { Profile } from '@/lib/types'

const CACHE_KEY = 'profile'

export function useProfile() {
  type Cached = { profile: Profile | null; email: string | null }
  const seed = getCached<Cached>(CACHE_KEY)

  const [profile, setProfile] = useState<Profile | null>(seed?.profile ?? null)
  const [email, setEmail] = useState<string | null>(seed?.email ?? null)
  const [loading, setLoading] = useState(!seed)

  const load = useCallback(async () => {
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase.from('profiles').select('*').single()
      const result: Cached = { profile: prof as Profile | null, email: user?.email ?? null }
      setCached(CACHE_KEY, result)
      setEmail(result.email)
      setProfile(result.profile)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('lock') || msg.includes('stole')) { setTimeout(load, 500); return }
      console.error('[useProfile] load error:', err)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function updateProfile(data: Partial<Pick<Profile, 'full_name' | 'settings'>>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update(data).eq('id', user?.id ?? '')
    if (error) { toast.error(error.message); return false }
    invalidateCache(CACHE_KEY)
    await load()
    return true
  }

  async function signOut() {
    const supabase = createClient()
    invalidateCache(CACHE_KEY)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { profile, email, loading, updateProfile, signOut, refresh: load }
}
