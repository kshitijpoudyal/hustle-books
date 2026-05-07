export enum FeatureReleaseStage {
  DISABLED = "disabled",    // feature off for ALL users; no toggle possible
  BETA = "beta",            // internal users only; default enabled=false
  PRODUCTION = "production",// all users; default enabled=true; toggleable by internal
}

export enum UserGroup {
  INTERNAL = "internal",
  PUBLIC = "public",
}

export interface FlagDefinition {
  key: string
  label: string
  description: string
  /** Release stage — controls visibility by user group and serves as the visual tag */
  releaseStage: FeatureReleaseStage
}

/**
 * Central registry of all feature flags.
 * Add new flags here — the /devpower page renders this list automatically.
 * The enabled state is DB-driven (feature_flag_users.enabled). This registry
 * provides only UI metadata (label, description, stage).
 */
export const FLAG_REGISTRY: FlagDefinition[] = [
  {
    key: 'GOAL_MILESTONES',
    label: 'Income Goals',
    description: 'Income goal tracking on the Dashboard and Hustle Details pages. Includes progress cards, confetti, and milestone toasts.',
    releaseStage: FeatureReleaseStage.BETA,
  },
  {
    key: 'DATE_SHORTCUTS',
    label: 'Date Shortcuts',
    description: 'Today / Yesterday quick-pick buttons above the date field in the Log form. Reduces friction for the most common log dates.',
    releaseStage: FeatureReleaseStage.BETA,
  },
]

export type FlagKey = (typeof FLAG_REGISTRY)[number]['key']
