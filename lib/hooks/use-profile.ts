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
    const [{ data: user }, { data: prof }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('*').single(),
    ])
    setEmail(user.user?.email ?? null)
    setProfile(prof as Profile | null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateProfile(data: Partial<Pick<Profile, 'full_name' | 'settings'>>) {
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update(data).eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
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
