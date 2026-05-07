# HustleBooks — Feature Roadmap

All new features are feature-flagged (BETA stage). Enable them in `/devpower`.

---

## Tier 1 — Quick Wins

| # | Feature | Flag Key | Status | Session |
|---|---------|----------|--------|---------|
| 1 | **Date Shortcuts** — Today / Yesterday pills above date inputs in Log form | `DATE_SHORTCUTS` | ✅ Done | 1 |
| 2 | **Log Again** — Pre-fill form from last income entry; user just changes amount | `LOG_AGAIN` | ✅ Done | 2 |
| 3 | **Mileage Preset Chips** — +5 / +10 / +15 / +25 tap chips below mileage input | `MILEAGE_PRESETS` | ✅ Done | 3 |
| 4 | **Swipe Actions in History** — Swipe left on mobile row to reveal Edit / Delete | `SWIPE_ACTIONS` | 🔧 Needs Improvement | 4 |
| 5 | **Hustle Color Badges (Mobile)** — Colored dot next to hustle name in mobile history rows | `HUSTLE_COLOR_BADGES` | ✅ Done | 5 |
| 6 | **No-Rates Nudge in Log** — Amber banner when no active rate snapshot exists | `RATES_NUDGE` | ✅ Done | 6 |

> Note: Text search in History is already fully built (no flag needed).

---

## Tier 2 — Medium Effort

| # | Feature | Flag Key | Status | Session |
|---|---------|----------|--------|---------|
| 7 | **Tax Reserve Card** — Dashboard card showing taxable income and suggested set-aside amount | `TAX_RESERVE_CARD` | 🔧 Needs Improvement | 7 |
| 8 | **Stat Card Drill-Through** — Tap any dashboard stat to see a breakdown slide-up | `STAT_DRILL_THROUGH` | ✅ Done | 8 |
| 9 | **Onboarding Wizard** — 3-step first-login guide: create hustle → set rates → log first entry | `ONBOARDING_WIZARD` | ✅ Done | 9 |

---

## Tier 3 — Larger Features (Post-MVP Polish)

| # | Feature | Flag Key | Status | Session |
|---|---------|----------|--------|---------|
| 10 | **Expense Presets** — Quick-add buttons for common expenses (fuel fill-up, phone bill) | `EXPENSE_PRESETS` | ✅ Done | 10 |
| 11 | **Hustle Comparison** — Side-by-side profit / expense ratio for 2–3 selected hustles | `HUSTLE_COMPARISON` | 🔧 Needs Improvement | 11 |
| 12 | **Earnings Heatmap** — Calendar heatmap showing highest-earning days of the week/month | `EARNINGS_HEATMAP` | 🔧 Needs Improvement | 12 |

---

## DB Migration Per Feature

Each feature requires one SQL insert into `feature_flags`. Run in Supabase SQL Editor.

```sql
-- Feature 1: DATE_SHORTCUTS (✅ applied)
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('DATE_SHORTCUTS', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 2: LOG_AGAIN
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('LOG_AGAIN', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 3: MILEAGE_PRESETS
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('MILEAGE_PRESETS', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 4: SWIPE_ACTIONS
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('SWIPE_ACTIONS', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 5: HUSTLE_COLOR_BADGES
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('HUSTLE_COLOR_BADGES', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 6: RATES_NUDGE
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('RATES_NUDGE', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 7: TAX_RESERVE_CARD
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('TAX_RESERVE_CARD', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 8: STAT_DRILL_THROUGH
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('STAT_DRILL_THROUGH', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 9: ONBOARDING_WIZARD
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('ONBOARDING_WIZARD', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 10: EXPENSE_PRESETS
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('EXPENSE_PRESETS', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 11: HUSTLE_COMPARISON
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('HUSTLE_COMPARISON', 'beta')
ON CONFLICT (key) DO NOTHING;

-- Feature 12: EARNINGS_HEATMAP
INSERT INTO public.feature_flags (key, release_stage)
VALUES ('EARNINGS_HEATMAP', 'beta')
ON CONFLICT (key) DO NOTHING;
```

---

## How Feature Flags Work

1. Flag definition lives in `lib/feature-flags.ts` (`FLAG_REGISTRY`)
2. Flag row lives in the `feature_flags` DB table (insert via SQL above)
3. Toggle via `/devpower` (internal users only while `BETA`)
4. Code checks: `const enabled = flag('FLAG_KEY')` from `useFeatureFlags()`
5. Promote to `production` in `release_stage` to enable for all users
