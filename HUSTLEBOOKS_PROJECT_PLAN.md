# HustleBooks — Project Plan & Claude CLI Brief

## How To Use This Document

This is your project blueprint. Give it to Claude CLI along with your `design.md` from Google Stitch and any base templates.

```bash
# Start your project
claude "Read HUSTLEBOOKS_PROJECT_PLAN.md and design.md, then scaffold the full project structure and start building."
```

---

## 1. Project Overview

**HustleBooks** is a mobile-first web app for tracking income, expenses, and real profit across multiple side hustles (DoorDash, FB Marketplace, lawn care, tutoring — anything).

**Core idea:** Users create "Hustles" as containers. All income and expenses belong to a hustle. The app shows true profit after expenses and estimated tax set-aside.

**Target user:** A gig worker who logs earnings from their phone in a parking lot. Speed and simplicity are everything.

### 1.1 Rate Locking — Core Concept

Rates change over time — gas prices fluctuate, IRS mileage rates update yearly, tax brackets shift. HustleBooks uses a **rate snapshot** system:

- The user's current rates (gas price, MPG, IRS rate, tax %) live in a `rate_snapshots` table, NOT in a flat settings column.
- Every income entry that involves mileage gets stamped with the `rate_snapshot_id` that was active at the time of logging.
- When a user updates their rates (e.g., gas goes from $3.50 to $3.80), a **new snapshot** is created. Old entries keep pointing to the old snapshot. New entries use the new one.
- Users can also **manually lock** a snapshot — meaning they explicitly freeze a set of rates for a period (e.g., "I want to lock $3.50/gal for all of January").
- Old data is NEVER recalculated unless the user explicitly chooses to.

This means: if you logged 100 DoorDash trips at $3.50/gal, then update to $3.80, those 100 trips still show fuel cost at $3.50. Only new trips use $3.80.

---

## 2. Tech Stack

| Layer       | Tool                  | Notes                                      |
| ----------- | --------------------- | ------------------------------------------ |
| Framework   | Next.js 14+ (App Router) | TypeScript, server components            |
| Styling     | Tailwind CSS          | Follow design.md tokens from Stitch        |
| Components  | shadcn/ui             | Install only what's needed                 |
| Charts      | Recharts              | Dashboard charts only                      |
| Database    | Supabase (Postgres)   | Auth + DB + Row Level Security             |
| Auth        | Supabase Auth         | Email/password + Google OAuth              |
| Hosting     | Vercel                | Auto-deploy from main branch               |
| State       | React Context + hooks | No external state library needed for MVP   |

---

## 3. Database Schema

### Tables

```sql
-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  -- General preferences only. NO rate fields here.
  -- Vehicle info is stored here for the depreciation HELPER CALCULATOR only.
  -- The actual depreciation_per_mile value lives in rate_snapshots.
  settings jsonb default '{
    "mileage_method": "actual",
    "currency": "USD",
    "dark_mode": true,
    "vehicle": {
      "year": null,
      "make_model": null,
      "purchase_price": null,
      "salvage_value": null,
      "expected_total_miles": null,
      "current_odometer": null
    }
  }'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rate Snapshots — the heart of the rate-locking system
-- Each row is a frozen set of rates valid from effective_date onward
-- until the next snapshot's effective_date.
create table public.rate_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text,                              -- optional user label, e.g. "Jan 2026 rates", "Summer prices"
  gas_price decimal(5,3) not null,         -- e.g. 3.499
  mpg decimal(5,1) not null,               -- e.g. 25.0
  irs_rate decimal(4,3) not null,          -- e.g. 0.670
  tax_rate decimal(5,2) not null,          -- e.g. 25.00 (percentage)
  depreciation_per_mile decimal(5,3) not null default 0, -- e.g. 0.120 ($0.12/mile)
  effective_date date not null default current_date,
  is_locked boolean default false,         -- user manually locked this snapshot
  notes text,                              -- optional reason, e.g. "Gas jumped at Shell"
  created_at timestamptz default now()
);

-- Unique constraint: one snapshot per user per effective_date
create unique index idx_rate_snapshots_user_date
  on public.rate_snapshots(user_id, effective_date);

-- Hustles (user-created categories)
create table public.hustles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text not null default '#00d47e',
  icon text not null default 'briefcase',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Income entries
create table public.income (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  hustle_id uuid references public.hustles(id) on delete cascade not null,
  amount decimal(10,2) not null,
  description text,
  mileage decimal(8,1),
  -- Snapshot that was active when this entry was created.
  -- Stores the EXACT rates used for this entry's calculations.
  rate_snapshot_id uuid references public.rate_snapshots(id) on delete set null,
  -- Denormalized: baked-in fuel cost at time of logging so it NEVER changes.
  fuel_cost_at_log decimal(10,2),
  -- Denormalized: baked-in depreciation cost at time of logging.
  depreciation_cost_at_log decimal(10,2),
  date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expense entries
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  hustle_id uuid references public.hustles(id) on delete set null,  -- null = "General"
  amount decimal(10,2) not null,
  category text not null check (category in ('fuel', 'fees', 'supplies', 'maintenance', 'phone', 'other')),
  description text,
  is_recurring boolean default false,
  date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security (enable on all tables)
-- Every table: user can only read/write their own rows
-- Policy: auth.uid() = user_id
```

### RLS Policies (apply to each table)

```sql
alter table public.profiles enable row level security;
alter table public.rate_snapshots enable row level security;
alter table public.hustles enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;

-- Repeat this pattern for ALL tables:
create policy "Users can view own rate_snapshots"
  on public.rate_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert own rate_snapshots"
  on public.rate_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update own rate_snapshots"
  on public.rate_snapshots for update using (auth.uid() = user_id);
create policy "Users can delete own rate_snapshots"
  on public.rate_snapshots for delete using (auth.uid() = user_id);

-- (Same 4 policies for profiles, hustles, income, expenses)
```

### Helper: Get Active Snapshot for a Given Date

```sql
-- Database function to resolve which snapshot applies to a given date.
-- Returns the most recent snapshot whose effective_date <= target_date.
create or replace function get_active_snapshot(p_user_id uuid, p_date date)
returns uuid as $$
  select id from public.rate_snapshots
  where user_id = p_user_id
    and effective_date <= p_date
  order by effective_date desc
  limit 1;
$$ language sql stable;
```

### Seed: First Login Creates Default Snapshot

When a user signs up, create their first rate snapshot automatically:

```sql
-- Trigger or application-level logic on profile creation:
insert into public.rate_snapshots (user_id, label, gas_price, mpg, irs_rate, tax_rate, depreciation_per_mile, effective_date, is_locked, notes)
values (NEW.id, 'Initial rates', 3.50, 25.0, 0.670, 25.00, 0.000, current_date, false, 'Default rates — update in Settings. Set your depreciation rate too!');
```

---

## 4. Project File Structure

```
hustlebooks/
├── app/
│   ├── layout.tsx                  # Root layout, providers, bottom nav
│   ├── page.tsx                    # Dashboard (home)
│   ├── login/
│   │   └── page.tsx                # Auth page (login/signup)
│   ├── log/
│   │   ├── page.tsx                # Log entry page with income/expense toggle
│   │   └── [id]/
│   │       └── page.tsx            # Edit existing entry
│   ├── history/
│   │   └── page.tsx                # All transactions list with filters
│   ├── hustles/
│   │   ├── page.tsx                # Hustle grid/list
│   │   └── [id]/
│   │       └── page.tsx            # Single hustle detail view
│   ├── rates/
│   │   └── page.tsx                # Rate history timeline & management
│   └── settings/
│       └── page.tsx                # Settings page
├── components/
│   ├── ui/                         # shadcn/ui components (button, input, etc.)
│   ├── layout/
│   │   ├── bottom-nav.tsx          # Mobile bottom tab bar
│   │   └── page-header.tsx         # Reusable page header
│   ├── dashboard/
│   │   ├── stat-cards.tsx          # Net profit, income, expenses cards
│   │   ├── weekly-chart.tsx        # Income vs expenses bar chart
│   │   ├── hustle-summary.tsx      # Per-hustle profit cards
│   │   └── recent-activity.tsx     # Last 10 entries feed
│   ├── forms/
│   │   ├── income-form.tsx         # Log income form
│   │   ├── expense-form.tsx        # Log expense form
│   │   ├── hustle-form.tsx         # Create/edit hustle form
│   │   ├── rate-form.tsx           # Create/edit rate snapshot form
│   │   └── vehicle-form.tsx        # Vehicle info form (year, make, odometer)
│   ├── rates/
│   │   ├── rate-timeline.tsx       # Visual timeline of rate snapshots
│   │   ├── rate-card.tsx           # Single snapshot card (shows all rates + lock status)
│   │   ├── active-rate-banner.tsx  # Small banner showing current active rates
│   │   └── rate-lock-toggle.tsx    # Lock/unlock button with confirmation
│   ├── settings/
│   │   └── depreciation-calculator.tsx  # Live calculator: outputs $/mile from vehicle inputs
│   ├── history/
│   │   ├── transaction-list.tsx    # Filterable transaction list
│   │   ├── transaction-row.tsx     # Single row component
│   │   └── filter-bar.tsx          # Filter controls
│   └── shared/
│       ├── amount-display.tsx      # Formatted currency display (green/red)
│       ├── hustle-badge.tsx        # Color dot + name badge
│       ├── empty-state.tsx         # "No data yet" placeholders
│       └── loading-skeleton.tsx    # Loading states
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server-side Supabase client
│   │   └── middleware.ts            # Auth middleware
│   ├── hooks/
│   │   ├── use-income.ts           # CRUD hooks for income
│   │   ├── use-expenses.ts         # CRUD hooks for expenses
│   │   ├── use-hustles.ts          # CRUD hooks for hustles
│   │   ├── use-rates.ts            # CRUD + resolve active snapshot
│   │   ├── use-profile.ts          # Profile/settings hook
│   │   └── use-dashboard.ts        # Aggregated dashboard data
│   ├── utils/
│   │   ├── calculations.ts         # Profit, fuel cost, depreciation, tax math
│   │   ├── formatters.ts           # Currency, date, mileage formatting
│   │   ├── rate-resolver.ts        # Find correct snapshot for a given date
│   │   └── constants.ts            # Categories, default settings
│   └── types/
│       └── index.ts                # TypeScript types for all entities
├── middleware.ts                    # Next.js middleware for auth redirects
├── .env.local                      # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 5. Feature Specs (MVP Only)

### 5.1 Authentication

- Email/password signup and login
- Google OAuth as secondary option
- Redirect unauthenticated users to /login
- On first login, create a profile row with default settings AND a default rate snapshot
- Persist session using Supabase cookies via middleware

### 5.2 Dashboard (`/`)

**Data to show:**
- **Stat cards (top):**
  - Net Profit (this month) = total income - total expenses - (total income × active_tax_rate/100)
  - Total Income (this month)
  - Total Expenses (this month)
- **Active rates banner:** Small pill/badge below stats showing "Current: $3.50/gal · 25 MPG · $0.12/mi depr. · 25% tax" with a link to /rates. If rates haven't been updated in 30+ days, show a subtle amber nudge: "Rates last updated X days ago". If depreciation_per_mile is 0, show amber nudge: "Depreciation not set — you may be overestimating profit"
- **Weekly bar chart:** Last 4 weeks, two bars per week (income green, expenses red)
- **Hustle summary:** One small card per active hustle showing this month's profit and color
- **Recent activity:** Last 10 income + expense entries merged and sorted by date desc

**Interactions:**
- Tapping a hustle card navigates to `/hustles/[id]`
- Tapping a recent activity item navigates to `/log/[id]` for editing
- Tapping the active rates banner navigates to `/rates`

### 5.3 Log Entry (`/log`)

**Two-tab toggle at top: "Income" | "Expense"**

**Income form fields:**
- Hustle (dropdown, required) — populated from user's hustles
- Amount (number input, required)
- Description (text, optional)
- Mileage (number, optional) — if filled, auto-show estimated fuel cost below using the ACTIVE snapshot's rates
- Date (date picker, defaults to today)
- **Rate info line (read-only, shown when mileage is entered):** "Using: $3.50/gal · 25 MPG · $0.12/mi depr. → Est. fuel: $4.20 · Depr: $1.44 · Total mileage cost: $5.64" — this shows exactly what rates are being baked in. If depreciation_per_mile is 0, show "(no depreciation set)" in muted text.

**Expense form fields:**
- Hustle (dropdown, optional) — includes "General" option for shared expenses
- Amount (number input, required)
- Category (dropdown: fuel, fees, supplies, maintenance, phone, other)
- Description (text, optional)
- Recurring toggle (boolean)
- Date (date picker, defaults to today)

**Behavior:**
- On save for income with mileage:
  1. Resolve the active rate snapshot for the entry's date (not today — the DATE on the entry)
  2. Calculate `fuel_cost_at_log` using that snapshot's rates
  3. Calculate `depreciation_cost_at_log` = mileage × snapshot.depreciation_per_mile
  4. Store `rate_snapshot_id`, `fuel_cost_at_log`, and `depreciation_cost_at_log` on the income row
  5. All three values are now permanently baked in
- On save, show success toast and reset form (stay on page for rapid logging)
- Validate: amount must be > 0, hustle required for income
- If user has no hustles yet, show prompt to create one first

**Date-aware rate resolution:**
- If the user backdates an entry to January 15 and a different snapshot was active on Jan 15, USE THAT snapshot, not the current one
- Show which snapshot is being used: "Rates from: Jan 2026 snapshot ($3.20/gal)"

### 5.4 History (`/history`)

**Filter tabs:** All | Income | Expenses

**Filter controls:**
- Hustle dropdown (filter by specific hustle)
- Date range picker (preset: This Week, This Month, This Year, Custom)
- Category filter (expenses only)

**List:**
- Each row: date, hustle badge (color dot + name), description, amount
- Income amounts in green with "+" prefix
- Expense amounts in red with "-" prefix
- For income rows with mileage: show small subtitle "12.3 mi · $4.20 fuel · $1.48 depr. (@ $3.50/gal, $0.12/mi)" — the baked-in rates from the snapshot
- Tapping a row opens `/log/[id]` for edit/delete

**Summary bar (sticky top):**
- Shows filtered totals: X income entries ($Y), Z expense entries ($W)

### 5.5 Hustles (`/hustles`)

**Grid layout:**
- Card per hustle: icon, name, color accent, this month's net profit
- "Add Hustle" card with plus icon

**Create/Edit hustle modal:**
- Name (text, required)
- Color (preset color picker — 8-10 options)
- Icon (preset icon picker — 10-12 common icons from Lucide)

**Hustle detail view (`/hustles/[id]`):**
- Header with name, color, icon
- Stat cards: income, expenses, net profit (this month)
- Simple list of all entries for this hustle
- Edit and delete hustle buttons (delete warns about losing data)

### 5.6 Rates (`/rates`) — Rate Management Page

This is the rate management hub. It answers: "What rates am I using, what rates did I use before, and when did they change?"

**Active Rate Card (top, prominent):**
- Shows the currently active snapshot with all 5 values: Gas Price, MPG, IRS Rate, Tax %, Depreciation/Mile
- If depreciation_per_mile is 0, show "Not set" in amber with a link to the calculator in settings
- "Update Rates" button — opens rate-form to create a new snapshot effective today
- Lock/Unlock toggle with icon (locked = padlock closed, unlocked = padlock open)
- If locked, show "Locked" badge and disable the Update button. User must unlock first.
- Last updated date shown

**Rate Timeline (below):**
- Vertical timeline of all past snapshots, newest at top
- Each entry shows: effective date, label (if any), all 5 rate values (gas, mpg, irs, tax, depreciation), lock status, how many income entries used this snapshot
- Tapping a snapshot expands it to show:
  - Notes field
  - Number of income entries linked to this snapshot
  - "Edit" button (only if is_locked = false AND no income entries reference it)
  - "Delete" button (only if no income entries reference it — otherwise greyed out with tooltip "X entries use these rates")

**Create/Edit Rate Snapshot Form (rate-form.tsx):**
- Gas price per gallon (number, required)
- Vehicle MPG (number, required)
- IRS standard mileage rate (number, required, default 0.67)
- Tax set-aside % (number, required, default 25)
- Depreciation per mile (number, required, default 0) — with helper text: "Your vehicle's cost per mile from wear & tear. Use the calculator in Settings if unsure."
- Effective date (date picker, defaults to today)
- Label (text, optional — e.g., "Q1 2026 rates")
- Notes (text, optional — e.g., "Gas prices went up at my usual station")
- Lock immediately toggle (boolean, default false)

**Rate Locking Rules:**
1. A locked snapshot cannot be edited or deleted
2. A locked snapshot's rates are frozen — even if the user creates a newer snapshot, entries dated within the locked period still use the locked rates
3. Unlocking requires a confirmation dialog: "Unlocking allows these rates to be edited. Existing entries using these rates will NOT be affected."
4. Any snapshot that has income entries referencing it cannot be deleted (locked or not) — show the count

**How rate resolution works (for the developer):**
```
Given an income entry with date = D:
1. Find all snapshots where effective_date <= D
2. Among those, find the one with the MAX effective_date
3. That's the active snapshot for date D
4. Store its ID on the income row and bake in fuel_cost_at_log
```

### 5.7 Settings (`/settings`)

**Sections:**
- **Profile:** Name, email (read-only)
- **Current Rates:** Quick-view card showing active snapshot values (gas, mpg, irs, tax, depreciation/mi) with "Manage Rates" link to /rates (NOT editable here — rates are managed in /rates to enforce the snapshot system)
- **Mileage method:** Toggle between "Actual fuel cost" and "IRS standard rate" — this is stored in profile settings, not in the snapshot
- **Vehicle Info:** Year, Make/Model, current odometer (stored in profiles.settings.vehicle — this is reference info, not rate data)
- **Depreciation Calculator:** A helper tool to figure out your per-mile depreciation rate. NOT a rate field itself — it outputs a number the user can then plug into their rate snapshot.
  - Input fields:
    - Purchase price ($) — what you paid for the car
    - Salvage value ($) — what you expect to sell/scrap it for (default: $0)
    - Expected total lifetime miles — how many miles until you retire the car (helper text: "Most cars last 150,000–200,000 miles")
    - Current odometer (pre-filled from vehicle info if set)
  - Output (calculated live as inputs change):
    - **Depreciation per mile: $X.XX/mi** (large, prominent)
    - Formula shown: "(Purchase − Salvage) ÷ Total Miles = $/mile"
    - Example: "($15,000 − $2,000) ÷ 150,000 mi = $0.087/mi"
  - "Use this rate" button — navigates to /rates with this value pre-filled in the depreciation field of the rate form. Does NOT auto-save — user still controls when and how the snapshot is created.
  - Helper text: "This is a simple straight-line estimate. Update it when your vehicle value changes significantly."
- **Data:** Export all data as CSV button (includes rate snapshot info on each income row)
- **Appearance:** Dark mode toggle (default: dark)
- **Account:** Sign out button

### 5.8 Calculations (lib/utils/calculations.ts)

```typescript
import { RateSnapshot } from '@/lib/types';

// Fuel cost per trip — ALWAYS uses snapshot rates, never "current" rates
function calcFuelCost(mileage: number, snapshot: RateSnapshot): number {
  return (mileage / snapshot.mpg) * snapshot.gas_price;
}

// IRS standard method — uses snapshot's IRS rate
function calcMileageDeduction(mileage: number, snapshot: RateSnapshot): number {
  return mileage * snapshot.irs_rate;
}

// Determine which method to use based on user preference
function calcMileageCost(
  mileage: number,
  snapshot: RateSnapshot,
  method: 'actual' | 'irs'
): number {
  if (method === 'irs') return calcMileageDeduction(mileage, snapshot);
  return calcFuelCost(mileage, snapshot);
}

// Depreciation cost per trip — uses snapshot's depreciation_per_mile
function calcDepreciationCost(mileage: number, snapshot: RateSnapshot): number {
  return mileage * snapshot.depreciation_per_mile;
}

// Total mileage-related cost (fuel + depreciation)
function calcTotalMileageCost(
  mileage: number,
  snapshot: RateSnapshot,
  method: 'actual' | 'irs'
): { fuelCost: number; depreciationCost: number; total: number } {
  const fuelCost = calcMileageCost(mileage, snapshot, method);
  const depreciationCost = calcDepreciationCost(mileage, snapshot);
  return { fuelCost, depreciationCost, total: fuelCost + depreciationCost };
}

// Depreciation helper calculator (used in Settings page)
// Straight-line: (purchase - salvage) / totalMiles
function calcDepreciationPerMile(
  purchasePrice: number,
  salvageValue: number,
  expectedTotalMiles: number
): number {
  if (expectedTotalMiles <= 0) return 0;
  return Math.max(0, (purchasePrice - salvageValue) / expectedTotalMiles);
}

// Net profit — uses snapshot tax rate for the period
function calcNetProfit(
  totalIncome: number,
  totalExpenses: number,
  taxRate: number  // from snapshot, as percentage e.g. 25
): number {
  const taxSetAside = totalIncome * (taxRate / 100);
  return totalIncome - totalExpenses - taxSetAside;
}

// Per-entry profit (most accurate — uses baked-in costs)
function calcEntryProfit(
  incomeAmount: number,
  fuelCostAtLog: number | null,           // baked in from snapshot
  depreciationCostAtLog: number | null,   // baked in from snapshot
  taxRate: number                          // from the entry's snapshot
): number {
  const fuel = fuelCostAtLog ?? 0;
  const depreciation = depreciationCostAtLog ?? 0;
  const tax = incomeAmount * (taxRate / 100);
  return incomeAmount - fuel - depreciation - tax;
}
```

### 5.9 Rate Resolver (lib/utils/rate-resolver.ts)

```typescript
import { RateSnapshot } from '@/lib/types';

// Given a list of snapshots (sorted by effective_date desc) and a target date,
// find the active snapshot. This is the most recent snapshot where
// effective_date <= targetDate.
function resolveSnapshot(
  snapshots: RateSnapshot[],
  targetDate: Date
): RateSnapshot | null {
  return snapshots.find(s =>
    new Date(s.effective_date) <= targetDate
  ) ?? null;
}

// Check if a snapshot can be edited (not locked AND no entries reference it)
function canEditSnapshot(snapshot: RateSnapshot, linkedEntryCount: number): boolean {
  return !snapshot.is_locked && linkedEntryCount === 0;
}

// Check if a snapshot can be deleted (no entries reference it at all)
function canDeleteSnapshot(linkedEntryCount: number): boolean {
  return linkedEntryCount === 0;
}
```

---

## 6. TypeScript Types (lib/types/index.ts)

```typescript
export interface Profile {
  id: string;
  full_name: string | null;
  settings: {
    mileage_method: 'actual' | 'irs';
    currency: string;
    dark_mode: boolean;
    vehicle: {
      year: number | null;
      make_model: string | null;
      purchase_price: number | null;
      salvage_value: number | null;
      expected_total_miles: number | null;
      current_odometer: number | null;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface RateSnapshot {
  id: string;
  user_id: string;
  label: string | null;
  gas_price: number;
  mpg: number;
  irs_rate: number;
  tax_rate: number;
  depreciation_per_mile: number;
  effective_date: string;  // ISO date string YYYY-MM-DD
  is_locked: boolean;
  notes: string | null;
  created_at: string;
  // Virtual field — populated by join or separate count query
  linked_entry_count?: number;
}

export interface Hustle {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export interface IncomeEntry {
  id: string;
  user_id: string;
  hustle_id: string;
  amount: number;
  description: string | null;
  mileage: number | null;
  rate_snapshot_id: string | null;
  fuel_cost_at_log: number | null;
  depreciation_cost_at_log: number | null;
  date: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  hustle?: Hustle;
  rate_snapshot?: RateSnapshot;
}

export interface ExpenseEntry {
  id: string;
  user_id: string;
  hustle_id: string | null;
  amount: number;
  category: 'fuel' | 'fees' | 'supplies' | 'maintenance' | 'phone' | 'other';
  description: string | null;
  is_recurring: boolean;
  date: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  hustle?: Hustle;
}
```

---

## 7. Navigation Structure

**Bottom tab bar (always visible, 4 tabs):**

| Tab        | Icon         | Route      |
| ---------- | ------------ | ---------- |
| Dashboard  | LayoutGrid   | `/`        |
| Log        | PlusCircle   | `/log`     |
| History    | Clock        | `/history` |
| Settings   | Settings     | `/settings`|

- The "Log" tab should be visually prominent (accent color, slightly larger)
- Hustles page is accessed from dashboard hustle cards or a link in settings
- Rates page is accessed from dashboard rates banner, settings "Manage Rates" link, or a link in the log form's rate info line
- Keep nav flat — no nested menus

---

## 8. Design Token Integration

**IMPORTANT:** The user will provide a `design.md` file generated from Google Stitch. When that file is provided:

1. Extract all color tokens, typography, spacing, and component styles from design.md
2. Map them into `tailwind.config.ts` as custom theme extensions
3. Use those tokens EVERYWHERE — do not hardcode colors or sizes
4. If design.md specifies component patterns, follow them exactly

**Design tokens — from Google Stitch "The Synthetic Naturalist" (design.md is the source of truth):**

```
/* Surfaces — Warm Parchment tonal stack */
--surface:                    #faf8f2   /* Base parchment canvas */
--surface-dim:                (derived) /* Recessed areas, section backgrounds */
--surface-variant:            (derived) /* Glassmorphism fill at 60% opacity */
--surface-container-lowest:   (derived)
--surface-container-low:      (derived) /* Subtle recessed blocks — used for inputs */
--surface-container:          (derived) /* Nested modules */
--surface-container-high:     (derived)
--surface-container-highest:  (derived) /* Most prominent content cards */

/* Primary — Deep Navy */
--primary:                    #1e3a5f
--on-primary:                 (from design.md — light text on navy)

/* Secondary — Oxidized Teal (use sparingly as highlighter) */
--secondary:                  #2ca6a4
--secondary-container:        #2ca6a4   /* Specimen chips background */
--on-secondary-container:     (from design.md)

/* Semantic */
--income:                     #2ca6a4   /* Teal — interactive data, positive amounts */
--expense:                    (warm muted red from design.md)
--warning:                    (warm amber from design.md)

/* Text */
--on-surface:                 (from design.md — never pure #000)
--outline-variant:            15% opacity ghost borders only

/* Shape — Maximum Roundedness (level 3) */
--radius:                     max / pill   /* Continuous-curvature squircles everywhere */
/* All containers, cards, buttons, chips use maximum roundedness squircle shape */

/* Typography — Dual sans-serif system */
--font-narrative:             'Public Sans', sans-serif   /* Headlines, body, narrative text */
--font-technical:             'Work Sans', sans-serif     /* Labels, data, amounts, metadata */
/* Work Sans labels: ALWAYS uppercase with +5% letter-spacing */

/* Shadows — Navy-tinted ambient, never grey or black */
--shadow-ambient:             0 12px 32px rgba(30, 58, 95, 0.06)

/* Dark mode variant — "Journal by Candlelight" */
--surface-dark:               #1a1815
--surface-container-dark:     #242220
--on-surface-dark:            #ede6e0
```

**Design system rules to enforce in code (from Stitch output):**

**Borders & Sectioning:**
- Borders are STRICTLY PROHIBITED for sectioning. Use tonal shifts between surface tokens.
- No `<hr>` tags or `border-bottom` for list separation. Use vertical whitespace or background toggles between surface tiers.
- Ghost borders (outline-variant at 15% opacity) ONLY as an accessibility fallback — should look like a faint pencil mark.

**Inputs:**
- NO bottom-border or box styling. Inputs use `surface-container-low` as a subtle recessed block.
- Labels: Work Sans label-sm, uppercase, positioned top-left floating outside the input area.

**Buttons:**
- Primary: `primary` background, `on-primary` text (Public Sans Bold). Maximum-radius pill shape. CTA gradient: 135° from primary to a supporting shade.
- Secondary: `surface-container-highest` background, `on-surface` text. No border.
- Tertiary: Work Sans uppercase with Oxidized Teal underline (2px) that expands on hover.

**Cards & Containers:**
- ALL containers use maximum roundedness (level 3) as continuous-curvature squircles — like smooth river stones.
- No sharp or moderate corners anywhere. Everything is max-radius pill/squircle.
- In grids, offset second column ~40px vertically for asymmetry.

**Floating Elements (bottom nav, modals):**
- Glassmorphism: `surface-variant` at 60% opacity with `backdrop-blur: 12px`.
- Icons: thin-stroke (1px) to match Work Sans technical precision.

**Typography Mixing:**
- Public Sans for all headlines, body, section titles — the modern, clear narrative voice.
- Work Sans for all labels, metadata, data points, monetary amounts, categories, badges — the technical, engineered voice.
- Work Sans labels must be uppercase with +5% letter-spacing when denoting categories or metadata.
- Monetary amounts always in Work Sans at a heavier weight.
- Both fonts mix within the same component.

**Specimen Chips:**
- Use `secondary-container` (#2ca6a4) with `on-secondary-container` text.
- These look like small synthetic tags pinned to a page — used for hustle badges, category pills, status tags.

**Shadows:**
- Navy-tinted ambient only: `0 12px 32px rgba(30, 58, 95, 0.06)`.
- If it doesn't look like ambient light hitting paper, it's too heavy.
- Never use standard drop shadows from component libraries.

---

## 9. Build Order (for Claude CLI)

Follow this exact sequence:

### Phase 1: Foundation
1. Scaffold Next.js project with TypeScript, Tailwind, App Router
2. Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, shadcn/ui, recharts, lucide-react
3. Set up Supabase client (lib/supabase/client.ts, server.ts)
4. Set up middleware for auth
5. Create TypeScript types (lib/types/index.ts) — includes RateSnapshot type
6. Create utility functions (calculations.ts, rate-resolver.ts, formatters.ts, constants.ts)
7. Integrate design.md tokens into tailwind.config.ts

### Phase 2: Auth & Layout
8. Build login/signup page
9. Build root layout with bottom nav
10. Build page-header component
11. Set up auth context/provider
12. On first login: create profile row + default rate snapshot (seed data)

### Phase 3: Rate System (build BEFORE data entry so forms can use it)
13. Build use-rates hook (CRUD + resolveActiveSnapshot for a given date)
14. Build rate-form component (create/edit snapshot)
15. Build rate-card component (display single snapshot)
16. Build rate-lock-toggle component
17. Build rate-timeline component
18. Build active-rate-banner component
19. Assemble rates page (/rates)

### Phase 4: Core Data Entry
20. Build hustle-form component (create/edit modal)
21. Build hustles page (grid + add)
22. Build income-form component — integrates with rate resolver:
    - On mileage input, show fuel cost AND depreciation cost preview using active snapshot
    - On date change, re-resolve snapshot and update preview
    - On save, bake in fuel_cost_at_log, depreciation_cost_at_log, and rate_snapshot_id
23. Build expense-form component
24. Build log page with income/expense toggle
25. Build all remaining Supabase hooks (use-hustles, use-income, use-expenses)

### Phase 5: Dashboard
26. Build stat-cards component (uses per-entry baked-in costs, not current rates)
27. Build active-rate-banner for dashboard
28. Build weekly-chart component
29. Build hustle-summary component
30. Build recent-activity feed (shows baked-in fuel + depreciation costs on income rows)
31. Assemble dashboard page

### Phase 6: History & Details
32. Build transaction-list, transaction-row (shows rate info on income entries), filter-bar
33. Build history page
34. Build hustle detail page
35. Build edit entry page (log/[id]) — shows which snapshot was used, warns if rates differ from current

### Phase 7: Settings & Polish
36. Build vehicle-form component (year, make/model, odometer — stored in profile settings)
37. Build depreciation-calculator component (live calc: purchase price, salvage, total miles → $/mile output with "Use this rate" button)
38. Build settings page with all sections: profile, current rates card, mileage method, vehicle info, depreciation calculator, data export, appearance, account
39. CSV export function (includes snapshot rates + depreciation per income row)
40. Loading skeletons and empty states
41. Error handling and toast notifications
42. Mobile responsiveness pass
43. Dark mode implementation

---

## 10. Claude CLI Commands

Use these prompts with Claude CLI at each phase:

```bash
# Initial scaffold
claude "Read HUSTLEBOOKS_PROJECT_PLAN.md and design.md. Scaffold the Next.js project, install all dependencies, set up the file structure from section 4, and configure Tailwind with the design tokens. Create all TypeScript types and utility functions including the rate resolver and depreciation calculator."

# Auth & Layout
claude "Build the authentication flow (login page, Supabase auth setup, middleware) and the root layout with bottom navigation bar. On first login, create a profile row and a default rate snapshot (with depreciation_per_mile defaulting to 0). Follow the design.md styles."

# Rate system
claude "Build the complete rate snapshot system: use-rates hook, rate form (including depreciation_per_mile field), rate card, rate timeline, lock toggle, active rate banner, and the /rates page. Follow specs in section 5.6 of the project plan."

# Data entry
claude "Build the hustle management page and the log entry page. The income form must resolve the active rate snapshot for the selected date, show a fuel cost AND depreciation cost preview, and bake in both fuel_cost_at_log and depreciation_cost_at_log on save. Create all Supabase hooks for CRUD operations."

# Dashboard
claude "Build the dashboard page with stat cards (using baked-in fuel + depreciation costs, not current rates), active rate banner showing all 5 rate values, weekly chart, per-hustle summary cards, and recent activity feed."

# History & polish
claude "Build the history page with filters (income rows show baked-in fuel + depreciation info), hustle detail page, and entry edit page. Follow the design.md styles."

# Settings
claude "Build the settings page: profile section, current rates quick-view with Manage Rates link, mileage method toggle, vehicle info form, depreciation calculator (live calculation with 'Use this rate' button that navigates to /rates with value pre-filled), CSV export, dark mode toggle, and sign out. Follow specs in section 5.7."
```

---

## 11. Environment Variables Needed

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

That's it. No other secrets needed for MVP.

---

## 12. Rate System — Quick Reference for Developers

### The Golden Rule
**Never calculate fuel cost or depreciation from "current" rates. Always use the snapshot that was active on the entry's date, and bake in the results.**

### Flow: User Logs an Income Entry with Mileage
```
1. User fills in: hustle, amount, mileage, date
2. Frontend calls resolveSnapshot(snapshots, entryDate)
3. Frontend shows preview: "Using Q1 2026 rates ($3.50/gal, 25 MPG, $0.12/mi depr.) → Fuel: $X.XX · Depr: $Y.YY"
4. User taps Save
5. Calculate fuel_cost_at_log = (mileage / snapshot.mpg) * snapshot.gas_price
6. Calculate depreciation_cost_at_log = mileage * snapshot.depreciation_per_mile
7. INSERT income row with rate_snapshot_id, fuel_cost_at_log, and depreciation_cost_at_log
8. Done. This entry's fuel and depreciation costs are now permanent.
```

### Flow: User Updates Their Rates
```
1. User goes to /rates, taps "Update Rates"
2. User enters new gas price, MPG, IRS rate, tax %, depreciation/mile
3. New snapshot is created with effective_date = today (or user-chosen date)
4. All FUTURE entries (dated >= effective_date) will use this snapshot
5. All PAST entries are untouched — they still reference their original snapshot
```

### Flow: User Calculates Depreciation Rate
```
1. User goes to Settings → Depreciation Calculator
2. Enters: purchase price ($15,000), salvage value ($2,000), expected total miles (150,000)
3. Calculator shows live: "$0.087/mile"
4. User taps "Use this rate"
5. App navigates to /rates with depreciation_per_mile pre-filled at 0.087
6. User reviews all rate fields and saves the snapshot
7. Future income entries with mileage will bake in depreciation at $0.087/mi
```

### Flow: User Locks a Snapshot
```
1. User goes to /rates, finds a snapshot, taps the lock toggle
2. Confirmation dialog: "Lock these rates? They won't be editable."
3. is_locked = true
4. The snapshot can no longer be edited or deleted
5. Entries using this snapshot are extra-protected
```

### Edge Cases
- **Backdated entry:** User logs income for Jan 15 but it's now Feb 10. The snapshot active on Jan 15 is used, NOT the current one.
- **No snapshot found:** If somehow no snapshot exists for the date (shouldn't happen with seed), fall back to the oldest available snapshot and warn the user.
- **Overlapping dates:** The unique index on (user_id, effective_date) prevents two snapshots on the same date. If the user wants to update rates for today and a snapshot already exists for today, UPDATE that snapshot instead of creating a new one (only if not locked).
- **Editing old entries:** When editing an income entry, show which snapshot was used. If the user changes the date, re-resolve the snapshot. If they change mileage, recalculate both fuel_cost_at_log and depreciation_cost_at_log using the ORIGINAL snapshot (not current).

---

## 13. Future Features (Post-MVP Backlog)

Track these for later — do NOT build in MVP:

- [ ] Receipt photo upload (Supabase Storage)
- [ ] Advanced depreciation methods (MACRS, declining balance) — currently only straight-line is supported
- [ ] Quarterly tax estimation with real brackets
- [ ] Time tracking per trip (hourly wage calculation)
- [ ] Marketplace inventory tracker
- [ ] Best earning times heatmap
- [ ] Offline mode with sync (PWA)
- [ ] Push notifications for weekly summaries
- [ ] Multi-currency support
- [ ] Bulk import from platform CSV exports (DoorDash, Uber, etc.)
- [ ] Schedule C export for tax filing
- [ ] Shared expenses split across hustles by percentage
- [ ] Auto-fetch gas prices from API (GasBuddy, etc.)
- [ ] IRS rate auto-update notification when new rates are published
