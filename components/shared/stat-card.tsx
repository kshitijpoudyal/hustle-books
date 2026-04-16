'use client'

import Link from 'next/link'
import { twMerge } from 'tailwind-merge'
import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  /** Always shown — Work Sans, uppercase, tracking-widest */
  label: string
  /** Always shown — main monetary or numeric value */
  value: string
  /** Optional description line below value (tax-page style) */
  sub?: string

  /** Use var(--secondary) for value color */
  accent?: boolean
  /** Explicit CSS color string for the value (overrides accent) */
  valueColor?: string

  // ── Desktop-only rich header (dashboard variant) ──────────────────────────
  /** Icon component rendered in a rounded box — enables "rich" desktop layout */
  icon?: LucideIcon
  /** Badge chip shown beside the icon on desktop */
  badge?: { text: string; className: string }

  // ── Trend row — shown below value on all sizes ────────────────────────────
  trendIcon?: LucideIcon
  trendText?: string
  trendColor?: string

  // ── Layout ────────────────────────────────────────────────────────────────
  /** Span 2 columns on mobile */
  wide?: boolean
  /** Force aspect-square on mobile (dashboard compact cards) */
  mobileAspectSquare?: boolean
  /** Tailwind height class applied to the card e.g. 'h-32' 'h-36' 'h-48' */
  height?: string
  className?: string

  // ── State ─────────────────────────────────────────────────────────────────
  loading?: boolean
  /** If provided, wraps the entire card in a Next.js Link */
  href?: string
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function StatCardSkeleton({
  wide,
  mobileAspectSquare,
  height,
  richDesktop,
  className,
}: {
  wide?: boolean
  mobileAspectSquare?: boolean
  height?: string
  /** When true, renders the taller icon-row skeleton used by the dashboard */
  richDesktop?: boolean
  className?: string
}) {
  const mobileSize = mobileAspectSquare ? 'aspect-square' : (height ?? '')
  const desktopSize = mobileAspectSquare
    ? `lg:aspect-auto${height ? ` lg:${height}` : ''}`
    : height ? `lg:${height}` : ''
  const colSpan = wide ? 'col-span-2 lg:col-span-1' : ''

  return (
    <div
      className={twMerge(
        'bg-[var(--surface-container-low)] squircle p-5 lg:p-6 flex flex-col justify-between animate-pulse',
        mobileSize,
        desktopSize,
        colSpan,
        className,
      )}
    >
      {richDesktop && (
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[var(--surface-container-highest)] rounded-2xl" />
          <div className="h-5 w-14 bg-[var(--surface-container-highest)] rounded-full" />
        </div>
      )}
      {!richDesktop && (
        <div className="h-2.5 w-20 bg-[var(--surface-container-high)] rounded-full" />
      )}
      <div>
        {richDesktop && (
          <div className="h-2.5 w-16 bg-[var(--surface-container-high)] rounded-full mb-2" />
        )}
        <div className="h-8 w-28 bg-[var(--surface-container-high)] rounded-full" />
        <div className="h-4 w-16 bg-[var(--surface-container)] rounded-full mt-2" />
      </div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

export default function StatCard({
  label,
  value,
  sub,
  accent,
  valueColor,
  icon: Icon,
  badge,
  trendIcon: TrendIcon,
  trendText,
  trendColor,
  wide,
  mobileAspectSquare,
  height,
  className,
  loading,
  href,
}: StatCardProps) {
  if (loading) {
    return (
      <StatCardSkeleton
        wide={wide}
        mobileAspectSquare={mobileAspectSquare}
        height={height}
        richDesktop={!!Icon}
        className={className}
      />
    )
  }

  const resolvedValueColor = valueColor ?? (accent ? 'var(--secondary)' : 'var(--primary)')

  // Mobile sizing: aspect-square OR explicit height OR nothing (auto)
  const mobileSize = mobileAspectSquare ? 'aspect-square' : (height ?? '')
  // Desktop sizing: cancel aspect-square when mobileAspectSquare is set, then apply height
  const desktopSize = mobileAspectSquare
    ? `lg:aspect-auto${height ? ` lg:${height}` : ''}`
    : Icon && height ? `lg:${height}` : ''
  const colSpan = wide ? 'col-span-2 lg:col-span-1' : ''

  const cardClass = twMerge(
    'bg-[var(--surface-container-low)] squircle p-5 lg:p-6 flex flex-col justify-between hover:shadow-xl transition-all group',
    href && 'active:scale-[0.98] cursor-pointer',
    mobileSize,
    desktopSize,
    colSpan,
    className,
  )

  const cardStyle = { boxShadow: '0 0 0 0 transparent' }

  const content = (
    <>
      {/* ── Icon + badge header ───────────────────────────────────────────── */}
      {Icon && (
        <div className="flex justify-between items-start">
          <div className="p-2.5 lg:p-3 bg-[var(--surface-container-highest)] rounded-2xl group-hover:scale-110 transition-transform">
            <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          {badge && (
            <span className={`font-label text-[10px] uppercase tracking-widest px-2 py-1 lg:px-3 rounded-full ${badge.className}`}>
              {badge.text}
            </span>
          )}
        </div>
      )}

      {/* ── Label (only when no icon) ──────────────────────────────────────── */}
      {!Icon && (
        <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
          {label}
        </span>
      )}

      {/* ── Bottom block: label + value + sub + trend ─────────────────────── */}
      <div>
        {Icon && (
          <p className="font-label text-[11px] uppercase tracking-widest text-[var(--on-surface-variant)] mb-1">
            {label}
          </p>
        )}

        {/* Value */}
        <div
          className="text-2xl lg:text-3xl font-black leading-none"
          style={{ color: resolvedValueColor }}
        >
          {value}
        </div>

        {/* Sub-description */}
        {sub && (
          <p className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 mt-1">
            {sub}
          </p>
        )}

        {/* Trend row */}
        {TrendIcon && trendText && (
          <div className="flex items-center gap-1 mt-1" style={{ color: trendColor }}>
            <TrendIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2} />
            <span className="font-label text-[10px] font-bold">{trendText}</span>
          </div>
        )}

        {/* Link cue */}
        {href && (
          <p className="font-label text-[10px] uppercase tracking-widest font-bold mt-3" style={{ color: 'var(--secondary)' }}>
            View Full Report →
          </p>
        )}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cardClass} style={cardStyle}>
        {content}
      </Link>
    )
  }

  return (
    <div
      className={cardClass}
      style={cardStyle}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px rgba(2, 36, 72, 0.05)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 0 transparent')}
    >
      {content}
    </div>
  )
}
