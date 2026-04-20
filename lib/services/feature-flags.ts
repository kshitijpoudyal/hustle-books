import {
  fetchFeatureFlags,
  fetchUserEnrollments,
  enrollUserInFlag,
  unenrollUserFromFlag,
} from '@/lib/data/feature-flags'
import { FLAG_REGISTRY } from '@/lib/feature-flags'
import type { FeatureFlag } from '@/lib/types'

export interface ResolvedFlags {
  /** Map of flag key → true for all flags the user is enrolled in */
  stored: Record<string, boolean>
  /** Keys of flags where is_public = true */
  publicFlagKeys: Set<string>
  /** Map of flag key → feature_flags.id (needed for enroll/unenroll) */
  keyToId: Record<string, string>
}

export async function loadUserFlags(userId: string): Promise<ResolvedFlags> {
  const [flagDefs, enrolledIds] = await Promise.all([
    fetchFeatureFlags(),
    fetchUserEnrollments(userId),
  ])

  const keyToId: Record<string, string> = {}
  const publicFlagKeys = new Set<string>()

  for (const def of flagDefs as FeatureFlag[]) {
    keyToId[def.key] = def.id
    if (def.is_public) publicFlagKeys.add(def.key)
  }

  const idToKey = Object.fromEntries(Object.entries(keyToId).map(([k, v]) => [v, k]))
  const stored: Record<string, boolean> = {}
  for (const flagId of enrolledIds) {
    const key = idToKey[flagId]
    if (key) stored[key] = true
  }

  return { stored, publicFlagKeys, keyToId }
}

export async function enableFlag(
  userId: string,
  flagKey: string,
  keyToId: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const flagId = keyToId[flagKey]
  if (!flagId) return { ok: false, error: `Unknown flag: ${flagKey}` }
  const error = await enrollUserInFlag(userId, flagId)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function disableFlag(
  userId: string,
  flagKey: string,
  keyToId: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const flagId = keyToId[flagKey]
  if (!flagId) return { ok: false, error: `Unknown flag: ${flagKey}` }
  const error = await unenrollUserFromFlag(userId, flagId)
  if (error) return { ok: false, error }
  return { ok: true }
}

/** Resolves the effective value for a key: enrolled → defaultValue → false */
export function resolveFlag(stored: Record<string, boolean>, key: string): boolean {
  if (key in stored) return stored[key]
  return FLAG_REGISTRY.find(f => f.key === key)?.defaultValue ?? false
}
