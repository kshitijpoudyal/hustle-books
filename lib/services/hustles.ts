import { fetchHustles, insertHustle, updateHustle, deleteHustleById } from '@/lib/data/hustles'
import { getAuthUserId } from '@/lib/data/auth'
import type { Hustle } from '@/lib/types'
import type { HustleCategory } from '@/lib/utils/constants'

export async function getHustles(): Promise<Hustle[]> {
  return fetchHustles()
}

export async function createHustle(
  data: { name: string; color: string; icon: string; category?: HustleCategory | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not authenticated' }
  const error = await insertHustle(userId, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function editHustle(
  id: string,
  data: Partial<Pick<Hustle, 'name' | 'color' | 'icon' | 'is_active' | 'category'>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await updateHustle(id, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function removeHustle(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await deleteHustleById(id)
  if (error) return { ok: false, error }
  return { ok: true }
}
