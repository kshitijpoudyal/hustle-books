import { createClient } from '@/lib/supabase/client'
import type { FeatureFlag } from '@/lib/types'

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = createClient()
  const { data } = await supabase.from('feature_flags').select('id, key, release_stage, created_at')
  return (data ?? []) as FeatureFlag[]
}

export interface UserFlagRow {
  feature_flag_id: string
  enabled: boolean
}

export async function fetchUserFlagRows(userId: string): Promise<UserFlagRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('feature_flag_users')
    .select('feature_flag_id, enabled')
    .eq('user_id', userId)
  return (data ?? []) as UserFlagRow[]
}

export async function setUserFlagEnabled(
  userId: string,
  flagId: string,
  enabled: boolean
): Promise<string | null> {
  const supabase = createClient()
  const { error } = await supabase
    .from('feature_flag_users')
    .upsert({ user_id: userId, feature_flag_id: flagId, enabled })
  return error?.message ?? null
}
