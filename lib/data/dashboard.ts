import { createClient } from '@/lib/supabase/client'
import type { RateSnapshot, Hustle, IncomeEntry, ExpenseEntry, TransactionEntry } from '@/lib/types'

export interface DashboardRaw {
  allIncome: Pick<IncomeEntry, 'amount' | 'hustle_id' | 'fuel_cost_at_log' | 'depreciation_cost_at_log' | 'mileage' | 'cogs' | 'is_taxable' | 'date'>[]
  allExpenses: Pick<ExpenseEntry, 'amount' | 'hustle_id' | 'date'>[]
  hustles: Hustle[]
  activeSnapshot: RateSnapshot | null
  recentActivity: TransactionEntry[]
}

export async function fetchDashboardRaw(): Promise<DashboardRaw> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [incomeRes, expensesRes, hustlesRes, snapshotRes, recentIncomeRes, recentExpensesRes] = await Promise.all([
    supabase.from('income').select('amount, hustle_id, fuel_cost_at_log, depreciation_cost_at_log, mileage, cogs, is_taxable, date'),
    supabase.from('expenses').select('amount, hustle_id, date'),
    supabase.from('hustles').select('*').eq('is_active', true).order('created_at', { ascending: true }),
    supabase.from('rate_snapshots').select('*').lte('effective_date', today).order('effective_date', { ascending: false }).limit(1).single(),
    supabase.from('income').select('*, hustle:hustles(id, name, color, icon)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    supabase.from('expenses').select('*, hustle:hustles(id, name, color, icon)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
  ])

  const recentIncome: TransactionEntry[] = (recentIncomeRes.data ?? []).map((r: IncomeEntry) => ({ ...r, entry_type: 'income' as const }))
  const recentExpenses: TransactionEntry[] = (recentExpensesRes.data ?? []).map((r: ExpenseEntry) => ({ ...r, entry_type: 'expense' as const }))
  const recentActivity = [...recentIncome, ...recentExpenses]
    .sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  return {
    allIncome: (incomeRes.data ?? []) as DashboardRaw['allIncome'],
    allExpenses: (expensesRes.data ?? []) as DashboardRaw['allExpenses'],
    hustles: (hustlesRes.data ?? []) as Hustle[],
    activeSnapshot: snapshotRes.data ?? null,
    recentActivity,
  }
}
