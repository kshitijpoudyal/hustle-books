import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Clock, ReceiptText, Building2, Route, ShoppingBag } from 'lucide-react'
import { formatCurrency, formatMileage } from '@/lib/utils/formatters'
import StatCard from '@/components/shared/stat-card'
import type { StatCardProps } from '@/components/shared/stat-card'

interface StatCardsProps {
  totalIncome: number
  totalExpenses: number
  totalCogs: number
  netProfit: number
  taxSetAside: number
  totalMileage: number
  totalDepreciation: number
  loading: boolean
  periodLabel: string
}

export default function StatCards({
  totalIncome,
  totalExpenses,
  totalCogs,
  netProfit,
  taxSetAside,
  totalMileage,
  totalDepreciation,
  loading,
  periodLabel,
}: StatCardsProps) {
  const profitPositive = netProfit >= 0

  const cards: (StatCardProps & { key: string })[] = [
    {
      key: 'net-profit',
      label: 'Net Profit',
      value: formatCurrency(Math.abs(netProfit)),
      icon: TrendingUp,
      badge: {
        text: profitPositive ? periodLabel : 'LOSS',
        className: profitPositive
          ? 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'
          : 'bg-[var(--error-container)] text-[var(--error)]',
      },
      trendIcon: profitPositive ? TrendingUp : TrendingDown,
      trendColor: profitPositive ? 'var(--secondary)' : 'var(--expense)',
      trendText: profitPositive ? periodLabel : 'LOSS',
      wide: true,
      height: 'h-44',
    },
    {
      key: 'income',
      label: 'Income',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      badge: { text: periodLabel, className: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]' },
      trendIcon: ArrowUp,
      trendColor: 'var(--secondary)',
      trendText: periodLabel,
      wide: true,
      height: 'h-44',
    },
    {
      key: 'expenses',
      label: 'Expenses',
      value: formatCurrency(totalExpenses),
      icon: ReceiptText,
      badge: { text: periodLabel, className: 'bg-[var(--error-container)] text-[var(--error)]' },
      trendIcon: ArrowDown,
      trendColor: 'var(--expense)',
      trendText: periodLabel,
      wide: true,
      height: 'h-44',
    },
    ...(totalCogs !== 0 ? [{
      key: 'cogs',
      label: 'Cost of Goods',
      value: formatCurrency(totalCogs),
      icon: ShoppingBag,
      badge: { text: periodLabel, className: 'bg-[var(--error-container)] text-[var(--error)]' },
      trendIcon: ShoppingBag,
      trendColor: 'var(--expense)',
      trendText: 'COGS',
      wide: true,
      height: 'h-44',
    }] : []),
    {
      key: 'taxes',
      label: 'Estimated Taxes',
      value: formatCurrency(taxSetAside),
      icon: Building2,
      badge: { text: periodLabel, className: 'bg-[var(--tertiary-fixed)] text-[var(--tertiary-container)]' },
      trendIcon: Clock,
      trendColor: 'var(--on-surface-variant)',
      trendText: 'Set Aside',
      wide: true,
      height: 'h-44',
      href: '/tax',
    },
  ]

  const colCount = cards.length
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${colCount} gap-4 lg:gap-6`}>
      {cards.map(({ key, ...card }) => (
        <StatCard key={key} {...card} loading={loading} />
      ))}
    </div>
  )
}
