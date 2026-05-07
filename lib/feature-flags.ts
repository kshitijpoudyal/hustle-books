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
  /** ISO date string — when this flag was added to the registry */
  createdAt?: string
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
    createdAt: '2025-04-10',
  },
  {
    key: 'DATE_SHORTCUTS',
    label: 'Date Shortcuts',
    description: 'Today / Yesterday quick-pick buttons above the date field in the Log form. Reduces friction for the most common log dates.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-04-18',
  },
  {
    key: 'LOG_AGAIN',
    label: 'Log Again',
    description: 'Pre-fill the income form from your last entry. Tap "Log Again" to copy hustle, mileage, and description — just update the amount.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-04-22',
  },
  {
    key: 'MILEAGE_PRESETS',
    label: 'Mileage Preset Chips',
    description: '+5 / +10 / +15 / +25 tap chips below the mileage input for quick entry without typing.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-04-22',
  },
  {
    key: 'SWIPE_ACTIONS',
    label: 'Swipe Actions in History',
    description: 'Swipe left on any transaction row in History to reveal Edit and Delete quick actions.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-04-28',
  },
  {
    key: 'HUSTLE_COLOR_BADGES',
    label: 'Hustle Color Badges',
    description: 'Colored dot next to the hustle name in mobile History rows for quick visual identification.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-04-28',
  },
  {
    key: 'RATES_NUDGE',
    label: 'No-Rates Nudge in Log',
    description: 'Amber warning banner in the Log form when no active rate snapshot exists — reminds you to set rates before logging mileage.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-05-01',
  },
  {
    key: 'TAX_RESERVE_CARD',
    label: 'Tax Reserve Card',
    description: 'Dashboard card showing taxable income, SE tax rate, and the suggested set-aside amount for the selected period.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-05-05',
  },
  {
    key: 'STAT_DRILL_THROUGH',
    label: 'Stat Card Drill-Through',
    description: 'Tap any dashboard stat card to open a slide-up breakdown panel — per-hustle income/expense bars, profit math, or tax split.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-05-05',
  },
  {
    key: 'HUSTLE_COMPARISON',
    label: 'Hustle Comparison',
    description: 'Select 2–3 hustles on the Hustles page to see side-by-side income, expenses, cost ratio, and net profit.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-05-07',
  },
  {
    key: 'ONBOARDING_WIZARD',
    label: 'Onboarding Wizard',
    description: '3-step first-login guide: create hustle → set rates → log first entry. Shows automatically for new accounts.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-05-07',
  },
  {
    key: 'EXPENSE_PRESETS',
    label: 'Expense Presets',
    description: 'Quick-amount chips below the expense category selector. Tap to fill common amounts (e.g. $50 fuel, $65 phone).',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-05-07',
  },
  {
    key: 'EARNINGS_HEATMAP',
    label: 'Earnings Heatmap',
    description: 'Monthly calendar heatmap on the Dashboard showing highest-earning days by income intensity.',
    releaseStage: FeatureReleaseStage.BETA,
    createdAt: '2025-05-07',
  },
]

export type FlagKey = (typeof FLAG_REGISTRY)[number]['key']
