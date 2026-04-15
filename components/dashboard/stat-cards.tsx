import { formatCurrency } from '@/lib/utils/formatters'

interface StatCardsProps {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  taxSetAside: number
  loading: boolean
}

export default function StatCards({
  totalIncome,
  totalExpenses,
  netProfit,
  taxSetAside,
  loading,
}: StatCardsProps) {
  const profitPositive = netProfit >= 0

  if (loading) {
    return (
      <div className="squircle bg-[var(--surface-container-low)] p-6 lg:p-8 animate-pulse">
        <div className="h-3 w-24 bg-[var(--surface-container-high)] rounded-full mb-5" />
        <div className="h-14 w-52 bg-[var(--surface-container-high)] rounded-full mb-3" />
        <div className="h-3 w-40 bg-[var(--surface-container)] rounded-full mb-7" />
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-[var(--surface-container-low)] rounded-full" />
          <div className="h-10 w-36 bg-[var(--surface-container-low)] rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="squircle bg-[var(--surface-container-low)] p-6 lg:p-8">
      {/* Label */}
      <p className="font-label text-[10px] uppercase tracking-[0.08rem] text-[var(--on-surface-variant)] mb-3">
        Net Profit — This Month
      </p>

      {/* Hero number */}
      <p
        className="font-headline text-5xl lg:text-6xl font-black tracking-tighter leading-none"
        style={{ color: profitPositive ? 'var(--income)' : 'var(--expense)' }}
      >
        {profitPositive ? '' : '−'}{formatCurrency(Math.abs(netProfit))}
      </p>

      {/* Sub-label */}
      <p className="font-label text-[10px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] mt-3 opacity-70">
        {taxSetAside > 0
          ? `After ${formatCurrency(taxSetAside, 'USD', true)} tax set-aside`
          : profitPositive ? 'After expenses & tax' : 'Running at a loss'}
      </p>

      {/* Income / Expense pills */}
      <div className="flex gap-3 mt-6 flex-wrap">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{ backgroundColor: 'rgba(0, 106, 104, 0.08)' }}
        >
          <span
            className="font-label text-[10px] uppercase tracking-[0.06rem] font-semibold"
            style={{ color: 'var(--income)' }}
          >
            ↑ {formatCurrency(totalIncome, 'USD', true)}
          </span>
          <span className="font-label text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)] opacity-50">
            in
          </span>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{ backgroundColor: 'rgba(186, 26, 26, 0.07)' }}
        >
          <span
            className="font-label text-[10px] uppercase tracking-[0.06rem] font-semibold"
            style={{ color: 'var(--expense)' }}
          >
            ↓ {formatCurrency(totalExpenses, 'USD', true)}
          </span>
          <span className="font-label text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)] opacity-50">
            out
          </span>
        </div>
      </div>
    </div>
  )
}
