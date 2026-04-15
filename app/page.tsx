'use client'

import { useDashboard } from '@/lib/hooks/use-dashboard'
import StatCards from '@/components/dashboard/stat-cards'
import RecentActivity from '@/components/dashboard/recent-activity'
import RevenueTrendCard from '@/components/dashboard/revenue-trend-card'
import Link from 'next/link'
import { BookOpen, User, Zap, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const {
    totalIncome,
    totalExpenses,
    netProfit,
    taxSetAside,
    weeklyBars,
    hustleStats,
    recentActivity,
    loading,
  } = useDashboard()

  const topHustle = hustleStats.length > 0
    ? hustleStats.reduce((best, h) => h.income > best.income ? h : best)
    : null
  const topPct = topHustle && totalIncome > 0
    ? Math.round((topHustle.income / totalIncome) * 100)
    : 0

  return (
    <div className="min-h-screen bg-[var(--background)]">

      {/* ── Mobile ──────────────────────────────────────────────────────────── */}
      <div className="lg:hidden pb-32">
        {/* Top AppBar */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-6 py-4 bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[var(--primary)]" strokeWidth={2} />
            <h1 className="font-headline font-black text-xl tracking-tight text-[var(--primary)]">
              HustleBooks
            </h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[var(--surface-container-high)] flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
        </header>

        <div className="px-6 space-y-8 mt-4">
          {/* 2×2 Stat Grid */}
          <StatCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            netProfit={netProfit}
            taxSetAside={taxSetAside}
            loading={loading}
          />

          {/* Revenue Trend */}
          <RevenueTrendCard data={weeklyBars} loading={loading} variant="mobile" />

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

        {/* 4× Stat Cards */}
        <section className="mb-8">
          <StatCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            netProfit={netProfit}
            taxSetAside={taxSetAside}
            loading={loading}
          />
        </section>

        {/* Bento: 8-col chart + 4-col observations */}
        <section className="grid grid-cols-12 gap-8 items-start mb-8">
          <div className="col-span-8">
            <RevenueTrendCard data={weeklyBars} loading={loading} variant="desktop" />
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

        <section className="grid grid-cols-2 gap-8">
          {/* Top Performing Hustle */}
          <div
            className="squircle p-8 flex flex-col justify-between h-64 overflow-hidden relative"
            style={{ backgroundColor: 'var(--surface-container-low)' }}
          >
            {topHustle ? (
              <>
                {/* Accent bar using hustle colour */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-[2rem]"
                  style={{ backgroundColor: topHustle.hustle.color ?? 'var(--secondary)' }}
                />

                <div>
                  <div className="flex items-center gap-x-2 mb-4">
                    <div
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: 'var(--surface-container-highest)' }}
                    >
                      <TrendingUp className="w-4 h-4 text-[var(--primary)]" strokeWidth={1.5} />
                    </div>
                    <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                      Top Earner All Time
                    </span>
                  </div>

                  <h2 className="font-headline text-2xl font-extrabold text-[var(--primary)] leading-tight truncate">
                    {topHustle.hustle.name}
                  </h2>
                  <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mt-1">
                    {hustleStats.length} active hustle{hustleStats.length !== 1 ? 's' : ''} tracked this month
                  </p>
                </div>

                <div>
                  {/* Progress bar */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-headline text-xl font-black text-[var(--primary)]">
                      {topPct}%
                    </span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                      of total revenue
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-container-highest)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${topPct}%`,
                        backgroundColor: topHustle.hustle.color ?? 'var(--secondary)',
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
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
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
