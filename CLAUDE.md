# CLAUDE.md — Project Instructions for Claude CLI

## Project

HustleBooks — a mobile-first side hustle profit tracker built with Next.js, Supabase, and Tailwind CSS.

## Key Files

- `HUSTLEBOOKS_PROJECT_PLAN.md` — Full project spec, database schema, feature specs, build order. READ THIS FIRST before doing any work.
- `design.md` — Design tokens and component specs from Google Stitch. When present, extract all colors, typography, spacing, and component patterns into tailwind.config.ts. Design.md is the source of truth for visual styling.

## Rules

- This is a MOBILE-FIRST app. Every component must look great on 375px width before considering desktop.
- Use App Router (app/ directory), not Pages Router.
- All Supabase queries go through custom hooks in lib/hooks/. Components never call Supabase directly.
- All math (fuel cost, depreciation, profit, tax) goes through lib/utils/calculations.ts. No inline calculations in components.
- TypeScript strict mode. No `any` types.
- Use shadcn/ui components where applicable. Do not install component libraries beyond shadcn/ui.
- Every page needs a loading skeleton and an empty state.
- Forms must show validation errors inline and use toast notifications on success.
- The "Log" action (adding income/expense) must be completable in under 5 seconds — minimize fields and friction.
- Follow the build order in section 9 of the project plan. Do not skip ahead.

## Rate Snapshot System — CRITICAL

This app uses a rate snapshot system for fuel prices, MPG, IRS mileage rate, tax %, and **depreciation per mile**. This is the most important architectural decision in the app. Follow these rules exactly:

1. **Rates live in `rate_snapshots` table, NOT in user settings.** The profiles.settings JSONB only stores preferences (mileage_method, dark_mode) and vehicle info (for the depreciation calculator helper). Never store gas_price, mpg, irs_rate, tax_rate, or depreciation_per_mile in profiles.
2. **Every income entry with mileage MUST store `rate_snapshot_id`, `fuel_cost_at_log`, AND `depreciation_cost_at_log`.** Both costs are calculated once at save time and baked in permanently.
3. **Never recalculate old entries.** If a user updates rates, only future entries use the new rates. Past entries keep their original baked-in values.
4. **Date-aware resolution.** When saving an entry, resolve the snapshot based on the ENTRY's date, not today's date. Use `resolveSnapshot()` from lib/utils/rate-resolver.ts.
5. **Locked snapshots cannot be edited or deleted.** The lock is a user-controlled freeze. Respect it everywhere.
6. **Snapshots with linked entries cannot be deleted.** Always check linked_entry_count before allowing delete. Grey out the button and show the count.
7. **Dashboard and history use baked-in values.** stat-cards, recent-activity, and transaction-row must read `fuel_cost_at_log` and `depreciation_cost_at_log` from the income row, NOT recalculate from current rates.
8. **One snapshot per effective_date per user.** Enforced by unique index. If user creates a snapshot for a date that already has one, UPDATE the existing (if not locked) instead of INSERT.
9. **Depreciation defaults to 0.** A zero depreciation_per_mile is valid — it just means the user hasn't set it yet. Show an amber nudge ("Depreciation not set") but never block saving.
10. **The depreciation calculator in Settings is a HELPER only.** It outputs a $/mile number. That number must flow through the rate snapshot form to become an actual rate — the calculator never writes to rate_snapshots directly.

Read section 12 of HUSTLEBOOKS_PROJECT_PLAN.md for complete flows and edge cases.

## Design System — "The Synthetic Naturalist" (from Google Stitch)

- design.md from Stitch is the source of truth for all visual tokens. Extract every color, surface tier, font weight, radius, and spacing value into tailwind.config.ts.
- **Fonts:** Public Sans (headlines, body, narrative) + Work Sans (labels, data, amounts, metadata). Both are sans-serif — there is no serif font in this system.
- Work Sans labels: ALWAYS uppercase with +5% letter-spacing for categories and metadata.
- Monetary amounts: always Work Sans at a heavier weight.
- Mix both fonts within the same component — Public Sans title with Work Sans data value.
- **Borders are STRICTLY PROHIBITED** for layout sectioning. Use tonal shifts between surface tokens (surface → surface-container-low → surface-container, etc.).
- No `<hr>` tags or `border-bottom` for list separation. Use vertical whitespace or background toggles.
- **Input fields: NO bottom-border or box.** Use `surface-container-low` as a subtle recessed block. Labels float outside the input area in Work Sans uppercase.
- **All containers use maximum roundedness** — continuous-curvature squircle / pill shapes. No sharp or moderate corners anywhere.
- Primary CTAs: `primary` (#1e3a5f) background with gradient (135°) to supporting shade. Pill shape. Public Sans Bold text.
- Secondary buttons: `surface-container-highest` background, no border.
- Tertiary: Work Sans uppercase with teal underline that expands on hover.
- Accent teal (#2ca6a4): income/profit indicators, active states, interactive data highlights, specimen chips. Use sparingly.
- Expense amounts: warm muted red. Never neon colors.
- Locked rates get a padlock icon. Warm amber for warnings like "depreciation not set."
- **Floating elements (bottom nav, modals):** glassmorphism — `surface-variant` at 60% opacity with `backdrop-blur: 12px`. Thin-stroke icons (1px).
- **Shadows:** Navy-tinted ambient only: `0 12px 32px rgba(30, 58, 95, 0.06)`. Never grey or black shadows.
- Ghost borders (outline-variant at 15% opacity) ONLY for accessibility fallback.
- In card grids, offset second column ~40px vertically for asymmetry.
- Specimen chips: `secondary-container` (#2ca6a4) background — used for hustle badges, category pills, status tags.
- Dark mode is "journal by candlelight" — warm charcoal backgrounds, not cold greys.
- Never use pure black (#000) or pure white (#FFF). Always use on-surface and surface tokens.
- **When in doubt, consult the design.md file directly. It overrides anything written here.**

## Database

- Supabase Postgres with Row Level Security on every table.
- All tables use UUID primary keys via gen_random_uuid().
- The expenses.hustle_id is nullable — null means "General" (shared across all hustles).
- User preferences (NOT rates) are stored as JSONB in the profiles table. This includes vehicle info (year, make_model, purchase_price, salvage_value, expected_total_miles, current_odometer) used by the depreciation helper calculator.
- Rate data (gas_price, mpg, irs_rate, tax_rate, depreciation_per_mile) is stored in rate_snapshots table with effective_date for temporal queries.
- The income table has both fuel_cost_at_log AND depreciation_cost_at_log as baked-in denormalized columns.
- On first user signup, always seed a default rate snapshot (with depreciation_per_mile = 0).

## Testing

- Not required for MVP. Focus on shipping.
- If adding tests later, use Vitest + React Testing Library.

## Common Commands

```bash
npm run dev          # Start dev server
npx supabase start   # Start local Supabase (if using local dev)
npx shadcn@latest add [component]  # Add a shadcn component
```

## Don'ts

- Don't add features not listed in the MVP spec (section 5 of project plan).
- Don't use external state management (Redux, Zustand). React Context + hooks is sufficient.
- Don't create separate CSS files. Tailwind utility classes only.
- Don't over-engineer. This is a personal tool, not an enterprise app.
- Don't use localStorage for data. Everything goes to Supabase.
- Don't store rate values (gas_price, mpg, irs_rate, tax_rate, depreciation_per_mile) in the profiles table. They belong in rate_snapshots.
- Don't calculate fuel cost or depreciation on the fly from current rates. Always use baked-in fuel_cost_at_log and depreciation_cost_at_log from the income row.
- Don't allow deletion of snapshots that have linked income entries.
- Don't let the depreciation calculator in settings write directly to rate_snapshots. It outputs a number → user takes it to /rates → saves it in a snapshot. The user controls when rates change.
- Don't block entry saving when depreciation_per_mile is 0. It's valid — the user just hasn't configured it yet. Show a nudge, not an error.
