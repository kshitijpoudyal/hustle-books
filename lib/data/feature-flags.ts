import { createClient } from '@/lib/supabase/client'
import type { FeatureFlag } from '@/lib/types'

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = createClient()
  const { data } = await supabase.from('feature_flags').select('id, key, is_public, created_at')
  return (data ?? []) as FeatureFlag[]
}

export async function fetchUserEnrollments(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('feature_flag_users')
    .select('feature_flag_id')
    .eq('user_id', userId)
  return ((data ?? []) as { feature_flag_id: string }[]).map(r => r.feature_flag_id)
}

export async function enrollUserInFlag(userId: string, flagId: string): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase
    .from('feature_flag_users')
    .upsert({ user_id: userId, feature_flag_id: flagId })
  return error?.message ?? null
}

export async function unenrollUserFromFlag(userId: string, flagId: string): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase
    .from('feature_flag_users')
    .delete()
    .eq('user_id', userId)
    .eq('feature_flag_id', flagId)
  return error?.message ?? null
}
