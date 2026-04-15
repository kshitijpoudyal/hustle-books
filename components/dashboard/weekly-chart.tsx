'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'
import type { WeeklyBar } from '@/lib/hooks/use-dashboard'

interface WeeklyChartProps {
  data: WeeklyBar[]
  loading: boolean
  /** When true, fills parent height (for desktop bento panel) */
  tall?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="px-4 py-3 squircle"
      style={{
        background: 'var(--surface-container-lowest)',
        boxShadow: '0 12px 32px rgba(2, 36, 72, 0.08)',
      }}
    >
      <p className="font-label text-[9px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] mb-2">
        w/o {label}
      </p>
      {payload.map((e: { name: string; value: number; color: string }) => (
        <p key={e.name} className="font-label text-xs font-semibold tabular-nums" style={{ color: e.color }}>
          {e.name === 'income' ? '+' : '−'}{formatCurrency(e.value ?? 0, 'USD', true)}
        </p>
      ))}
    </div>
  )
}

export default function WeeklyChart({ data, loading, tall }: WeeklyChartProps) {
  const isEmpty = !loading && data.every(b => b.income === 0 && b.expenses === 0)
  const chartHeight = tall ? '100%' : 148

  if (loading) {
    return (
      <div className="flex items-end gap-4 animate-pulse" style={{ height: tall ? '100%' : 148 }}>
        {[55, 80, 65, 40].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1.5">
            <div className="w-full rounded-[8px] bg-[var(--surface-container-high)]" style={{ height: h }} />
            <div className="w-full rounded-[8px] bg-[var(--surface-container)]" style={{ height: Math.round(h * 0.35) }} />
          </div>
        ))}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2" style={{ height: tall ? '100%' : 148 }}>
        <p className="font-label text-[10px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)] opacity-50">
          No entries yet
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} barGap={4} barCategoryGap="30%" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontFamily: 'Work Sans, ui-sans-serif, sans-serif', fontSize: 10, fill: 'var(--on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(2, 36, 72, 0.04)', radius: 8 }}
        />
        <Bar
          dataKey="income"
          name="income"
          fill="var(--income)"
          radius={[6, 6, 4, 4]}
          maxBarSize={32}
          fillOpacity={0.9}
        />
        <Bar
          dataKey="expenses"
          name="expenses"
          fill="var(--expense)"
          radius={[6, 6, 4, 4]}
          maxBarSize={32}
          fillOpacity={0.9}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
