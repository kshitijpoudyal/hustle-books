import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { HustleIcon } from '@/lib/utils/hustle-icons'
import type { HustleStat } from '@/lib/hooks/use-dashboard'

interface HustleSummaryProps {
  hustleStats: HustleStat[]
  loading: boolean
}

export default function HustleSummary({ hustleStats, loading }: HustleSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="squircle bg-[var(--surface-container-lowest)] h-36 animate-pulse overflow-hidden"
          >
            <div className="h-1.5 w-full bg-[var(--surface-container-high)]" />
          </div>
        ))}
      </div>
    )
  }

  if (hustleStats.length === 0) {
    return (
      <Link
        href="/hustles"
        className="flex items-center gap-4 p-6 squircle bg-[var(--surface-container-lowest)] hover:shadow-ambient transition-all duration-300 group"
        style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(196, 198, 207, 0.3)' }}
      >
        <div className="w-12 h-12 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus className="w-5 h-5 text-[var(--outline)]" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-headline text-base font-bold text-[var(--primary)]">Add your first hustle</p>
          <p className="font-label text-[10px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] mt-0.5">
            DoorDash, freelance, lawn care…
          </p>
        </div>
      </Link>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {hustleStats.map(({ hustle, income, profit }) => {
        const positive = profit >= 0
        return (
          <Link
            key={hustle.id}
            href={`/hustles/${hustle.id}`}
            className="squircle bg-[var(--surface-container-lowest)] overflow-hidden flex flex-col group hover:shadow-ambient-lg transition-all duration-500 cursor-pointer"
          >
            {/* Color bar */}
            <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: hustle.color }} />

            <div className="p-5 flex flex-col flex-1">
              {/* Icon + name */}
              <div className="mb-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${hustle.color}20`, color: hustle.color }}
                >
                  <HustleIcon name={hustle.icon} size={18} strokeWidth={1.5} />
                </div>
                <p className="font-headline text-sm font-extrabold text-[var(--primary)] leading-tight line-clamp-1">
                  {hustle.name}
                </p>
              </div>

              {/* Earnings */}
              <div className="mt-auto">
                <p className="font-label text-[9px] uppercase tracking-[0.06rem] text-[var(--on-surface-variant)]">
                  Profit
                </p>
                <p
                  className="font-headline text-xl font-black tabular-nums"
                  style={{ color: positive ? 'var(--income)' : 'var(--expense)' }}
                >
                  {positive ? '' : '−'}{formatCurrency(Math.abs(profit), 'USD', true)}
                </p>
                <p className="font-label text-[9px] uppercase tracking-[0.04rem] text-[var(--on-surface-variant)] mt-0.5 opacity-70">
                  {formatCurrency(income, 'USD', true)} in
                </p>
              </div>
            </div>
          </Link>
        )
      })}

      {/* Add new hustle ghost card */}
      <Link
        href="/hustles"
        className="squircle flex flex-col items-center justify-center gap-3 p-6 min-h-[160px] hover:bg-[var(--surface-container-low)] hover:shadow-ambient transition-all duration-300 group"
        style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(196, 198, 207, 0.3)' }}
      >
        <div className="w-12 h-12 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus className="w-5 h-5 text-[var(--outline)]" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="font-headline text-sm font-bold text-[var(--primary)]">Add Hustle</p>
          <p className="font-label text-[9px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] mt-0.5">
            Scale your income
          </p>
        </div>
      </Link>
    </div>
  )
}
