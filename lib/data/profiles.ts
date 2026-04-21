import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export async function fetchProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data } = await supabase.from('users').select('*').single()
  return (data as Profile | null) ?? null
}

export async function updateProfile(
  userId: string,
  payload: Partial<Pick<Profile, 'full_name' | 'settings'>>
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('users').update(payload).eq('id', userId)
  return error?.message ?? null
}
