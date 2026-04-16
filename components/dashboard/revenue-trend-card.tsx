'use client'

import { formatCurrency } from '@/lib/utils/formatters'
import type { WeeklyBar } from '@/lib/hooks/use-dashboard'
import type { Period } from '@/lib/hooks/use-dashboard'

const CHART_SUBTITLES: Record<Period, string> = {
  week: 'Daily revenue — this week',
  month: 'Weekly revenue — this month',
  year: 'Monthly revenue — this year',
  all: 'Monthly revenue — last 12 months',
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
  const maxIncome = Math.max(...data.map(b => b.income), 1)

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
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="font-headline text-xl font-bold text-[var(--primary)]">Revenue Trend</h2>
            <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              {CHART_SUBTITLES[period]}
            </p>
          </div>
          <div className="flex items-center gap-x-2">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
            <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              Revenue
            </span>
            <span className="w-3 h-3 rounded-full bg-[var(--secondary-container)] ml-4" />
            <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              Expenses
            </span>
          </div>
        </div>

        <div className="flex-grow flex items-end gap-x-4 px-4 pb-8 relative">
          {data.map((bar, i) => {
            const pct = maxIncome > 0 ? Math.round((bar.income / maxIncome) * 100) : 10
            const isHighest = bar.income === maxIncome && bar.income > 0
            return (
              <div
                key={i}
                className="flex-1 squircle hover:opacity-80 transition-all cursor-pointer"
                style={{
                  height: `${Math.max(pct, 10)}%`,
                  backgroundColor: isHighest
                    ? 'var(--primary)'
                    : 'var(--surface-container-highest)',
                }}
              />
            )
          })}
          <div className="absolute inset-x-0 bottom-8 h-[1px] bg-[var(--outline-variant)]/10" />
          <div className="absolute inset-x-0 top-1/4 h-[1px] bg-[var(--outline-variant)]/10" />
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[var(--outline-variant)]/10" />
          <div className="absolute inset-x-0 top-3/4 h-[1px] bg-[var(--outline-variant)]/10" />
        </div>

        <div className="flex justify-between px-4 mt-4 font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
          {data.map((bar, i) => (
            <span key={i}>{bar.label}</span>
          ))}
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
      <div className="flex justify-between items-end mb-8">
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

      <div className="flex items-end justify-between gap-2 h-32">
        {data.map((bar, i) => {
          const pct = maxIncome > 0 ? Math.round((bar.income / maxIncome) * 100) : 20
          return (
            <div
              key={i}
              className="w-full rounded-t-full relative"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', height: '100%' }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t-full"
                style={{
                  height: `${Math.max(pct, 10)}%`,
                  backgroundColor: 'var(--secondary)',
                }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-4">
        {data.map((bar, i) => (
          <span key={i} className="font-label text-[10px] text-white/60">
            {bar.label}
          </span>
        ))}
      </div>
    </section>
  )
}
