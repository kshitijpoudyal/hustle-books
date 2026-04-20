export interface FlagDefinition {
  key: string
  label: string
  description: string
  defaultValue: boolean
  /** Optional tag for grouping in the dev page */
  tag?: 'experimental' | 'wip' | 'stable'
}

/**
 * Central registry of all feature flags.
 * Add new flags here — the /devpower page renders this list automatically.
 * Defaults apply when localStorage has no entry for the key.
 */
export const FLAG_REGISTRY: FlagDefinition[] = [
  {
    key: 'VOICE_INPUT',
    label: 'Voice Input',
    description: 'Mic button on the Log page for voice-to-text transaction entry.',
    defaultValue: false,
    tag: 'experimental',
  },
]

export type FlagKey = (typeof FLAG_REGISTRY)[number]['key']

const STORAGE_KEY = 'hb_feature_flags'

export function loadFlags(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveFlags(flags: Record<string, boolean>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

/** Resolve the effective value for a key: stored override → default → false */
export function resolveFlag(stored: Record<string, boolean>, key: string): boolean {
  if (key in stored) return stored[key]
  return FLAG_REGISTRY.find(f => f.key === key)?.defaultValue ?? false
}
