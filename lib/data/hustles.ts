import { createClient } from '@/lib/supabase/client'
import type { Hustle } from '@/lib/types'
import type { HustleCategory } from '@/lib/utils/constants'

export async function fetchHustles(): Promise<Hustle[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('hustles')
    .select('*')
    .order('created_at', { ascending: true })
  return (data ?? []) as Hustle[]
}

export async function insertHustle(
  userId: string,
  payload: { name: string; color: string; icon: string; category?: HustleCategory | null }
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('hustles').insert({ ...payload, user_id: userId })
  return error?.message ?? null
}

export async function updateHustle(
  id: string,
  payload: Partial<Pick<Hustle, 'name' | 'color' | 'icon' | 'is_active' | 'category'>>
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('hustles').update(payload).eq('id', id)
  return error?.message ?? null
}

export async function deleteHustleById(id: string): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase.from('hustles').delete().eq('id', id)
  return error?.message ?? null
}
