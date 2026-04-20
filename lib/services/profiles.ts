import { fetchProfile, updateProfile } from '@/lib/data/profiles'
import { getAuthUserId } from '@/lib/data/auth'
import type { Profile } from '@/lib/types'

export async function getProfile(): Promise<{ profile: Profile | null; userId: string | null }> {
  const [profile, userId] = await Promise.all([fetchProfile(), getAuthUserId()])
  return { profile, userId }
}

export async function saveProfile(
  data: Partial<Pick<Profile, 'full_name' | 'settings'>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not authenticated' }
  const error = await updateProfile(userId, data)
  if (error) return { ok: false, error }
  return { ok: true }
}
