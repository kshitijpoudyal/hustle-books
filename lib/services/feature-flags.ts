import {
  fetchFeatureFlags,
  fetchUserFlagRows,
  setUserFlagEnabled,
} from '@/lib/data/feature-flags'
import { FLAG_REGISTRY, UserGroup } from '@/lib/feature-flags'
import type { FeatureFlag } from '@/lib/types'

export interface ResolvedFlags {
  /** Map of flag key → boolean for all flags visible to this user */
  stored: Record<string, boolean>
  /** Keys of flags visible/toggleable to this user (non-disabled, filtered by group) */
  visibleFlagKeys: Set<string>
  /** Map of flag key → feature_flags.id (needed for enable/disable) */
  keyToId: Record<string, string>
  /** Map of flag key → release_stage from DB (source of truth for badges) */
  keyToStage: Record<string, string>
}

export async function loadUserFlags(
  userId: string,
  userGroup: UserGroup = UserGroup.PUBLIC
): Promise<ResolvedFlags> {
  const [flagDefs, userRows] = await Promise.all([
    fetchFeatureFlags(),
    fetchUserFlagRows(userId),
  ])

  const keyToId: Record<string, string> = {}
  const keyToStage: Record<string, string> = {}
  const visibleFlagKeys = new Set<string>()
  const stored: Record<string, boolean> = {}

  const enabledByFlagId = new Map(userRows.map(r => [r.feature_flag_id, r.enabled]))

  for (const def of flagDefs as FeatureFlag[]) {
    // Disabled flags are off for everyone — skip entirely
    if (def.release_stage === 'disabled') continue

    keyToId[def.key] = def.id
    keyToStage[def.key] = def.release_stage

    if (def.release_stage === 'production') {
      // Production flags: visible to all users, enabled based on their DB row
      visibleFlagKeys.add(def.key)
      stored[def.key] = enabledByFlagId.get(def.id) ?? true
    } else if (def.release_stage === 'beta') {
      if (userGroup === UserGroup.INTERNAL) {
        // Beta flags: only visible to internal users
        visibleFlagKeys.add(def.key)
        stored[def.key] = enabledByFlagId.get(def.id) ?? false
      }
      // beta + public → skip; feature remains hidden
    }
  }

  return { stored, visibleFlagKeys, keyToId, keyToStage }
}

export async function enableFlag(
  userId: string,
  flagKey: string,
  keyToId: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const flagId = keyToId[flagKey]
  if (!flagId) return { ok: false, error: `Unknown flag: ${flagKey}` }
  const error = await setUserFlagEnabled(userId, flagId, true)
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
  const error = await setUserFlagEnabled(userId, flagId, false)
  if (error) return { ok: false, error }
  return { ok: true }
}

/** Resolves the effective value for a key from the stored map. Defaults to false. */
export function resolveFlag(stored: Record<string, boolean>, key: string): boolean {
  return stored[key] ?? false
}

/** Returns flag definitions that are NOT disabled, filtered by user group */
export function getVisibleFlagDefs(userGroup: UserGroup) {
  return FLAG_REGISTRY.filter(def => {
    if (def.releaseStage === 'disabled') return false
    if (def.releaseStage === 'beta' && userGroup !== UserGroup.INTERNAL) return false
    return true
  })
}
