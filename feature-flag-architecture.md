# Feature Flag Architecture

## Overview

HustleBooks uses a database-driven feature flag system. All flag state is stored in Supabase — there is no localStorage or client-side persistence. Every feature's enabled state is resolved from `feature_flag_users.enabled` and never recalculated from defaults at runtime.

---

## Database Schema

### `feature_flags` — flag definitions

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `key` | `text UNIQUE` | Matches `FlagKey` in `lib/feature-flags.ts` |
| `release_stage` | `text` | One of `'disabled'`, `'beta'`, `'production'` |
| `created_at` | `timestamptz` | Row creation time |

**Constraint:** `release_stage IN ('disabled', 'beta', 'production')`

### `feature_flag_users` — per-user enabled state

| Column | Type | Description |
|---|---|---|
| `feature_flag_id` | `uuid` | FK → `feature_flags.id` |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `enabled` | `boolean NOT NULL DEFAULT false` | Whether this flag is on for this user |

**Primary key:** `(feature_flag_id, user_id)`

> Rows are never deleted. Disabling a flag sets `enabled = false`; enabling sets `enabled = true`. This preserves history and simplifies trigger logic.

---

## Release Stage Semantics

| Stage | Who sees it | Default `enabled` | Toggleable by |
|---|---|---|---|
| `disabled` | Nobody | n/a | Nobody — set in DB by developer |
| `beta` | Internal users only | `false` | Internal users (via /devpower) |
| `production` | All users (internal + public) | `true` | Internal users (via /devpower) |

### Rules

- **`disabled`**: The feature is unconditionally off for ALL users regardless of `feature_flag_users` rows. Used to sunset or kill-switch a feature.
- **`beta`**: Only internal users get a `feature_flag_users` row seeded. Row defaults to `enabled = false`. Internal users can toggle on/off.
- **`production`**: All users get a row seeded with `enabled = true`. Public users see the feature if their row is `enabled`. Internal users can toggle it off for themselves.

---

## User Groups

| Group | Stored in | Description |
|---|---|---|
| `public` | `users.user_group` | Default for all new signups. Sees production flags only. Cannot toggle. |
| `internal` | `users.user_group` | Can see and toggle all non-disabled flags in /devpower. |

### Promotion flow

When a user is created (`public` by default) or upgraded to `internal`, a DB trigger automatically seeds the correct `feature_flag_users` rows:

| Event | Action |
|---|---|
| `users INSERT` (new signup) | Seed all `production` flag rows with `enabled = true` |
| `users UPDATE` → `user_group = 'internal'` | Upsert `production` rows (`enabled = true`); insert missing `beta` rows (`enabled = false`) |

This means application code never needs to manually manage row creation on user lifecycle events.

---

## DB Trigger: `trg_seed_user_feature_flags`

```sql
-- Fires AFTER INSERT OR UPDATE OF user_group ON public.users
-- Function: public.seed_user_feature_flags()
```

The trigger handles both new user creation and group promotion atomically at the database level.

---

## Code Architecture

```
lib/feature-flags.ts          — FlagDefinition registry (UI metadata only), FeatureReleaseStage enum, UserGroup enum
lib/types/index.ts            — FeatureFlag interface (DB row shape)

lib/data/feature-flags.ts     — Raw Supabase queries (fetch flags, fetch user rows, upsert enabled)
lib/services/feature-flags.ts — Business logic: loadUserFlags(), enableFlag(), disableFlag(), resolveFlag()
lib/context/feature-flags-context.tsx — React context: loads from DB, exposes flag(), setFlag(), isInternal
```

### Data flow

```
Supabase DB
  ↓ fetchFeatureFlags() + fetchUserFlagRows()
lib/data/feature-flags.ts
  ↓ loadUserFlags()
lib/services/feature-flags.ts
  ↓ stored, visibleFlagKeys, keyToId
lib/context/feature-flags-context.tsx
  ↓ flag(key), setFlag(key, value), isInternal, visibleFlagKeys
Components / pages
```

---

## `FLAG_REGISTRY` in `lib/feature-flags.ts`

The registry provides **UI metadata only** (label, description, releaseStage). It does NOT drive runtime enabled/disabled state — that comes from `feature_flag_users.enabled` in the DB.

When adding a new flag:
1. Add an entry to `FLAG_REGISTRY` with the correct `releaseStage`
2. Insert a row into `feature_flags` in Supabase with the same `key` and `release_stage`
3. The DB trigger will seed `feature_flag_users` rows for existing users on their next group-change; for already-existing users run the backfill manually or via migration

---

## Visibility Rules Summary

```
Public user:
  - disabled flag   → hidden
  - beta flag       → hidden
  - production flag → visible if feature_flag_users.enabled = true (default: true)

Internal user:
  - disabled flag   → shown in /devpower as read-only (globally off)
  - beta flag       → shown in /devpower, toggleable (default: off)
  - production flag → shown in /devpower, toggleable (default: on)
```

---

## /devpower Page

- Accessible only to `internal` users (redirect to `/` for public users)
- Shows a toggle for every non-disabled flag the user can see
- Shows disabled flags in a read-only section (greyed out, ban icon)
- The devpower nav item (Terminal icon) appears in the nav only for internal users
- Toggling calls `setFlag()` which upserts `feature_flag_users.enabled` via the services layer

---

## Invariants

1. **No localStorage.** Flag state is 100% DB-driven.
2. **No row deletion.** Disabling = `enabled = false`. This preserves audit history.
3. **Disabled = global kill-switch.** A `disabled` flag is hidden for everyone. No per-user override.
4. **Production defaults to on.** A production flag row is seeded with `enabled = true`. Public users cannot change this.
5. **DB is authoritative.** The context reads from DB on mount. `flag()` returns `false` for any key not in the DB.
6. **Trigger handles seeding.** Application code never manually creates `feature_flag_users` rows on signup or promotion.
