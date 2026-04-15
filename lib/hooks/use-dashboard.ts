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

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function getWeeklyRanges(): Array<{ label: string; start: string; end: string }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get Monday of current week
  const dayOfWeek = today.getDay()
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const currentMon = new Date(today)
  currentMon.setDate(today.getDate() - daysToMon)

  const weeks = []
  for (let i = 3; i >= 0; i--) {
    const mon = new Date(currentMon)
    mon.setDate(currentMon.getDate() - i * 7)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)

    const label = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    weeks.push({
      label,
      start: mon.toISOString().split('T')[0],
      end: sun.toISOString().split('T')[0],
    })
  }
  return weeks
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
      const { start: monthStart, end: monthEnd } = getMonthRange()
      const weekRanges = getWeeklyRanges()
      const today = new Date().toISOString().split('T')[0]

      try {
        const [
          incomeRes,
          expensesRes,
          hustlesRes,
          snapshotRes,
          recentIncomeRes,
          recentExpensesRes,
          allDeprRes,
        ] = await Promise.all([
          // This month income
          supabase
            .from('income')
            .select('amount, hustle_id, fuel_cost_at_log, depreciation_cost_at_log, date')
            .gte('date', monthStart)
            .lte('date', monthEnd),

          // This month expenses
          supabase
            .from('expenses')
            .select('amount, hustle_id, date')
            .gte('date', monthStart)
            .lte('date', monthEnd),

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

          // All-time depreciation + mileage totals
          supabase
            .from('income')
            .select('depreciation_cost_at_log, mileage'),
        ])

        const monthIncome = (incomeRes.data ?? []) as Pick<IncomeEntry, 'amount' | 'hustle_id' | 'fuel_cost_at_log' | 'depreciation_cost_at_log' | 'date'>[]
        const monthExpenses = (expensesRes.data ?? []) as Pick<ExpenseEntry, 'amount' | 'hustle_id' | 'date'>[]
        const hustles: Hustle[] = hustlesRes.data ?? []
        const activeSnapshot: RateSnapshot | null = snapshotRes.data ?? null

        const allDeprRows = (allDeprRes.data ?? []) as { depreciation_cost_at_log: number | null; mileage: number | null }[]
        const totalDepreciation = allDeprRows.reduce((s, r) => s + Number(r.depreciation_cost_at_log ?? 0), 0)
        const totalMileage = allDeprRows.reduce((s, r) => s + Number(r.mileage ?? 0), 0)

        // Stat card calculations
        const totalIncome = monthIncome.reduce((s, r) => s + Number(r.amount), 0)
        const totalExpenses = monthExpenses.reduce((s, r) => s + Number(r.amount), 0)
        const taxRate = activeSnapshot?.tax_rate ?? 25
        const netProfit = calcNetProfit(totalIncome, totalExpenses, taxRate)
        const taxSetAside = totalIncome * (taxRate / 100)
        const snapshotDaysOld = activeSnapshot ? daysSince(activeSnapshot.effective_date) : 0

        // Weekly bars: need wider date query
        const earliestWeek = weekRanges[0].start
        const [weeklyIncomeRes, weeklyExpensesRes] = await Promise.all([
          supabase
            .from('income')
            .select('amount, date')
            .gte('date', earliestWeek)
            .lte('date', today),
          supabase
            .from('expenses')
            .select('amount, date')
            .gte('date', earliestWeek)
            .lte('date', today),
        ])

        const weeklyIncomeFull: { amount: number; date: string }[] = weeklyIncomeRes.data ?? []
        const weeklyExpensesFull: { amount: number; date: string }[] = weeklyExpensesRes.data ?? []

        const weeklyBars: WeeklyBar[] = weekRanges.map(({ label, start, end }) => ({
          label,
          income: weeklyIncomeFull
            .filter(r => r.date >= start && r.date <= end)
            .reduce((s, r) => s + Number(r.amount), 0),
          expenses: weeklyExpensesFull
            .filter(r => r.date >= start && r.date <= end)
            .reduce((s, r) => s + Number(r.amount), 0),
        }))

        // Hustle stats (this month)
        const hustleStats: HustleStat[] = hustles.map(hustle => {
          const inc = monthIncome
            .filter(r => r.hustle_id === hustle.id)
            .reduce((s, r) => s + Number(r.amount), 0)
          const exp = monthExpenses
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
