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
  {
    key: 'LOG_AGAIN',
    label: 'Log Again',
    description: 'Pre-fill the income form from your last entry. Tap "Log Again" to copy hustle, mileage, and description — just update the amount.',
    releaseStage: FeatureReleaseStage.BETA,
  },
  {
    key: 'MILEAGE_PRESETS',
    label: 'Mileage Preset Chips',
    description: '+5 / +10 / +15 / +25 tap chips below the mileage input for quick entry without typing.',
    releaseStage: FeatureReleaseStage.BETA,
  },
  {
    key: 'SWIPE_ACTIONS',
    label: 'Swipe Actions in History',
    description: 'Swipe left on any transaction row in History to reveal Edit and Delete quick actions.',
    releaseStage: FeatureReleaseStage.BETA,
  },
  {
    key: 'HUSTLE_COLOR_BADGES',
    label: 'Hustle Color Badges',
    description: 'Colored dot next to the hustle name in mobile History rows for quick visual identification.',
    releaseStage: FeatureReleaseStage.BETA,
  },
  {
    key: 'RATES_NUDGE',
    label: 'No-Rates Nudge in Log',
    description: 'Amber warning banner in the Log form when no active rate snapshot exists — reminds you to set rates before logging mileage.',
    releaseStage: FeatureReleaseStage.BETA,
  },
]

export type FlagKey = (typeof FLAG_REGISTRY)[number]['key']
