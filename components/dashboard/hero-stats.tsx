import { formatCurrency } from '@/lib/utils/formatters'

interface HeroStatsProps {
  netProfit: number
  totalIncome: number
  totalExpenses: number
  taxSetAside: number
  loading: boolean
}

export default function HeroStats({
  netProfit,
  totalIncome,
  totalExpenses,
  taxSetAside,
  loading,
}: HeroStatsProps) {
  const positive = netProfit >= 0

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-6 animate-pulse">
        <div className="h-3 w-28 bg-[var(--surface-container-high)] rounded-full mb-4" />
        <div className="h-14 w-52 bg-[var(--surface-container-high)] rounded-full mb-2" />
        <div className="h-3 w-36 bg-[var(--surface-container)] rounded-full mb-6" />
        <div className="flex gap-3">
          <div className="h-9 w-32 bg-[var(--surface-container-low)] rounded-full" />
          <div className="h-9 w-32 bg-[var(--surface-container-low)] rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pt-4 pb-6">
      {/* Label */}
      <p className="font-technical text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mb-2">
        Net Profit
      </p>

      {/* Big number */}
      <p
        className="font-technical text-5xl font-bold tracking-tight leading-none"
        style={{ color: positive ? 'var(--primary)' : 'var(--expense)' }}
      >
        {positive ? '' : '−'}{formatCurrency(Math.abs(netProfit))}
      </p>

      {/* Sub-label */}
      <p className="font-technical text-[10px] uppercase tracking-wider text-[var(--on-surface-variant)]/50 mt-2">
        {taxSetAside > 0
          ? `After ${formatCurrency(taxSetAside, 'USD', true)} tax set-aside`
          : 'This month, after expenses'}
      </p>

      {/* Income / Expenses pills */}
      <div className="flex gap-3 mt-5">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: 'rgba(44, 166, 164, 0.1)' }}
        >
          <span className="font-technical text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--income)' }}>
            ↑ {formatCurrency(totalIncome, 'USD', true)}
          </span>
          <span className="font-technical text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)]/40">in</span>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: 'rgba(184, 92, 58, 0.1)' }}
        >
          <span className="font-technical text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--expense)' }}>
            ↓ {formatCurrency(totalExpenses, 'USD', true)}
          </span>
          <span className="font-technical text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)]/40">out</span>
        </div>
      </div>
    </div>
  )
}
