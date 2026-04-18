'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Dot,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'
import type { WeeklyBar } from '@/lib/hooks/use-dashboard'

interface AllRangeChartProps {
  data: WeeklyBar[]
  loading: boolean
  tall?: boolean
  theme?: 'light' | 'dark'
}

const LIGHT = {
  income: '#2ca6a4',
  expense: '#c0614a',
  grid: 'rgba(2,36,72,0.06)',
  axisText: 'var(--on-surface-variant)',
  tooltipBg: 'var(--surface-container-low)',
  tooltipShadow: '0 8px 24px rgba(2,36,72,0.12)',
  tooltipLabel: 'var(--on-surface-variant)',
  incomeGradStart: 'rgba(44,166,164,0.18)',
  incomeGradEnd: 'rgba(44,166,164,0)',
  expenseGradStart: 'rgba(192,97,74,0.14)',
  expenseGradEnd: 'rgba(192,97,74,0)',
}

const DARK = {
  income: 'rgba(255,255,255,0.90)',
  expense: 'rgba(134,244,241,0.70)',
  grid: 'rgba(255,255,255,0.08)',
  axisText: 'rgba(255,255,255,0.50)',
  tooltipBg: 'rgba(2,36,72,0.88)',
  tooltipShadow: '0 8px 24px rgba(0,0,0,0.30)',
  tooltipLabel: 'rgba(255,255,255,0.55)',
  incomeGradStart: 'rgba(255,255,255,0.14)',
  incomeGradEnd: 'rgba(255,255,255,0)',
  expenseGradStart: 'rgba(134,244,241,0.12)',
  expenseGradEnd: 'rgba(134,244,241,0)',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, colors }: any) {
  if (!active || !payload?.length) return null
  const income = payload.find((e: { name: string }) => e.name === 'income')
  const expense = payload.find((e: { name: string }) => e.name === 'expenses')
  return (
    <div
      className="px-4 py-3 rounded-2xl"
      style={{ background: colors.tooltipBg, boxShadow: colors.tooltipShadow, backdropFilter: 'blur(10px)' }}
    >
      <p className="font-label text-[9px] uppercase tracking-widest mb-2" style={{ color: colors.tooltipLabel }}>
        {label}
      </p>
      {income && (
        <p className="font-label text-xs font-semibold tabular-nums" style={{ color: colors.income }}>
          +{formatCurrency(income.value ?? 0, 'USD', true)}
        </p>
      )}
      {expense && expense.value > 0 && (
        <p className="font-label text-xs font-semibold tabular-nums mt-0.5" style={{ color: colors.expense }}>
          −{formatCurrency(expense.value ?? 0, 'USD', true)}
        </p>
      )}
    </div>
  )
}

// Animated dot that only renders on the active (hovered) point
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveDot({ cx, cy, fill }: any) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={fill} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={4} fill={fill} />
      <circle cx={cx} cy={cy} r={2} fill="#fff" />
    </g>
  )
}

export default function AllRangeChart({ data, loading, tall, theme = 'light' }: AllRangeChartProps) {
  const colors = theme === 'dark' ? DARK : LIGHT
  const isEmpty = !loading && data.every(b => b.income === 0 && b.expenses === 0)
  const chartHeight = tall ? '100%' : 168
  const incomeId = `incomeGrad-${theme}`
  const expenseId = `expenseGrad-${theme}`

  if (loading) {
    const skeletonBg = theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'var(--surface-container-high)'
    return (
      <div className="flex items-end gap-2 animate-pulse px-1" style={{ height: chartHeight }}>
        {[55, 72, 48, 83, 60, 75, 40].map((h, i) => (
          <div key={i} className="flex-1 rounded-full" style={{ height: h, backgroundColor: skeletonBg }} />
        ))}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: chartHeight }}>
        <p
          className="font-label text-[10px] uppercase tracking-widest opacity-40"
          style={{ color: theme === 'dark' ? '#fff' : 'var(--on-surface-variant)' }}
        >
          No entries yet
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={incomeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.incomeGradStart} />
            <stop offset="100%" stopColor={colors.incomeGradEnd} />
          </linearGradient>
          <linearGradient id={expenseId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.expenseGradStart} />
            <stop offset="100%" stopColor={colors.expenseGradEnd} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="4 4" />

        <XAxis
          dataKey="label"
          tick={{ fontFamily: 'Work Sans, ui-sans-serif, sans-serif', fontSize: 9, fill: colors.axisText }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />

        <Tooltip
          content={<CustomTooltip colors={colors} />}
          cursor={{ stroke: colors.grid, strokeWidth: 1.5, strokeDasharray: '4 4' }}
        />

        {/* Income line */}
        <Line
          type="monotone"
          dataKey="income"
          name="income"
          stroke={colors.income}
          strokeWidth={2.5}
          dot={<Dot r={0} />}
          activeDot={<ActiveDot fill={colors.income} />}
          animationDuration={900}
          animationEasing="ease-out"
        />

        {/* Expense line */}
        <Line
          type="monotone"
          dataKey="expenses"
          name="expenses"
          stroke={colors.expense}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={<Dot r={0} />}
          activeDot={<ActiveDot fill={colors.expense} />}
          animationDuration={1100}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
