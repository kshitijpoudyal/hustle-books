#!/usr/bin/env node
/**
 * Seed a demo account for HustleBooks.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-demo.mjs
 *
 * The script is idempotent — re-running it will skip creation if the user
 * already exists and upsert the demo data.
 *
 * Demo credentials (also shown on the login page):
 *   Email:    demo@hustlebooks.app
 *   Password: HustleDemo2024
 */

const SUPABASE_URL = 'https://qmuwrxxwgdombwqkceeg.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_EMAIL = 'demo@hustlebooks.app'
const DEMO_PASSWORD = 'HustleDemo2024'

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY env var is required.')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
}

async function req(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, data: text } }
}

async function main() {
  console.log('→ Creating demo user…')

  // Create user via admin API
  let userId
  const create = await req('/auth/v1/admin/users', {
    method: 'POST',
    body: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Demo User' },
    },
  })

  if (create.ok) {
    userId = create.data.id
    console.log(`  ✓ Created user ${userId}`)
  } else if (String(create.data?.error_code).includes('email_exists') || String(create.data?.msg).includes('already been registered')) {
    // User exists — look up their ID
    const list = await req('/auth/v1/admin/users?per_page=1000')
    const existing = list.data?.users?.find(u => u.email === DEMO_EMAIL)
    if (!existing) { console.error('Could not find existing demo user'); process.exit(1) }
    userId = existing.id
    console.log(`  ↩ User already exists ${userId}`)
  } else {
    console.error('Failed to create user:', create.data)
    process.exit(1)
  }

  // ── Upsert profile ──────────────────────────────────────────────────────────
  console.log('→ Upserting profile…')
  await req('/rest/v1/profiles', {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: {
      id: userId,
      full_name: 'Demo User',
      settings: {
        mileage_method: 'irs',
        currency: 'USD',
        dark_mode: false,
        include_depreciation_in_profit: true,
        include_tax_in_profit: true,
        show_calculator_fab: true,
        vehicle: {
          year: 2021,
          make_model: 'Toyota Camry',
          purchase_price: 28000,
          salvage_value: 5000,
          expected_total_miles: 150000,
          current_odometer: 42000,
        },
      },
    },
  })
  console.log('  ✓ Profile ready')

  // ── Rate snapshot ───────────────────────────────────────────────────────────
  console.log('→ Upserting rate snapshot…')
  await req('/rest/v1/rate_snapshots', {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: {
      user_id: userId,
      label: 'Current Rates',
      gas_price: 3.89,
      mpg: 32,
      irs_rate: 0.67,
      tax_rate: 25,
      depreciation_per_mile: 0.08,
      effective_date: '2024-01-01',
      is_locked: false,
      notes: 'Demo rates — IRS 2024 standard mileage',
    },
  })
  const snapFetch = await req(`/rest/v1/rate_snapshots?user_id=eq.${userId}&effective_date=eq.2024-01-01&select=id`)
  const snapshotId = snapFetch.data?.[0]?.id
  console.log(`  ✓ Snapshot ${snapshotId}`)

  // ── Hustles ─────────────────────────────────────────────────────────────────
  console.log('→ Upserting hustles…')
  const hustleRes = await req('/rest/v1/hustles', {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: [
      { user_id: userId, name: 'DoorDash', color: '#FF3008', icon: '🚗', is_active: true, category: 'on_demand_services' },
      { user_id: userId, name: 'eBay Flipping', color: '#E53238', icon: '📦', is_active: true, category: 'reselling_and_flipping' },
      { user_id: userId, name: 'Freelance Design', color: '#2ca6a4', icon: '💻', is_active: true, category: 'digital_products' },
    ],
  })

  // Always re-fetch to get canonical IDs
  const fetchedHustles = await req(`/rest/v1/hustles?user_id=eq.${userId}&select=id,name`)
  const hustles = fetchedHustles.data

  const h = (name) => hustles.find(h => h.name === name)?.id
  const ddId = h('DoorDash')
  const ebayId = h('eBay Flipping')
  const flId = h('Freelance Design')
  console.log(`  ✓ DoorDash(${ddId}) eBay(${ebayId}) Freelance(${flId})`)

  // ── Helper: date N days ago ─────────────────────────────────────────────────
  const ago = (days) => {
    const d = new Date(); d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
  }

  // ── Income entries ──────────────────────────────────────────────────────────
  console.log('→ Seeding income entries…')
  const fuelCost = (miles) => parseFloat(((miles / 32) * 3.89).toFixed(2))
  const deprCost = (miles) => parseFloat((miles * 0.08).toFixed(2))

  const incomeRows = [
    // ── DoorDash — every entry has mileage ──────────────────────────────────
    { user_id: userId, hustle_id: ddId, amount: 142.50, description: 'DoorDash weekend rush', mileage: 87, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(87), depreciation_cost_at_log: deprCost(87), is_taxable: true, date: ago(2) },
    { user_id: userId, hustle_id: ddId, amount: 98.75,  description: 'Dinner shift',          mileage: 61, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(61), depreciation_cost_at_log: deprCost(61), is_taxable: true, date: ago(5) },
    { user_id: userId, hustle_id: ddId, amount: 167.20, description: 'Fri + Sat double shift', mileage: 104, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(104), depreciation_cost_at_log: deprCost(104), is_taxable: true, date: ago(9) },
    { user_id: userId, hustle_id: ddId, amount: 85.00,  description: 'Lunch rush',             mileage: 52, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(52), depreciation_cost_at_log: deprCost(52), is_taxable: true, date: ago(13) },
    { user_id: userId, hustle_id: ddId, amount: 210.00, description: 'Holiday weekend',        mileage: 130, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(130), depreciation_cost_at_log: deprCost(130), is_taxable: true, date: ago(17) },
    { user_id: userId, hustle_id: ddId, amount: 122.50, description: 'Standard weeknight',     mileage: 76, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(76), depreciation_cost_at_log: deprCost(76), is_taxable: true, date: ago(21) },
    { user_id: userId, hustle_id: ddId, amount: 175.00, description: 'Saturday marathon',      mileage: 109, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(109), depreciation_cost_at_log: deprCost(109), is_taxable: true, date: ago(26) },
    { user_id: userId, hustle_id: ddId, amount: 93.25,  description: 'Short evening run',      mileage: 58, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(58), depreciation_cost_at_log: deprCost(58), is_taxable: true, date: ago(30) },
    { user_id: userId, hustle_id: ddId, amount: 155.00, description: 'Mid-week grind',         mileage: 96, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(96), depreciation_cost_at_log: deprCost(96), is_taxable: true, date: ago(38) },
    { user_id: userId, hustle_id: ddId, amount: 190.00, description: 'Big week',               mileage: 118, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(118), depreciation_cost_at_log: deprCost(118), is_taxable: true, date: ago(45) },
    { user_id: userId, hustle_id: ddId, amount: 112.75, description: 'Rainy day bonus surge',  mileage: 70, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(70), depreciation_cost_at_log: deprCost(70), is_taxable: true, date: ago(52) },
    { user_id: userId, hustle_id: ddId, amount: 198.50, description: 'Super Bowl weekend',     mileage: 124, rate_snapshot_id: snapshotId, fuel_cost_at_log: fuelCost(124), depreciation_cost_at_log: deprCost(124), is_taxable: true, date: ago(60) },

    // ── eBay Flipping — all with COGS ───────────────────────────────────────
    { user_id: userId, hustle_id: ebayId, amount: 340.00, description: 'Vintage camera lot',          mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 120.00, is_taxable: true, date: ago(3) },
    { user_id: userId, hustle_id: ebayId, amount: 89.99,  description: 'Nintendo DS bundle',          mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 25.00,  is_taxable: true, date: ago(7) },
    { user_id: userId, hustle_id: ebayId, amount: 220.00, description: 'Thrift store electronics',   mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 65.00,  is_taxable: true, date: ago(11) },
    { user_id: userId, hustle_id: ebayId, amount: 155.00, description: 'Canon lens lot',             mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 50.00,  is_taxable: true, date: ago(16) },
    { user_id: userId, hustle_id: ebayId, amount: 475.00, description: 'MacBook Air refurb',         mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 280.00, is_taxable: true, date: ago(22) },
    { user_id: userId, hustle_id: ebayId, amount: 62.00,  description: 'Vintage denim jacket',       mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 12.00,  is_taxable: true, date: ago(27) },
    { user_id: userId, hustle_id: ebayId, amount: 310.00, description: 'Sony headphones (x3)',       mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 135.00, is_taxable: true, date: ago(34) },
    { user_id: userId, hustle_id: ebayId, amount: 145.00, description: 'Polaroid camera + film',     mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 40.00,  is_taxable: true, date: ago(40) },
    { user_id: userId, hustle_id: ebayId, amount: 780.00, description: 'iPad Pro 2022 lot (2 units)',mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 480.00, is_taxable: true, date: ago(48) },
    { user_id: userId, hustle_id: ebayId, amount: 95.00,  description: 'Air Jordan retro pair',      mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, cogs: 45.00,  is_taxable: true, date: ago(55) },

    // ── Freelance Design ─────────────────────────────────────────────────────
    { user_id: userId, hustle_id: flId, amount: 1200.00, description: 'Logo + brand guide',              mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, is_taxable: true, date: ago(4) },
    { user_id: userId, hustle_id: flId, amount: 800.00,  description: 'Website redesign — 50% deposit', mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, is_taxable: true, date: ago(12) },
    { user_id: userId, hustle_id: flId, amount: 800.00,  description: 'Website redesign — final',       mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, is_taxable: true, date: ago(1) },
    { user_id: userId, hustle_id: flId, amount: 450.00,  description: 'Social media graphics pack',     mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, is_taxable: true, date: ago(25) },
    { user_id: userId, hustle_id: flId, amount: 2500.00, description: 'App UI design project',          mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, is_taxable: true, date: ago(50) },
    { user_id: userId, hustle_id: flId, amount: 350.00,  description: 'Pitch deck design',              mileage: null, rate_snapshot_id: null, fuel_cost_at_log: null, depreciation_cost_at_log: null, is_taxable: true, date: ago(33) },
  ]

  await req('/rest/v1/income', {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates' },
    body: incomeRows,
  })
  console.log(`  ✓ ${incomeRows.length} income entries`)

  // ── Expense entries ─────────────────────────────────────────────────────────
  console.log('→ Seeding expense entries…')
  const expenseRows = [
    // DoorDash
    { user_id: userId, hustle_id: ddId, amount: 68.40,  category: 'fuel',        description: 'Gas fill-up',           is_recurring: false, date: ago(3) },
    { user_id: userId, hustle_id: ddId, amount: 71.20,  category: 'fuel',        description: 'Gas fill-up',           is_recurring: false, date: ago(18) },
    { user_id: userId, hustle_id: ddId, amount: 65.80,  category: 'fuel',        description: 'Gas fill-up',           is_recurring: false, date: ago(35) },
    { user_id: userId, hustle_id: ddId, amount: 14.99,  category: 'phone',       description: 'Phone mount',           is_recurring: false, date: ago(10) },
    { user_id: userId, hustle_id: ddId, amount: 12.50,  category: 'supplies',    description: 'Insulated delivery bag',is_recurring: false, date: ago(20) },
    { user_id: userId, hustle_id: ddId, amount: 72.00,  category: 'maintenance', description: 'Oil change',            is_recurring: false, date: ago(40) },
    { user_id: userId, hustle_id: ddId, amount: 18.00,  category: 'maintenance', description: 'Car wash',              is_recurring: false, date: ago(25) },
    // eBay Flipping
    { user_id: userId, hustle_id: ebayId, amount: 29.95, category: 'fees',     description: 'eBay final value fees',   is_recurring: false, date: ago(5) },
    { user_id: userId, hustle_id: ebayId, amount: 41.20, category: 'fees',     description: 'eBay fees — MacBook lot', is_recurring: false, date: ago(23) },
    { user_id: userId, hustle_id: ebayId, amount: 18.40, category: 'supplies', description: 'Bubble wrap + boxes',     is_recurring: false, date: ago(15) },
    { user_id: userId, hustle_id: ebayId, amount: 24.50, category: 'supplies', description: 'Packing tape + poly bags',is_recurring: false, date: ago(36) },
    { user_id: userId, hustle_id: ebayId, amount: 22.75, category: 'fees',     description: 'PayPal processing fees',  is_recurring: false, date: ago(30) },
    { user_id: userId, hustle_id: ebayId, amount: 15.00, category: 'other',    description: 'Thrift store gas trip',   is_recurring: false, date: ago(42) },
    // Freelance Design
    { user_id: userId, hustle_id: flId, amount: 54.99, category: 'other', description: 'Adobe CC monthly', is_recurring: true, date: ago(7) },
    { user_id: userId, hustle_id: flId, amount: 54.99, category: 'other', description: 'Adobe CC monthly', is_recurring: true, date: ago(37) },
    { user_id: userId, hustle_id: flId, amount: 12.00, category: 'other', description: 'Figma pro',        is_recurring: true, date: ago(7) },
    // General / shared
    { user_id: userId, hustle_id: null, amount: 120.00, category: 'phone', description: 'Phone bill — business use', is_recurring: true, date: ago(6) },
    { user_id: userId, hustle_id: null, amount: 120.00, category: 'phone', description: 'Phone bill — business use', is_recurring: true, date: ago(36) },
  ]

  await req('/rest/v1/expenses', {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates' },
    body: expenseRows,
  })
  console.log(`  ✓ ${expenseRows.length} expense entries`)

  console.log('\n✅ Demo account ready!')
  console.log(`   Email:    ${DEMO_EMAIL}`)
  console.log(`   Password: ${DEMO_PASSWORD}`)
}

main().catch(e => { console.error(e); process.exit(1) })
