import { createClient } from '@/lib/supabase/client'

/** Returns the authenticated user's ID, or null if not logged in. */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
