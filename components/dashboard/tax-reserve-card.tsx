'use client'

import Link from 'next/link'
import { PiggyBank } from 'lucide-react'
import { formatCurrency, formatTaxRate } from '@/lib/utils/formatters'

interface TaxReserveCardProps {
  taxableIncome: number
  nonTaxableIncome: number
  taxSetAside: number
  taxRate: number
  periodLabel: string
  loading: boolean
}

export default function TaxReserveCard({
  taxableIncome,
  nonTaxableIncome,
  taxSetAside,
  taxRate,
  periodLabel,
  loading,
}: TaxReserveCardProps) {
  if (loading) {
    return (
      <div
        className="squircle relative overflow-hidden p-5 animate-pulse"
        style={{ background: 'var(--tertiary-fixed)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="w-20 h-6 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div className="w-16 h-3 rounded mb-2" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div className="w-32 h-9 rounded mb-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div className="w-40 h-3 rounded mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
      </div>
    )
  }

  const reservePercent =
    taxableIncome > 0 ? Math.min(100, (taxSetAside / taxableIncome) * 100) : 0

  return (
    <div
      className="squircle relative overflow-hidden p-5"
      style={{ background: 'var(--tertiary-fixed)' }}
    >
      {/* Decorative dollar sign */}
      <span
        className="absolute bottom-3 right-4 select-none pointer-events-none font-headline font-black text-8xl leading-none"
        style={{ color: 'rgba(255,255,255,0.08)' }}
        aria-hidden
      >
        $
      </span>

      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <PiggyBank
            size={20}
            strokeWidth={1.5}
            style={{ color: 'var(--tertiary-container)' }}
          />
        </div>
        <span
          className="font-label text-[10px] uppercase tracking-widest px-3 py-1 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'var(--tertiary-container)',
          }}
        >
          {periodLabel}
        </span>
      </div>

      {/* Label */}
      <p
        className="font-label text-[10px] uppercase tracking-widest mb-1"
        style={{ color: `color-mix(in srgb, var(--tertiary-container) 70%, transparent)` }}
      >
        Tax Reserve
      </p>

      {/* Amount */}
      <p
        className="font-headline font-black text-3xl leading-none mb-1"
        style={{ color: 'var(--tertiary-container)' }}
      >
        {formatCurrency(taxSetAside)}
      </p>

      {/* Sub-line */}
      <p
        className="font-label text-[11px] mb-4"
        style={{ color: `color-mix(in srgb, var(--tertiary-container) 75%, transparent)` }}
      >
        {formatTaxRate(taxRate)} of {formatCurrency(taxableIncome)} taxable
      </p>

      {/* Progress bar */}
      {taxableIncome > 0 && (
        <div className="mb-3">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${reservePercent}%`,
                background: 'var(--tertiary-container)',
              }}
            />
          </div>
          <div className="flex justify-end mt-1">
            <span
              className="font-label text-[10px] uppercase tracking-widest"
              style={{ color: `color-mix(in srgb, var(--tertiary-container) 70%, transparent)` }}
            >
              {reservePercent.toFixed(0)}% reserved
            </span>
          </div>
        </div>
      )}

      {/* Non-taxable note */}
      {nonTaxableIncome > 0 && (
        <p
          className="font-label text-[10px] mb-3"
          style={{ color: `color-mix(in srgb, var(--tertiary-container) 60%, transparent)` }}
        >
          + {formatCurrency(nonTaxableIncome)} non-taxable
        </p>
      )}

      {/* Footer link */}
      <div className="flex justify-end">
        <Link
          href="/tax"
          className="font-label text-[11px] uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ color: 'var(--tertiary-container)' }}
        >
          Full report →
        </Link>
      </div>
    </div>
  )
}
