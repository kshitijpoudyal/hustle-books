'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    try {
      // Sequential — avoids two concurrent auth lock acquisitions that race
      // and throw "lock was released because another request stole it"
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase.from('profiles').select('*').single()
      setEmail(user?.email ?? null)
      setProfile(prof as Profile | null)
    } catch (err: unknown) {
      // Lock-stolen warnings from Supabase are not fatal — silently retry once
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('lock') || msg.includes('stole')) {
        setTimeout(load, 500)
        return
      }
      console.error('[useProfile] load error:', err)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function updateProfile(data: Partial<Pick<Profile, 'full_name' | 'settings'>>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user?.id ?? '')
    if (error) { toast.error(error.message); return false }
    await load()
    return true
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { profile, email, loading, updateProfile, signOut, refresh: load }
}
