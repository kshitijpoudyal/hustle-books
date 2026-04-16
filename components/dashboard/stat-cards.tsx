'use client'

import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Clock, ReceiptText, Building2, Route } from 'lucide-react'
import { formatCurrency, formatMileage } from '@/lib/utils/formatters'

interface StatCardsProps {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  taxSetAside: number
  totalMileage: number
  totalDepreciation: number
  loading: boolean
  periodLabel: string
}

function CardSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className={`bg-[var(--surface-container-low)] squircle p-5 lg:p-6 flex flex-col justify-between aspect-square lg:aspect-auto lg:h-44 animate-pulse${wide ? ' col-span-2 lg:col-span-1' : ''}`}>
      <div className="hidden lg:flex justify-between items-start">
        <div className="w-12 h-12 bg-[var(--surface-container-highest)] rounded-2xl" />
        <div className="h-6 w-16 bg-[var(--surface-container-highest)] rounded-full" />
      </div>
      <div className="lg:hidden h-2.5 w-20 bg-[var(--surface-container-high)] rounded-full" />
      <div>
        <div className="hidden lg:block h-2.5 w-16 bg-[var(--surface-container-high)] rounded-full mb-2" />
        <div className="h-8 w-28 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-4 w-16 bg-[var(--surface-container)] rounded-full mt-2" />
      </div>
    </div>
  )
}

export default function StatCards({
  totalIncome,
  totalExpenses,
  netProfit,
  taxSetAside,
  totalMileage,
  totalDepreciation,
  loading,
  periodLabel,
}: StatCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
        <CardSkeleton wide />
      </div>
    )
  }

  const profitPositive = netProfit >= 0

  const cards = [
    {
      label: 'Net Profit',
      value: formatCurrency(Math.abs(netProfit)),
      DesktopIcon: TrendingUp,
      desktopBadge: {
        text: profitPositive ? periodLabel : 'LOSS',
        className: profitPositive ? 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]' : 'bg-[var(--error-container)] text-[var(--error)]',
      },
      MobileTrendIcon: profitPositive ? TrendingUp : TrendingDown,
      mobileTrendColor: profitPositive ? 'var(--secondary)' : 'var(--expense)',
      mobileTrendText: profitPositive ? periodLabel : 'LOSS',
    },
    {
      label: 'Income',
      value: formatCurrency(totalIncome),
      DesktopIcon: TrendingUp,
      desktopBadge: { text: periodLabel, className: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]' },
      MobileTrendIcon: ArrowUp,
      mobileTrendColor: 'var(--secondary)',
      mobileTrendText: periodLabel,
    },
    {
      label: 'Expenses',
      value: formatCurrency(totalExpenses),
      DesktopIcon: ReceiptText,
      desktopBadge: { text: periodLabel, className: 'bg-[var(--error-container)] text-[var(--error)]' },
      MobileTrendIcon: ArrowDown,
      mobileTrendColor: 'var(--expense)',
      mobileTrendText: periodLabel,
    },
    {
      label: 'Estimated Taxes',
      value: formatCurrency(taxSetAside),
      DesktopIcon: Building2,
      desktopBadge: { text: 'Reserve', className: 'bg-[var(--tertiary-fixed)] text-[var(--tertiary-container)]' },
      MobileTrendIcon: Clock,
      mobileTrendColor: 'var(--on-surface-variant)',
      mobileTrendText: 'Set Aside',
      wide: false,
    },
    {
      label: 'Depreciation',
      value: formatCurrency(totalDepreciation),
      DesktopIcon: Route,
      desktopBadge: { text: 'Vehicle', className: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]' },
      MobileTrendIcon: Route,
      mobileTrendColor: 'var(--on-surface-variant)',
      mobileTrendText: `${formatMileage(totalMileage)}`,
      wide: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
      {cards.map(({ label, value, DesktopIcon, desktopBadge, MobileTrendIcon, mobileTrendColor, mobileTrendText, wide }) => (
        <div
          key={label}
          className={`bg-[var(--surface-container-low)] squircle p-5 lg:p-6 flex flex-col justify-between hover:shadow-xl transition-all group${wide ? ' col-span-2 lg:col-span-1 aspect-auto h-32 lg:h-44' : ' aspect-square lg:aspect-auto lg:h-44'}`}
          style={{ boxShadow: '0 0 0 0 transparent' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px rgba(2, 36, 72, 0.05)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 0 transparent')}
        >
          {/* Desktop: icon + badge */}
          <div className="hidden lg:flex justify-between items-start">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-2xl group-hover:scale-110 transition-transform">
              <DesktopIcon className="w-5 h-5 text-[var(--primary)]" strokeWidth={1.5} />
            </div>
            <span className={`font-label text-[10px] uppercase tracking-widest px-3 py-1 rounded-full ${desktopBadge.className}`}>
              {desktopBadge.text}
            </span>
          </div>

          {/* Mobile: label at top */}
          <span className="lg:hidden font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
            {label}
          </span>

          {/* Bottom: label (desktop) + amount + trend */}
          <div>
            <p className="hidden lg:block font-label text-[11px] uppercase tracking-widest text-[var(--on-surface-variant)] mb-1">
              {label}
            </p>
            <div className="text-2xl lg:text-3xl font-black text-[var(--primary)] leading-none">
              {value}
            </div>
            <div className="flex items-center gap-1 mt-1" style={{ color: mobileTrendColor }}>
              <MobileTrendIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2} />
              <span className="font-label text-[10px] font-bold">{mobileTrendText}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
