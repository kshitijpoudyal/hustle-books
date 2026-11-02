// Server-only data access for the Kshitij Studio API. Uses the Supabase secret key, so it
// bypasses RLS: every query here MUST filter by the owner's user id, which comes only from
// STUDIO_OWNER_EMAIL (never from the request). Import only from app/api/studio routes.
// See studio/docs/AUTHENTICATION_STRATEGY.md §4b.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Hustle, RateSnapshot } from '@/lib/types'
import type { DashboardRaw } from '@/lib/data/dashboard'

export const STUDIO_APP_ID = 'hustlebooks'

export interface Owner { id: string; email: string }

let admin: SupabaseClient | null = null
let ownerCache: { owner: Owner; expires: number } | null = null

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return admin
}

export function studioConfigured(): boolean {
  return !!process.env.STUDIO_APP_SECRET && !!process.env.STUDIO_OWNER_EMAIL && !!adminClient()
}

/** The owner = the user whose verified email is in STUDIO_OWNER_EMAIL. Cached for 10 minutes. */
export async function resolveOwner(): Promise<Owner | null> {
  if (ownerCache && ownerCache.expires > Date.now()) return ownerCache.owner
  const db = adminClient()
  const emails = (process.env.STUDIO_OWNER_EMAIL ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!db || emails.length === 0) return null

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(u => u.email && u.email_confirmed_at && emails.includes(u.email.toLowerCase()))
    if (match) {
      const owner = { id: match.id, email: match.email!.toLowerCase() }
      ownerCache = { owner, expires: Date.now() + 10 * 60_000 }
      return owner
    }
    if (data.users.length < 200) break
  }
  return null
}

export interface OwnerData {
  income: DashboardRaw['allIncome']
  expenses: DashboardRaw['allExpenses']
  hustles: Hustle[]
  activeSnapshot: RateSnapshot | null
  includeDeprInProfit: boolean
  includeTaxInProfit: boolean
}

/** The owner's rows between two dates, in the shape the dashboard uses. */
export async function loadOwnerData(ownerId: string, from: string, to: string): Promise<OwnerData> {
  const db = adminClient()
  if (!db) throw new Error('Studio API not configured')
  const today = new Date().toISOString().split('T')[0]

  const [incomeRes, expensesRes, hustlesRes, snapshotRes, userRes] = await Promise.all([
    db.from('income').select('amount, hustle_id, fuel_cost_at_log, depreciation_cost_at_log, mileage, cogs, is_taxable, date')
      .eq('user_id', ownerId).gte('date', from).lte('date', to),
    db.from('expenses').select('amount, hustle_id, date').eq('user_id', ownerId).gte('date', from).lte('date', to),
    db.from('hustles').select('*').eq('user_id', ownerId).eq('is_active', true).order('created_at', { ascending: true }),
    db.from('rate_snapshots').select('*').eq('user_id', ownerId).lte('effective_date', today)
      .order('effective_date', { ascending: false }).limit(1).maybeSingle(),
    db.from('users').select('settings').eq('id', ownerId).maybeSingle(),
  ])
  for (const res of [incomeRes, expensesRes, hustlesRes, snapshotRes, userRes]) if (res.error) throw res.error

  const settings = (userRes.data?.settings ?? {}) as { include_depreciation_in_profit?: boolean; include_tax_in_profit?: boolean }
  return {
    income: (incomeRes.data ?? []) as OwnerData['income'],
    expenses: (expensesRes.data ?? []) as OwnerData['expenses'],
    hustles: (hustlesRes.data ?? []) as Hustle[],
    activeSnapshot: (snapshotRes.data ?? null) as RateSnapshot | null,
    includeDeprInProfit: settings.include_depreciation_in_profit ?? true,
    includeTaxInProfit: settings.include_tax_in_profit ?? true,
  }
}

export function envelope(data: unknown, owner: Owner) {
  return {
    data,
    meta: { app: STUDIO_APP_ID, owner: owner.email, api: '1', appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null, generatedAt: new Date().toISOString() },
  }
}

export function studioError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } })
}
