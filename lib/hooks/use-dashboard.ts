'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchDashboardRaw } from '@/lib/data/dashboard'
import { calcNetProfit, calcTaxSetAside } from '@/lib/utils/calculations'
import { daysSince } from '@/lib/utils/formatters'
import { getCached, setCached } from '@/lib/utils/query-cache'
import { useUserSettings } from '@/lib/context/user-settings-context'
import type { RateSnapshot, Hustle, TransactionEntry } from '@/lib/types'
import type { DashboardRaw } from '@/lib/data/dashboard'

export type Period = 'today' | 'week' | 'month' | 'year' | 'all'

export const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
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
  totalCogs: number
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

type RawIncome = DashboardRaw['allIncome'][number]
type RawExpense = DashboardRaw['allExpenses'][number]

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function getPeriodRange(period: Period): { start: string; end: string } {
  const today = new Date()
  const todayStr = fmt(today)
  if (period === 'today') {
    return { start: todayStr, end: todayStr }
  }
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

  if (period === 'today') {
    // Last 7 days — today labeled "TODAY" for context
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - 6 + i)
      const dateStr = fmt(d)
      const isToday = i === 6
      return {
        label: isToday ? 'TODAY' : d.toLocaleString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase(),
        income: allIncome.filter(r => r.date === dateStr).reduce((s, r) => s + Number(r.amount), 0),
        expenses: allExpenses.filter(r => r.date === dateStr).reduce((s, r) => s + Number(r.amount), 0),
      }
    })
  }

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

export function useDashboard(period: Period = 'month', customRange?: { start: string; end: string }): DashboardData {
  const { includeDeprInProfit, includeTaxInProfit } = useUserSettings()

  const CACHE_KEY = 'dashboard:raw'
  const seed = getCached<RawState>(CACHE_KEY)

  const [raw, setRaw] = useState<RawState>(seed ?? {
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
      try {
        const data = await fetchDashboardRaw()
        const next: RawState = { ...data, loading: false, error: null }
        setCached(CACHE_KEY, next)
        setRaw(next)
      } catch (err) {
        setRaw(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load dashboard' }))
      }
    }
    load()
  }, [])

  const taxRate = raw.activeSnapshot?.tax_rate ?? 25
  const snapshotDaysOld = raw.activeSnapshot ? daysSince(raw.activeSnapshot.effective_date) : 0

  const { start, end } = useMemo(
    () => customRange ?? getPeriodRange(period),
    [period, customRange?.start, customRange?.end] // eslint-disable-line react-hooks/exhaustive-deps
  )

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
  const netProfit = useMemo(() => calcNetProfit(totalIncome, totalExpenses, includeTaxInProfit ? taxRate : 0, totalCogs, taxableIncome, includeDeprInProfit ? totalDepreciation : 0), [totalIncome, taxableIncome, totalExpenses, taxRate, totalCogs, totalDepreciation, includeDeprInProfit, includeTaxInProfit])
  const taxSetAside = calcTaxSetAside(taxableIncome, taxRate)

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
      return { hustle, income: inc, expenses: exp, profit: calcNetProfit(inc, exp, includeTaxInProfit ? taxRate : 0, cogs, taxableInc, includeDeprInProfit ? depr : 0) }
    }),
    [raw.hustles, filteredIncome, filteredExpenses, taxRate, includeDeprInProfit, includeTaxInProfit]
  )

  return {
    totalIncome,
    taxableIncome,
    totalExpenses,
    totalCogs,
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
