'use client'

import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Clock, CreditCard, ReceiptText, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'

interface StatCardsProps {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  taxSetAside: number
  loading: boolean
}

function CardSkeleton() {
  return (
    <div className="bg-[var(--surface-container-low)] squircle p-5 lg:p-6 flex flex-col justify-between aspect-square lg:aspect-auto lg:h-44 animate-pulse">
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
  loading,
}: StatCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
      </div>
    )
  }

  const profitPositive = netProfit >= 0

  const cards = [
    {
      label: 'Net Profit',
      value: formatCurrency(Math.abs(netProfit)),
      DesktopIcon: TrendingUp,
      desktopBadge: { text: profitPositive ? '+MTH' : 'LOSS', className: profitPositive ? 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]' : 'bg-[var(--error-container)] text-[var(--error)]' },
      MobileTrendIcon: profitPositive ? TrendingUp : TrendingDown,
      mobileTrendColor: profitPositive ? 'var(--secondary)' : 'var(--expense)',
      mobileTrendText: profitPositive ? '+MTH' : 'LOSS',
    },
    {
      label: 'Income',
      value: formatCurrency(totalIncome),
      DesktopIcon: TrendingUp,
      desktopBadge: { text: 'All Time', className: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]' },
      MobileTrendIcon: ArrowUp,
      mobileTrendColor: 'var(--secondary)',
      mobileTrendText: '8.4%',
    },
    {
      label: 'Expenses',
      value: formatCurrency(totalExpenses),
      DesktopIcon: ReceiptText,
      desktopBadge: { text: 'All Time', className: 'bg-[var(--error-container)] text-[var(--error)]' },
      MobileTrendIcon: ArrowDown,
      mobileTrendColor: 'var(--expense)',
      mobileTrendText: '2.1%',
    },
    {
      label: 'Estimated Taxes',
      value: formatCurrency(taxSetAside),
      DesktopIcon: Building2,
      desktopBadge: { text: 'Reserve', className: 'bg-[var(--tertiary-fixed)] text-[var(--tertiary-container)]' },
      MobileTrendIcon: Clock,
      mobileTrendColor: 'var(--on-surface-variant)',
      mobileTrendText: 'Set Aside',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {cards.map(({ label, value, DesktopIcon, desktopBadge, MobileTrendIcon, mobileTrendColor, mobileTrendText }) => (
        <div
          key={label}
          className="bg-[var(--surface-container-low)] squircle p-5 lg:p-6 flex flex-col justify-between aspect-square lg:aspect-auto lg:h-44 hover:shadow-xl transition-all group"
          style={{ boxShadow: '0 0 0 0 transparent' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px rgba(2, 36, 72, 0.05)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 0 transparent')}
        >
          {/* Desktop: icon badge + % badge */}
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
