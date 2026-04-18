'use client'

import { formatCurrency } from '@/lib/utils/formatters'
import type { WeeklyBar } from '@/lib/hooks/use-dashboard'
import type { Period } from '@/lib/hooks/use-dashboard'
import AllRangeChart from './all-range-chart'

const CHART_SUBTITLES: Record<Period, string> = {
  today: 'Daily — last 7 days',
  week: 'Daily — this week',
  month: 'Weekly — this month',
  year: 'Monthly — this year',
  all: 'Monthly — last 12 months',
}

interface RevenueTrendCardProps {
  data: WeeklyBar[]
  loading: boolean
  variant?: 'mobile' | 'desktop'
  period: Period
}

export default function RevenueTrendCard({
  data,
  loading,
  variant = 'mobile',
  period,
}: RevenueTrendCardProps) {
  const totalVolume = data.reduce((sum, b) => sum + b.income, 0)

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    if (variant === 'desktop') {
      return <div className="squircle bg-[var(--surface-container-low)] h-[500px] animate-pulse" />
    }
    return (
      <div
        className="squircle h-52 animate-pulse"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
      />
    )
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  if (variant === 'desktop') {
    return (
      <div className="squircle bg-[var(--surface-container-low)] p-8 h-[500px] flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="font-headline text-xl font-bold text-[var(--primary)]">Revenue Trend</h2>
            <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              {CHART_SUBTITLES[period]}
            </p>
          </div>
          <div className="flex items-center gap-x-3">
            <span className="w-2 h-2 rounded-full bg-[var(--income)]" />
            <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              Income
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--expense)] ml-3" />
            <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              Expenses
            </span>
          </div>
        </div>

        <div className="flex-grow">
          <AllRangeChart data={data} loading={false} tall theme="light" />
        </div>
      </div>
    )
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  return (
    <section
      className="squircle p-6"
      style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
    >
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline font-bold text-lg text-white">Revenue Trend</h2>
          <p className="font-label text-[10px] uppercase tracking-wider text-white/70">
            {CHART_SUBTITLES[period]}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-white">{formatCurrency(totalVolume)}</div>
          <div className="font-label text-[10px] uppercase tracking-wider text-white/60">Total Volume</div>
        </div>
      </div>

      <AllRangeChart data={data} loading={false} theme="dark" />

      <div className="flex items-center gap-x-3 mt-4">
        <span className="w-2 h-2 rounded-full bg-white/80" />
        <span className="font-label text-[9px] uppercase tracking-widest text-white/60">Income</span>
        <span className="w-2 h-2 rounded-full ml-3" style={{ backgroundColor: 'rgba(134,244,241,0.7)' }} />
        <span className="font-label text-[9px] uppercase tracking-widest text-white/60">Expenses</span>
      </div>
    </section>
  )
}
