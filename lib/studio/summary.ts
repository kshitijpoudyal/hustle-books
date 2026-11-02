// Builds the Studio summary (studio/docs/API_CONTRACTS.md §3) from the same rows and math as
// the dashboard (lib/hooks/use-dashboard.ts), so the Studio shows exactly what the app shows.
import { calcNetProfit, calcTaxSetAside } from '@/lib/utils/calculations'
import type { Hustle, RateSnapshot } from '@/lib/types'
import type { DashboardRaw } from '@/lib/data/dashboard'

type Income = DashboardRaw['allIncome'][number]
type Expense = DashboardRaw['allExpenses'][number]

export interface SummaryInput {
  period: string // YYYY-MM
  income: Income[] // may include other months; filtered here
  expenses: Expense[]
  hustles: Hustle[]
  activeSnapshot: RateSnapshot | null
  includeDeprInProfit: boolean
  includeTaxInProfit: boolean
}

interface Money { cents: number; currency: 'USD'; direction: 'in' | 'out' }

const money = (dollars: number, positive: 'in' | 'out' = 'in'): Money => ({
  cents: Math.round(Math.abs(dollars) * 100),
  currency: 'USD',
  direction: dollars < 0 ? (positive === 'in' ? 'out' : 'in') : positive,
})

const usd = (dollars: number) =>
  dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function monthRange(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${period}-01`, end: `${period}-${String(last).padStart(2, '0')}` }
}

export function previousPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function isPeriod(value: string | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function totals(income: Income[], expenses: Expense[], taxRate: number, deprIn: boolean, taxIn: boolean) {
  const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0)
  const totalIncome = sum(income, r => Number(r.amount))
  const taxableIncome = sum(income.filter(r => r.is_taxable), r => Number(r.amount))
  const totalExpenses = sum(expenses, r => Number(r.amount))
  const totalCogs = sum(income, r => Number(r.cogs ?? 0))
  const totalDepreciation = sum(income, r => Number(r.depreciation_cost_at_log ?? 0))
  const netProfit = calcNetProfit(totalIncome, totalExpenses, taxIn ? taxRate : 0, totalCogs, taxableIncome, deprIn ? totalDepreciation : 0)
  return { totalIncome, taxableIncome, totalExpenses, totalCogs, totalDepreciation, netProfit }
}

export function buildSummary(input: SummaryInput) {
  const { period, hustles, activeSnapshot, includeDeprInProfit: deprIn, includeTaxInProfit: taxIn } = input
  const taxRate = activeSnapshot?.tax_rate ?? 25
  const inRange = (r: { date: string }, { start, end }: { start: string; end: string }) => r.date >= start && r.date <= end

  const cur = monthRange(period)
  const prev = monthRange(previousPeriod(period))
  const income = input.income.filter(r => inRange(r, cur))
  const expenses = input.expenses.filter(r => inRange(r, cur))
  const now = totals(income, expenses, taxRate, deprIn, taxIn)
  const before = totals(input.income.filter(r => inRange(r, prev)), input.expenses.filter(r => inRange(r, prev)), taxRate, deprIn, taxIn)
  const taxSetAside = calcTaxSetAside(now.taxableIncome, taxRate)

  const topHustles = hustles
    .map(h => {
      const hi = income.filter(r => r.hustle_id === h.id)
      const he = expenses.filter(r => r.hustle_id === h.id)
      return { hustle: h, active: hi.length + he.length > 0, ...totals(hi, he, taxRate, deprIn, taxIn) }
    })
    .filter(h => h.active)
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 3)

  const attention: { label: string; url: string; severity: 'warning' | 'info' }[] = []
  if (!activeSnapshot) attention.push({ label: 'No rate snapshot yet', url: '/rates', severity: 'warning' })
  else if (Number(activeSnapshot.depreciation_per_mile) === 0) attention.push({ label: 'Depreciation not set', url: '/rates', severity: 'warning' })

  return {
    period,
    headline: {
      label: 'Profit this month',
      value: money(now.netProfit),
      trend: before.netProfit !== 0 ? (now.netProfit - before.netProfit) / Math.abs(before.netProfit) : null,
    },
    metrics: [
      { key: 'income', label: 'Income', value: money(now.totalIncome) },
      { key: 'expenses', label: 'Expenses', value: money(now.totalExpenses, 'out') },
      { key: 'tax', label: 'Tax to set aside', value: money(taxSetAside, 'out') },
    ],
    widgets: [
      { type: 'list', title: 'Top hustles', items: topHustles.map(h => ({ label: h.hustle.name, value: usd(h.netProfit) })) },
    ],
    attention,
  }
}
