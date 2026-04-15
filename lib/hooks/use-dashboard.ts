'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcNetProfit } from '@/lib/utils/calculations'
import { daysSince } from '@/lib/utils/formatters'
import type { RateSnapshot, Hustle, IncomeEntry, ExpenseEntry, TransactionEntry } from '@/lib/types'

export interface WeeklyBar {
  label: string  // e.g. "Mar 31"
  income: number
  expenses: number
}

export interface HustleStat {
  hustle: Hustle
  income: number
  expenses: number
  profit: number
}

export interface DashboardData {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  taxSetAside: number
  totalDepreciation: number
  totalMileage: number
  activeSnapshot: RateSnapshot | null
  snapshotDaysOld: number
  weeklyBars: WeeklyBar[]
  hustleStats: HustleStat[]
  recentActivity: TransactionEntry[]
  loading: boolean
  error: string | null
}

// Last 6 calendar months (oldest → newest)
function getMonthlyRanges(): Array<{ label: string; start: string; end: string }> {
  const today = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    months.push({
      label: start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    })
  }
  return months
}

export function useDashboard(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    taxSetAside: 0,
    totalDepreciation: 0,
    totalMileage: 0,
    activeSnapshot: null,
    snapshotDaysOld: 0,
    weeklyBars: [],
    hustleStats: [],
    recentActivity: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const monthRanges = getMonthlyRanges()
      const today = new Date().toISOString().split('T')[0]

      try {
        const [
          incomeRes,
          expensesRes,
          hustlesRes,
          snapshotRes,
          recentIncomeRes,
          recentExpensesRes,
        ] = await Promise.all([
          // All-time income
          supabase
            .from('income')
            .select('amount, hustle_id, fuel_cost_at_log, depreciation_cost_at_log, mileage, date'),

          // All-time expenses
          supabase
            .from('expenses')
            .select('amount, hustle_id, date'),

          // All active hustles
          supabase
            .from('hustles')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true }),

          // Active rate snapshot
          supabase
            .from('rate_snapshots')
            .select('*')
            .lte('effective_date', today)
            .order('effective_date', { ascending: false })
            .limit(1)
            .single(),

          // Recent income (last 10, joined hustle)
          supabase
            .from('income')
            .select('*, hustle:hustles(id, name, color, icon)')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(10),

          // Recent expenses (last 10, joined hustle)
          supabase
            .from('expenses')
            .select('*, hustle:hustles(id, name, color, icon)')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        const allIncome = (incomeRes.data ?? []) as Pick<IncomeEntry, 'amount' | 'hustle_id' | 'fuel_cost_at_log' | 'depreciation_cost_at_log' | 'mileage' | 'date'>[]
        const allExpenses = (expensesRes.data ?? []) as Pick<ExpenseEntry, 'amount' | 'hustle_id' | 'date'>[]
        const hustles: Hustle[] = hustlesRes.data ?? []
        const activeSnapshot: RateSnapshot | null = snapshotRes.data ?? null

        // All-time totals
        const totalIncome = allIncome.reduce((s, r) => s + Number(r.amount), 0)
        const totalExpenses = allExpenses.reduce((s, r) => s + Number(r.amount), 0)
        const totalDepreciation = allIncome.reduce((s, r) => s + Number(r.depreciation_cost_at_log ?? 0), 0)
        const totalMileage = allIncome.reduce((s, r) => s + Number(r.mileage ?? 0), 0)

        const taxRate = activeSnapshot?.tax_rate ?? 25
        const netProfit = calcNetProfit(totalIncome, totalExpenses, taxRate)
        const taxSetAside = totalIncome * (taxRate / 100)
        const snapshotDaysOld = activeSnapshot ? daysSince(activeSnapshot.effective_date) : 0

        // Monthly bars for last 6 months — derived from already-fetched data
        const weeklyBars: WeeklyBar[] = monthRanges.map(({ label, start, end }) => ({
          label,
          income: allIncome
            .filter(r => r.date >= start && r.date <= end)
            .reduce((s, r) => s + Number(r.amount), 0),
          expenses: allExpenses
            .filter(r => r.date >= start && r.date <= end)
            .reduce((s, r) => s + Number(r.amount), 0),
        }))

        // Hustle stats — all-time
        const hustleStats: HustleStat[] = hustles.map(hustle => {
          const inc = allIncome
            .filter(r => r.hustle_id === hustle.id)
            .reduce((s, r) => s + Number(r.amount), 0)
          const exp = allExpenses
            .filter(r => r.hustle_id === hustle.id)
            .reduce((s, r) => s + Number(r.amount), 0)
          return {
            hustle,
            income: inc,
            expenses: exp,
            profit: calcNetProfit(inc, exp, taxRate),
          }
        })

        // Recent activity: merge and sort last 10
        const recentIncome: TransactionEntry[] = (recentIncomeRes.data ?? []).map(r => ({
          ...r,
          entry_type: 'income' as const,
        }))
        const recentExpenses: TransactionEntry[] = (recentExpensesRes.data ?? []).map(r => ({
          ...r,
          entry_type: 'expense' as const,
        }))
        const recentActivity = [...recentIncome, ...recentExpenses]
          .sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date)
            return b.created_at.localeCompare(a.created_at)
          })
          .slice(0, 10)

        setData({
          totalIncome,
          totalExpenses,
          netProfit,
          taxSetAside,
          totalDepreciation,
          totalMileage,
          activeSnapshot,
          snapshotDaysOld,
          weeklyBars,
          hustleStats,
          recentActivity,
          loading: false,
          error: null,
        })
      } catch (err) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load dashboard',
        }))
      }
    }

    load()
  }, [])

  return data
}
