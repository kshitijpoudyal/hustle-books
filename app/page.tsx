'use client'

import { useDashboard } from '@/lib/hooks/use-dashboard'
import HeroStats from '@/components/dashboard/hero-stats'
import StatCards from '@/components/dashboard/stat-cards'
import WeeklyChart from '@/components/dashboard/weekly-chart'
import HustleSummary from '@/components/dashboard/hustle-summary'
import RecentActivity from '@/components/dashboard/recent-activity'

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

  return (
    <div className="min-h-screen bg-[var(--background)] pb-28 lg:pb-8">
      {/* Mobile: stacked single-column layout */}
      <div className="lg:hidden">
        <HeroStats
          netProfit={netProfit}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          taxSetAside={taxSetAside}
          loading={loading}
        />

        <div className="px-4 space-y-6">
          <StatCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            netProfit={netProfit}
            taxSetAside={taxSetAside}
            loading={loading}
          />

          <WeeklyChart data={weeklyBars} loading={loading} />

          <HustleSummary hustleStats={hustleStats} loading={loading} />

          <RecentActivity entries={recentActivity} loading={loading} />
        </div>
      </div>

      {/* Desktop: bento grid */}
      <div className="hidden lg:block px-8 py-8">
        <div className="grid grid-cols-12 gap-6 max-w-6xl mx-auto">
          {/* Hero — full width */}
          <div className="col-span-12 rounded-[var(--radius-2xl)] bg-[var(--surface-container-lowest)]" style={{ boxShadow: 'var(--shadow-navy)' }}>
            <HeroStats
              netProfit={netProfit}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              taxSetAside={taxSetAside}
              loading={loading}
            />
          </div>

          {/* Stat cards — 8 cols */}
          <div className="col-span-8">
            <StatCards
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              netProfit={netProfit}
              taxSetAside={taxSetAside}
              loading={loading}
            />
          </div>

          {/* Weekly chart — 4 cols, offset down per design asymmetry */}
          <div className="col-span-4 mt-10 rounded-[var(--radius-2xl)] bg-[var(--surface-container-lowest)] p-4" style={{ boxShadow: 'var(--shadow-navy)' }}>
            <WeeklyChart data={weeklyBars} loading={loading} tall />
          </div>

          {/* Hustle summary — full width */}
          <div className="col-span-12">
            <HustleSummary hustleStats={hustleStats} loading={loading} />
          </div>

          {/* Recent activity — 8 cols */}
          <div className="col-span-8">
            <RecentActivity entries={recentActivity} loading={loading} desktop />
          </div>
        </div>
      </div>
    </div>
  )
}
