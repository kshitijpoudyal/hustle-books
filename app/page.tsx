'use client'

import { useState } from 'react'
import { useDashboard, PERIOD_LABELS } from '@/lib/hooks/use-dashboard'
import type { Period } from '@/lib/hooks/use-dashboard'
import StatCards from '@/components/dashboard/stat-cards'
import RecentActivity from '@/components/dashboard/recent-activity'
import RevenueTrendCard from '@/components/dashboard/revenue-trend-card'
import Link from 'next/link'
import { TrendingUp, Receipt } from 'lucide-react'

const PERIOD_SHORT: Record<Period, string> = { today: 'Today', week: 'Week', month: 'Month', year: 'Year', all: 'All Time' }

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month')

  const {
    totalIncome,
    totalExpenses,
    totalCogs,
    netProfit,
    taxSetAside,
    totalMileage,
    totalDepreciation,
    weeklyBars,
    hustleStats,
    recentActivity,
    loading,
  } = useDashboard(period)

  const topHustle = hustleStats.length > 0
    ? hustleStats.reduce((best, h) => h.income > best.income ? h : best)
    : null
  const topPct = topHustle && totalIncome > 0
    ? Math.round((topHustle.income / totalIncome) * 100)
    : 0

  const periodLabel = PERIOD_LABELS[period]

  return (
    <div className="min-h-screen bg-[var(--background)]">

      {/* ── Mobile ──────────────────────────────────────────────────────────── */}
      <div className="lg:hidden pb-32">

        <div className="px-6 space-y-8 mt-4">

          {/* Period selector */}
          <div className="flex gap-1 p-1 bg-[var(--surface-container-low)] rounded-full">
            {(Object.keys(PERIOD_SHORT) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2 rounded-full font-label text-[10px] uppercase tracking-widest transition-colors ${
                  period === p
                    ? 'bg-[var(--primary)] text-white font-semibold'
                    : 'text-[var(--on-surface-variant)] opacity-60'
                }`}
              >
                {PERIOD_SHORT[p]}
              </button>
            ))}
          </div>

          {/* Stat Grid */}
          <StatCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            totalCogs={totalCogs}
            netProfit={netProfit}
            taxSetAside={taxSetAside}
            totalMileage={totalMileage}
            totalDepreciation={totalDepreciation}
            loading={loading}
            periodLabel={periodLabel}
          />

          {/* Revenue Trend */}
          <RevenueTrendCard data={weeklyBars} loading={loading} variant="mobile" period={period} />

          {/* Recent Observations */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-headline font-extrabold text-xl text-[var(--on-surface)]">
                Recent Observations
              </h2>
              <Link
                href="/history"
                className="font-label text-[10px] uppercase tracking-widest text-[var(--secondary)] font-bold"
              >
                View Archive
              </Link>
            </div>
            <RecentActivity entries={recentActivity} loading={loading} />
          </section>
        </div>
      </div>

      {/* ── Desktop ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block px-8 pb-12">

        {/* Header row: title + period selector */}
        <div className="flex items-end justify-between pt-10 mb-8">
          <div>
            <h1 className="font-headline font-black text-5xl text-[var(--primary)] tracking-tight">
              Dashboard
            </h1>
          </div>
          <div className="flex gap-1 p-1 bg-[var(--surface-container-low)] rounded-full">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 rounded-full font-label text-[10px] uppercase tracking-widest transition-colors ${
                  period === p
                    ? 'bg-[var(--primary)] text-white font-semibold'
                    : 'text-[var(--on-surface-variant)] opacity-60 hover:opacity-100'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* 5× Stat Cards */}
        <section className="mb-8">
          <StatCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            totalCogs={totalCogs}
            netProfit={netProfit}
            taxSetAside={taxSetAside}
            totalMileage={totalMileage}
            totalDepreciation={totalDepreciation}
            loading={loading}
            periodLabel={periodLabel}
          />
        </section>

        {/* Bento: 8-col chart + 4-col observations */}
        <section className="grid grid-cols-12 gap-8 items-start mb-8">
          <div className="col-span-8">
            <RevenueTrendCard data={weeklyBars} loading={loading} variant="desktop" period={period} />
          </div>
          <div
            className="col-span-4 squircle p-8 flex flex-col"
            style={{ backgroundColor: 'var(--surface-container-highest)' }}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-headline text-xl font-bold text-[var(--primary)]">
                Recent Observations
              </h2>
              <Link
                href="/history"
                className="font-label text-[10px] uppercase tracking-widest font-bold text-[var(--secondary)] hover:opacity-70 transition-opacity"
              >
                View Archive
              </Link>
            </div>
            <div className="flex flex-col gap-y-4 flex-1">
              <RecentActivity entries={recentActivity} loading={loading} desktop />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-12 gap-8">
          {topHustle ? (
            <div className="col-span-7 relative">
              <div
                className="absolute inset-0 rounded-[32px] -rotate-1 opacity-50"
                style={{ background: 'linear-gradient(to top right, var(--surface-container-highest), var(--surface))' }}
              />
              <div
                className="relative squircle p-10 h-64 flex flex-col justify-between"
                style={{ backgroundColor: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-2xl font-black text-[var(--primary)] tracking-tight">
                      Hustle Intelligence
                    </h4>
                    <span className="font-label text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]">
                      {periodLabel}
                    </span>
                  </div>
                  <p className="text-[var(--on-surface-variant)] leading-relaxed">
                    <span className="text-[var(--secondary)] font-bold">{topHustle.hustle.name}</span>{' '}
                    is your top earner {period === 'all' ? 'of all time' : periodLabel.toLowerCase()}, generating{' '}
                    <span className="font-bold text-[var(--on-surface)]">
                      {topHustle.income.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                    </span>{' '}
                    — {topPct}% of total revenue across{' '}
                    {hustleStats.length} active hustle{hustleStats.length !== 1 ? 's' : ''}.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Link
                    href="/history"
                    className="bg-[var(--surface-container-high)] px-6 py-3 rounded-full text-sm font-bold text-[var(--primary)] hover:opacity-80 transition-opacity"
                  >
                    View History
                  </Link>
                  <Link
                    href="/log"
                    className="text-[var(--secondary)] font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Log Entry →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="col-span-5 squircle p-8 flex flex-col justify-between h-64 overflow-hidden relative"
              style={{ backgroundColor: 'var(--surface-container-low)' }}
            >
              <div className="flex flex-col justify-center items-start h-full gap-3">
                <div className="p-3 rounded-2xl bg-[var(--surface-container-highest)]">
                  <TrendingUp className="w-5 h-5 text-[var(--on-surface-variant)]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-headline text-lg font-bold text-[var(--primary)]">No income logged yet</h2>
                  <p className="font-body text-sm text-[var(--on-surface-variant)] mt-1 leading-relaxed">
                    Start tracking your hustles to see which one leads your revenue.
                  </p>
                </div>
                <Link
                  href="/log"
                  className="font-label text-[10px] uppercase tracking-widest font-bold text-[var(--secondary)] hover:opacity-70 transition-opacity"
                >
                  Log your first entry →
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
