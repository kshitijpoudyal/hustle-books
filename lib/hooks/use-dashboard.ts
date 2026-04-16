'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcNetProfit } from '@/lib/utils/calculations'
import { daysSince } from '@/lib/utils/formatters'
import type { RateSnapshot, Hustle, IncomeEntry, ExpenseEntry, TransactionEntry } from '@/lib/types'

export type Period = 'week' | 'month' | 'year' | 'all'

export const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
}

export interface WeeklyBar {
  label: string
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
  taxableIncome: number
  totalExpenses: number
  netProfit: number
  taxSetAside: number
  totalDepreciation: number
  totalFuelCost: number
  totalMileage: number
  activeSnapshot: RateSnapshot | null
  snapshotDaysOld: number
  weeklyBars: WeeklyBar[]
  hustleStats: HustleStat[]
  recentActivity: TransactionEntry[]
  loading: boolean
  error: string | null
}

type RawIncome = Pick<IncomeEntry, 'amount' | 'hustle_id' | 'fuel_cost_at_log' | 'depreciation_cost_at_log' | 'mileage' | 'cogs' | 'is_taxable' | 'date'>
type RawExpense = Pick<ExpenseEntry, 'amount' | 'hustle_id' | 'date'>

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function getPeriodRange(period: Period): { start: string; end: string } {
  const today = new Date()
  const todayStr = fmt(today)
  if (period === 'week') {
    const day = today.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)
    return { start: fmt(monday), end: todayStr }
  }
  if (period === 'month') {
    return { start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), end: todayStr }
  }
  if (period === 'year') {
    return { start: fmt(new Date(today.getFullYear(), 0, 1)), end: todayStr }
  }
  return { start: '2000-01-01', end: todayStr }
}

function getChartBars(period: Period, allIncome: RawIncome[], allExpenses: RawExpense[]): WeeklyBar[] {
  const today = new Date()

  if (period === 'week') {
    const day = today.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateStr = fmt(d)
      const label = d.toLocaleString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase()
      return {
        label,
        income: allIncome.filter(r => r.date === dateStr).reduce((s, r) => s + Number(r.amount), 0),
        expenses: allExpenses.filter(r => r.date === dateStr).reduce((s, r) => s + Number(r.amount), 0),
      }
    })
  }

  if (period === 'month') {
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const bars: WeeklyBar[] = []
    let weekStart = new Date(firstDay)
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime())
      const startStr = fmt(weekStart)
      const endStr = fmt(weekEnd)
      bars.push({
        label: String(weekStart.getDate()),
        income: allIncome.filter(r => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + Number(r.amount), 0),
        expenses: allExpenses.filter(r => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + Number(r.amount), 0),
      })
      weekStart.setDate(weekStart.getDate() + 7)
    }
    return bars
  }

  // all: last 12 rolling months
  if (period === 'all') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const startStr = fmt(start)
      const endStr = fmt(end)
      return {
        label: start.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        income: allIncome.filter(r => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + Number(r.amount), 0),
        expenses: allExpenses.filter(r => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + Number(r.amount), 0),
      }
    })
  }

  // year: 12 monthly bars (Jan–Dec of current year)
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(today.getFullYear(), i, 1)
    const end = new Date(today.getFullYear(), i + 1, 0)
    const startStr = fmt(start)
    const endStr = fmt(end)
    return {
      label: start.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      income: allIncome.filter(r => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + Number(r.amount), 0),
      expenses: allExpenses.filter(r => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + Number(r.amount), 0),
    }
  })
}

interface RawState {
  allIncome: RawIncome[]
  allExpenses: RawExpense[]
  hustles: Hustle[]
  activeSnapshot: RateSnapshot | null
  recentActivity: TransactionEntry[]
  loading: boolean
  error: string | null
}

export function useDashboard(period: Period = 'month'): DashboardData {
  const [raw, setRaw] = useState<RawState>({
    allIncome: [],
    allExpenses: [],
    hustles: [],
    activeSnapshot: null,
    recentActivity: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      try {
        const [incomeRes, expensesRes, hustlesRes, snapshotRes, recentIncomeRes, recentExpensesRes] = await Promise.all([
          supabase.from('income').select('amount, hustle_id, fuel_cost_at_log, depreciation_cost_at_log, mileage, cogs, is_taxable, date'),
          supabase.from('expenses').select('amount, hustle_id, date'),
          supabase.from('hustles').select('*').eq('is_active', true).order('created_at', { ascending: true }),
          supabase.from('rate_snapshots').select('*').lte('effective_date', today).order('effective_date', { ascending: false }).limit(1).single(),
          supabase.from('income').select('*, hustle:hustles(id, name, color, icon)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(10),
          supabase.from('expenses').select('*, hustle:hustles(id, name, color, icon)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(10),
        ])

        const recentIncome: TransactionEntry[] = (recentIncomeRes.data ?? []).map(r => ({ ...r, entry_type: 'income' as const }))
        const recentExpenses: TransactionEntry[] = (recentExpensesRes.data ?? []).map(r => ({ ...r, entry_type: 'expense' as const }))
        const recentActivity = [...recentIncome, ...recentExpenses]
          .sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.created_at.localeCompare(a.created_at))
          .slice(0, 10)

        setRaw({
          allIncome: (incomeRes.data ?? []) as RawIncome[],
          allExpenses: (expensesRes.data ?? []) as RawExpense[],
          hustles: hustlesRes.data ?? [],
          activeSnapshot: snapshotRes.data ?? null,
          recentActivity,
          loading: false,
          error: null,
        })
      } catch (err) {
        setRaw(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load dashboard' }))
      }
    }
    load()
  }, [])

  const taxRate = raw.activeSnapshot?.tax_rate ?? 25
  const snapshotDaysOld = raw.activeSnapshot ? daysSince(raw.activeSnapshot.effective_date) : 0

  const { start, end } = useMemo(() => getPeriodRange(period), [period])

  const filteredIncome = useMemo(
    () => raw.allIncome.filter(r => r.date >= start && r.date <= end),
    [raw.allIncome, start, end]
  )
  const filteredExpenses = useMemo(
    () => raw.allExpenses.filter(r => r.date >= start && r.date <= end),
    [raw.allExpenses, start, end]
  )

  const totalIncome = useMemo(() => filteredIncome.reduce((s, r) => s + Number(r.amount), 0), [filteredIncome])
  const taxableIncome = useMemo(() => filteredIncome.filter(r => r.is_taxable).reduce((s, r) => s + Number(r.amount), 0), [filteredIncome])
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, r) => s + Number(r.amount), 0), [filteredExpenses])
  const totalCogs = useMemo(() => filteredIncome.reduce((s, r) => s + Number(r.cogs ?? 0), 0), [filteredIncome])
  const totalDepreciation = useMemo(() => filteredIncome.reduce((s, r) => s + Number(r.depreciation_cost_at_log ?? 0), 0), [filteredIncome])
  const totalFuelCost = useMemo(() => filteredIncome.reduce((s, r) => s + Number(r.fuel_cost_at_log ?? 0), 0), [filteredIncome])
  const totalMileage = useMemo(() => filteredIncome.reduce((s, r) => s + Number(r.mileage ?? 0), 0), [filteredIncome])
  const netProfit = useMemo(() => calcNetProfit(totalIncome, totalExpenses, taxRate, totalCogs, taxableIncome, totalDepreciation), [totalIncome, taxableIncome, totalExpenses, taxRate, totalCogs, totalDepreciation])
  const taxSetAside = taxableIncome * (taxRate / 100)

  const weeklyBars = useMemo(
    () => getChartBars(period, raw.allIncome, raw.allExpenses),
    [period, raw.allIncome, raw.allExpenses]
  )

  const hustleStats = useMemo((): HustleStat[] =>
    raw.hustles.map(hustle => {
      const hustleIncome = filteredIncome.filter(r => r.hustle_id === hustle.id)
      const inc = hustleIncome.reduce((s, r) => s + Number(r.amount), 0)
      const taxableInc = hustleIncome.filter(r => r.is_taxable).reduce((s, r) => s + Number(r.amount), 0)
      const exp = filteredExpenses.filter(r => r.hustle_id === hustle.id).reduce((s, r) => s + Number(r.amount), 0)
      const cogs = hustleIncome.reduce((s, r) => s + Number(r.cogs ?? 0), 0)
      const depr = hustleIncome.reduce((s, r) => s + Number(r.depreciation_cost_at_log ?? 0), 0)
      return { hustle, income: inc, expenses: exp, profit: calcNetProfit(inc, exp, taxRate, cogs, taxableInc, depr) }
    }),
    [raw.hustles, filteredIncome, filteredExpenses, taxRate]
  )

  return {
    totalIncome,
    taxableIncome,
    totalExpenses,
    netProfit,
    taxSetAside,
    totalDepreciation,
    totalFuelCost,
    totalMileage,
    activeSnapshot: raw.activeSnapshot,
    snapshotDaysOld,
    weeklyBars,
    hustleStats,
    recentActivity: raw.recentActivity,
    loading: raw.loading,
    error: raw.error,
  }
}
