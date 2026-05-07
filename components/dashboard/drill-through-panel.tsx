'use client'

import { X } from 'lucide-react'
import { formatCurrency, formatTaxRate } from '@/lib/utils/formatters'

export type DrillKey = 'net-profit' | 'income' | 'expenses' | 'taxes' | 'cogs'

interface HustleStat {
  hustle: { id: string; name: string; color: string }
  income: number
  expenses: number
  profit: number
}

interface DrillThroughPanelProps {
  drillKey: DrillKey | null
  onClose: () => void
  periodLabel: string
  totalIncome: number
  totalExpenses: number
  totalCogs: number
  netProfit: number
  taxSetAside: number
  taxableIncome: number
  taxRate: number
  hustleStats: HustleStat[]
}

const DRILL_TITLES: Record<DrillKey, string> = {
  'net-profit': 'Net Profit Breakdown',
  income: 'Income Breakdown',
  expenses: 'Expense Breakdown',
  taxes: 'Tax Breakdown',
  cogs: 'Cost of Goods',
}

// ─── Sub-panels ──────────────────────────────────────────────────────────────

function HustleBarList({
  items,
  valueKey,
  valueColor,
  emptyText,
}: {
  items: HustleStat[]
  valueKey: 'income' | 'expenses'
  valueColor: string
  emptyText: string
}) {
  if (items.length === 0) {
    return (
      <p
        className="font-label text-[11px] uppercase tracking-widest text-center py-8"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        {emptyText}
      </p>
    )
  }

  const sorted = [...items].sort((a, b) => b[valueKey] - a[valueKey])
  const max = sorted[0][valueKey] || 1

  return (
    <ul className="space-y-4">
      {sorted.map(({ hustle, income, expenses }) => {
        const val = valueKey === 'income' ? income : expenses
        return (
          <li key={hustle.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: hustle.color }}
                />
                <span
                  className="font-label text-[11px] uppercase tracking-widest truncate"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  {hustle.name}
                </span>
              </div>
              <span
                className="font-headline font-bold text-sm flex-shrink-0 ml-3"
                style={{ color: valueColor }}
              >
                {formatCurrency(val)}
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--surface-container-high)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(val / max) * 100}%`,
                  background: valueColor,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function NetProfitContent({
  totalIncome,
  totalExpenses,
  totalCogs,
  taxSetAside,
  netProfit,
}: Pick<
  DrillThroughPanelProps,
  'totalIncome' | 'totalExpenses' | 'totalCogs' | 'taxSetAside' | 'netProfit'
>) {
  const rows: Array<{ label: string; value: number; sign: '+' | '−'; muted?: boolean }> = [
    { label: 'Income', value: totalIncome, sign: '+' },
    { label: 'Expenses', value: totalExpenses, sign: '−' },
    ...(totalCogs > 0
      ? [{ label: 'COGS', value: totalCogs, sign: '−' as const }]
      : []),
    { label: 'Tax Set-Aside', value: taxSetAside, sign: '−' },
  ]

  return (
    <div>
      <ul className="space-y-3 mb-4">
        {rows.map(({ label, value, sign }) => (
          <li key={label} className="flex items-center justify-between">
            <span
              className="font-label text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              {sign} {label}
            </span>
            <span
              className="font-headline font-bold text-sm"
              style={{ color: sign === '+' ? 'var(--secondary)' : 'var(--expense)' }}
            >
              {formatCurrency(value)}
            </span>
          </li>
        ))}
      </ul>

      {/* Separator */}
      <div
        className="h-px mb-4"
        style={{ background: 'var(--surface-container-high)' }}
      />

      <div className="flex items-center justify-between">
        <span
          className="font-label text-[11px] uppercase tracking-widest"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          = Net Profit
        </span>
        <span
          className="font-headline font-black text-2xl"
          style={{ color: netProfit >= 0 ? 'var(--secondary)' : 'var(--expense)' }}
        >
          {formatCurrency(netProfit)}
        </span>
      </div>
    </div>
  )
}

function TaxContent({
  taxableIncome,
  nonTaxableIncome,
  taxRate,
  taxSetAside,
}: {
  taxableIncome: number
  nonTaxableIncome: number
  taxRate: number
  taxSetAside: number
}) {
  return (
    <ul className="space-y-3">
      <li className="flex items-center justify-between">
        <span
          className="font-label text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Taxable Income
        </span>
        <span className="font-headline font-bold text-sm" style={{ color: 'var(--on-surface)' }}>
          {formatCurrency(taxableIncome)}
        </span>
      </li>
      <li className="flex items-center justify-between">
        <span
          className="font-label text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Non-Taxable
        </span>
        <span className="font-headline font-bold text-sm" style={{ color: 'var(--on-surface)' }}>
          {formatCurrency(nonTaxableIncome)}
        </span>
      </li>
      <li className="flex items-center justify-between">
        <span
          className="font-label text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          SE Tax Rate
        </span>
        <span className="font-headline font-bold text-sm" style={{ color: 'var(--on-surface)' }}>
          {formatTaxRate(taxRate)}
        </span>
      </li>

      {/* Highlighted set-aside row */}
      <li
        className="squircle flex items-center justify-between px-4 py-3"
        style={{
          background: 'var(--tertiary-fixed)',
        }}
      >
        <span
          className="font-label text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--tertiary-container)' }}
        >
          → Set Aside
        </span>
        <span
          className="font-headline font-black text-lg"
          style={{ color: 'var(--tertiary-container)' }}
        >
          {formatCurrency(taxSetAside)}
        </span>
      </li>
    </ul>
  )
}

function CogsContent({ totalCogs }: { totalCogs: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span
          className="font-label text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Total COGS
        </span>
        <span
          className="font-headline font-black text-2xl"
          style={{ color: 'var(--expense)' }}
        >
          {formatCurrency(totalCogs)}
        </span>
      </div>
      <p
        className="font-label text-[11px]"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        Cost of items purchased for reselling. Per-hustle breakdown not available — total only.
      </p>
    </div>
  )
}

// ─── Panel header ─────────────────────────────────────────────────────────────

function PanelHeader({
  drillKey,
  periodLabel,
  onClose,
  mobile,
}: {
  drillKey: DrillKey
  periodLabel: string
  onClose: () => void
  mobile: boolean
}) {
  return (
    <div className="mb-6">
      {mobile && (
        <div
          className="w-10 h-1.5 rounded-full mx-auto mb-4"
          style={{ background: 'var(--surface-container-high)' }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="font-headline font-bold text-xl leading-tight"
            style={{ color: 'var(--primary)' }}
          >
            {DRILL_TITLES[drillKey]}
          </h2>
          <span
            className="font-label text-[10px] uppercase tracking-widest mt-0.5 inline-block"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            {periodLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
          aria-label="Close"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DrillThroughPanel({
  drillKey,
  onClose,
  periodLabel,
  totalIncome,
  totalExpenses,
  totalCogs,
  netProfit,
  taxSetAside,
  taxableIncome,
  taxRate,
  hustleStats,
}: DrillThroughPanelProps) {
  if (!drillKey) return null

  const nonTaxableIncome = totalIncome - taxableIncome

  function renderContent() {
    switch (drillKey) {
      case 'income':
        return (
          <HustleBarList
            items={hustleStats}
            valueKey="income"
            valueColor="var(--secondary)"
            emptyText="No income logged yet"
          />
        )
      case 'expenses':
        return (
          <HustleBarList
            items={hustleStats}
            valueKey="expenses"
            valueColor="var(--expense)"
            emptyText="No expenses logged yet"
          />
        )
      case 'net-profit':
        return (
          <NetProfitContent
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            totalCogs={totalCogs}
            taxSetAside={taxSetAside}
            netProfit={netProfit}
          />
        )
      case 'taxes':
        return (
          <TaxContent
            taxableIncome={taxableIncome}
            nonTaxableIncome={nonTaxableIncome}
            taxRate={taxRate}
            taxSetAside={taxSetAside}
          />
        )
      case 'cogs':
        return <CogsContent totalCogs={totalCogs} />
      default:
        return null
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Mobile: slide-up sheet */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] overflow-y-auto max-h-[80vh] p-6 transition-transform duration-300"
        style={{ background: 'var(--surface-container-lowest)' }}
      >
        <PanelHeader
          drillKey={drillKey}
          periodLabel={periodLabel}
          onClose={onClose}
          mobile
        />
        {renderContent()}
        {/* Bottom safe area padding */}
        <div className="h-6" />
      </div>

      {/* Desktop: centered modal */}
      <div className="hidden lg:flex fixed inset-0 z-50 items-center justify-center">
        <div
          className="squircle max-w-lg w-full mx-4 p-6 overflow-y-auto"
          style={{
            background: 'var(--surface-container-lowest)',
            maxHeight: '80vh',
          }}
        >
          <PanelHeader
            drillKey={drillKey}
            periodLabel={periodLabel}
            onClose={onClose}
            mobile={false}
          />
          {renderContent()}
        </div>
      </div>
    </>
  )
}
