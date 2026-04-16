'use client'

import { useState } from 'react'
import { useDashboard, PERIOD_LABELS } from '@/lib/hooks/use-dashboard'
import type { Period } from '@/lib/hooks/use-dashboard'
import { formatCurrency, formatMileage, formatIrsRate, formatTaxRate } from '@/lib/utils/formatters'
import StatCard from '@/components/shared/stat-card'

const PERIOD_SHORT: Record<Period, string> = { week: 'Week', month: 'Month', year: 'Year', all: 'All Time' }

export default function TaxPage() {
  const [period, setPeriod] = useState<Period>('year')

  const {
    totalIncome,
    taxableIncome,
    taxSetAside,
    totalMileage,
    totalDepreciation,
    totalFuelCost,
    hustleStats,
    activeSnapshot,
    loading,
  } = useDashboard(period)

  const nonTaxableIncome = totalIncome - taxableIncome
  const irsDeduction = totalMileage * (activeSnapshot?.irs_rate ?? 0)
  const periodLabel = PERIOD_LABELS[period]

  return (
    <div className="min-h-screen bg-[var(--surface)]">

      {/* ══════════════════ MOBILE ══════════════════ */}
      <div className="lg:hidden pb-32">

        <main className="px-6 mt-2 space-y-8">

          {/* Page title + period selector */}
          <div className="space-y-4">
            <div>
              <h2 className="font-headline font-black text-3xl text-[var(--primary)] tracking-tight">Tax Summary</h2>
              <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mt-1">
                {periodLabel}
              </p>
            </div>
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
          </div>

          {/* Key numbers 2×2 grid */}
          <section className="grid grid-cols-2 gap-4">
            <StatCard
              label="Estimated Tax"
              value={formatCurrency(taxSetAside)}
              sub={activeSnapshot ? `${formatTaxRate(activeSnapshot.tax_rate)} SE rate` : undefined}
              accent
              height="h-36"
              loading={loading}
            />
            <StatCard
              label="Taxable Income"
              value={formatCurrency(taxableIncome)}
              sub="Is taxable entries"
              height="h-36"
              loading={loading}
            />
            <StatCard
              label="IRS Mileage Deduction"
              value={formatCurrency(irsDeduction)}
              sub={activeSnapshot ? `${formatIrsRate(activeSnapshot.irs_rate)} × ${formatMileage(totalMileage)}` : undefined}
              height="h-36"
              loading={loading}
            />
            <StatCard
              label="Total Miles"
              value={formatMileage(totalMileage)}
              sub="Business miles driven"
              height="h-36"
              loading={loading}
            />
          </section>

          {/* Income breakdown */}
          <section className="bg-[var(--surface-container-low)] squircle p-6 space-y-4">
            <h3 className="font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)]">
              Income Breakdown
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-8 rounded-full bg-[var(--surface-container-high)] animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-headline font-semibold text-sm text-[var(--primary)]">Taxable Income</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">Subject to self-employment tax</p>
                  </div>
                  <span className="font-headline font-black text-base text-[var(--primary)]">{formatCurrency(taxableIncome)}</span>
                </div>
                <div className="h-px bg-[var(--surface-container-high)]" />
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-headline font-semibold text-sm text-[var(--on-surface-variant)]">Non-Taxable Income</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">Excluded from SE tax</p>
                  </div>
                  <span className="font-headline font-black text-base text-[var(--on-surface-variant)]">{formatCurrency(nonTaxableIncome)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Deduction reference */}
          <section className="bg-[var(--surface-container-low)] squircle p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)]">
                Cost Reference
              </h3>
              <span
                className="px-2 py-0.5 rounded-full font-label text-[9px] font-bold"
                style={{ backgroundColor: 'rgba(0,106,104,0.1)', color: 'var(--secondary)' }}
              >
                IRS Reference
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-8 rounded-full bg-[var(--surface-container-high)] animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-headline font-semibold text-sm text-[var(--primary)]">Vehicle Depreciation</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">Deducted from net profit</p>
                  </div>
                  <span className="font-headline font-black text-base" style={{ color: 'var(--expense)' }}>
                    −{formatCurrency(totalDepreciation)}
                  </span>
                </div>
                <div className="h-px bg-[var(--surface-container-high)]" />
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-headline font-semibold text-sm text-[var(--on-surface-variant)]">Est. Fuel Cost</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">IRS reference — log as expense for profit</p>
                  </div>
                  <span className="font-headline font-black text-base text-[var(--on-surface-variant)]">{formatCurrency(totalFuelCost)}</span>
                </div>
                <div className="h-px bg-[var(--surface-container-high)]" />
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-headline font-semibold text-sm text-[var(--on-surface-variant)]">IRS Standard Deduction</p>
                    <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                      {formatMileage(totalMileage)} × {activeSnapshot ? formatIrsRate(activeSnapshot.irs_rate) : '—'}
                    </p>
                  </div>
                  <span className="font-headline font-black text-base text-[var(--on-surface-variant)]">{formatCurrency(irsDeduction)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Per-hustle breakdown */}
          {!loading && hustleStats.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)]">
                Per-Hustle Breakdown
              </h3>
              {hustleStats.map(({ hustle, income, profit }) => {
                const hustleTaxable = income // simplified — we don't have per-hustle taxable split here
                return (
                  <div
                    key={hustle.id}
                    className="bg-[var(--surface-container-low)] squircle p-5 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hustle.color }}
                      />
                      <div className="min-w-0">
                        <p className="font-headline font-bold text-sm text-[var(--primary)] truncate">{hustle.name}</p>
                        <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                          {formatCurrency(income)} income
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p
                        className="font-headline font-black text-sm"
                        style={{ color: profit >= 0 ? 'var(--secondary)' : 'var(--expense)' }}
                      >
                        {formatCurrency(profit)}
                      </p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                        net profit
                      </p>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

        </main>
      </div>

      {/* ══════════════════ DESKTOP ══════════════════ */}
      <div className="hidden lg:block">
        <main className="pt-8 pb-16 px-8">

          {/* Header row */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-headline font-black text-4xl text-[var(--primary)] tracking-tight">Tax Summary</h2>
              <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mt-2">
                {periodLabel} · {activeSnapshot ? `${formatTaxRate(activeSnapshot.tax_rate)} SE rate · ${formatIrsRate(activeSnapshot.irs_rate)} IRS rate` : 'No rate snapshot'}
              </p>
            </div>
            <div className="flex gap-1 p-1 bg-[var(--surface-container-low)] rounded-full">
              {(Object.keys(PERIOD_SHORT) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-5 py-2 rounded-full font-label text-[10px] uppercase tracking-widest transition-colors ${
                    period === p
                      ? 'bg-[var(--primary)] text-white font-semibold'
                      : 'text-[var(--on-surface-variant)] opacity-60 hover:opacity-100'
                  }`}
                >
                  {PERIOD_SHORT[p]}
                </button>
              ))}
            </div>
          </div>

          {/* 4-col stat cards */}
          <section className="grid grid-cols-4 gap-6 mb-10">
            <StatCard
              label="Estimated Tax"
              value={formatCurrency(taxSetAside)}
              sub={activeSnapshot ? `${formatTaxRate(activeSnapshot.tax_rate)} of taxable income` : undefined}
              accent
              height="h-36"
              loading={loading}
            />
            <StatCard
              label="Taxable Income"
              value={formatCurrency(taxableIncome)}
              sub={`${formatCurrency(nonTaxableIncome)} non-taxable`}
              height="h-36"
              loading={loading}
            />
            <StatCard
              label="IRS Mileage Deduction"
              value={formatCurrency(irsDeduction)}
              sub={activeSnapshot ? `${formatMileage(totalMileage)} × ${formatIrsRate(activeSnapshot.irs_rate)}` : undefined}
              height="h-36"
              loading={loading}
            />
            <StatCard
              label="Total Miles"
              value={formatMileage(totalMileage)}
              sub="Business miles"
              height="h-36"
              loading={loading}
            />
          </section>

          {/* Two-col layout: Income breakdown + Cost reference */}
          <div className="grid grid-cols-2 gap-6 mb-10">

            {/* Income breakdown */}
            <section className="bg-[var(--surface-container-low)] squircle p-8 space-y-6">
              <h3 className="font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)]">Income Breakdown</h3>
              {loading ? (
                <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-10 rounded-full bg-[var(--surface-container-high)] animate-pulse" />)}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-headline font-semibold text-base text-[var(--primary)]">Taxable Income</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mt-0.5">Subject to self-employment tax</p>
                    </div>
                    <span className="font-headline font-black text-xl text-[var(--primary)]">{formatCurrency(taxableIncome)}</span>
                  </div>
                  <div className="h-px bg-[var(--surface-container-high)]" />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-headline font-semibold text-base text-[var(--on-surface-variant)]">Non-Taxable Income</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mt-0.5">Excluded from SE tax</p>
                    </div>
                    <span className="font-headline font-black text-xl text-[var(--on-surface-variant)]">{formatCurrency(nonTaxableIncome)}</span>
                  </div>
                  <div className="h-px bg-[var(--surface-container-high)]" />
                  <div className="flex justify-between items-center">
                    <p className="font-headline font-semibold text-base text-[var(--on-surface-variant)]">Total Income</p>
                    <span className="font-headline font-black text-xl text-[var(--primary)]">{formatCurrency(taxableIncome + nonTaxableIncome)}</span>
                  </div>
                </div>
              )}
            </section>

            {/* Cost reference */}
            <section className="bg-[var(--surface-container-low)] squircle p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)]">Cost Reference</h3>
                <span
                  className="px-2 py-0.5 rounded-full font-label text-[9px] font-bold"
                  style={{ backgroundColor: 'rgba(0,106,104,0.1)', color: 'var(--secondary)' }}
                >
                  IRS Reference
                </span>
              </div>
              {loading ? (
                <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-10 rounded-full bg-[var(--surface-container-high)] animate-pulse" />)}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-headline font-semibold text-base text-[var(--primary)]">Vehicle Depreciation</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mt-0.5">Deducted from net profit</p>
                    </div>
                    <span className="font-headline font-black text-xl" style={{ color: 'var(--expense)' }}>−{formatCurrency(totalDepreciation)}</span>
                  </div>
                  <div className="h-px bg-[var(--surface-container-high)]" />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-headline font-semibold text-base text-[var(--on-surface-variant)]">Est. Fuel Cost</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mt-0.5">IRS reference — log as expense for profit</p>
                    </div>
                    <span className="font-headline font-black text-xl text-[var(--on-surface-variant)]">{formatCurrency(totalFuelCost)}</span>
                  </div>
                  <div className="h-px bg-[var(--surface-container-high)]" />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-headline font-semibold text-base text-[var(--on-surface-variant)]">IRS Standard Deduction</p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mt-0.5">
                        {formatMileage(totalMileage)} × {activeSnapshot ? formatIrsRate(activeSnapshot.irs_rate) : '—'}
                      </p>
                    </div>
                    <span className="font-headline font-black text-xl text-[var(--on-surface-variant)]">{formatCurrency(irsDeduction)}</span>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Per-hustle breakdown */}
          {!loading && hustleStats.length > 0 && (
            <section className="bg-[var(--surface-container-low)] squircle p-8">
              <h3 className="font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)] mb-6">Per-Hustle Breakdown</h3>
              <div className="space-y-2">
                {hustleStats.map(({ hustle, income, expenses, profit }) => (
                  <div
                    key={hustle.id}
                    className="flex items-center justify-between p-5 rounded-2xl hover:bg-[var(--surface)] transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hustle.color }} />
                      <p className="font-headline font-bold text-base text-[var(--primary)] truncate">{hustle.name}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-8 flex-shrink-0 text-right">
                      <div>
                        <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">Income</p>
                        <p className="font-headline font-bold text-sm text-[var(--primary)]">{formatCurrency(income)}</p>
                      </div>
                      <div>
                        <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">Expenses</p>
                        <p className="font-headline font-bold text-sm" style={{ color: 'var(--expense)' }}>{formatCurrency(expenses)}</p>
                      </div>
                      <div>
                        <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">Net Profit</p>
                        <p className="font-headline font-black text-sm" style={{ color: profit >= 0 ? 'var(--secondary)' : 'var(--expense)' }}>
                          {formatCurrency(profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {!loading && hustleStats.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
                No income logged for {periodLabel.toLowerCase()}
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
