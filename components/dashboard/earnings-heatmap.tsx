'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useIncome } from '@/lib/hooks/use-income'
import { formatCurrency } from '@/lib/utils/formatters'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EarningsHeatmap() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { entries, loading } = useIncome({ date_from: monthStart, date_to: monthEnd })

  const earningsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of entries) {
      map[e.date] = (map[e.date] ?? 0) + Number(e.amount)
    }
    return map
  }, [entries])

  const maxEarning = useMemo(() => {
    const vals = Object.values(earningsByDate)
    return vals.length > 0 ? Math.max(...vals) : 1
  }, [earningsByDate])

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const todayStr = fmt(today)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="squircle p-5 lg:p-6" style={{ background: 'var(--surface-container-low)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="font-headline font-bold text-base"
          style={{ color: 'var(--primary)' }}
        >
          Earnings Heatmap
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
            aria-label="Previous month"
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
          </button>
          <span
            className="font-label text-[10px] uppercase tracking-widest text-center"
            style={{ color: 'var(--on-surface-variant)', minWidth: '7rem' }}
          >
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
            aria-label="Next month"
          >
            <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(d => (
          <div
            key={d}
            className="text-center font-label text-[8px] uppercase tracking-widest pb-1"
            style={{ color: 'var(--on-surface-variant)', opacity: 0.45 }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg animate-pulse"
              style={{ background: 'var(--surface-container)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="aspect-square" />

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const amount = earningsByDate[dateStr] ?? 0
            const isToday = dateStr === todayStr
            const intensity = amount > 0 ? Math.max(0.15, amount / maxEarning) : 0

            return (
              <div
                key={i}
                className="aspect-square rounded-lg flex items-end justify-center pb-0.5"
                style={{
                  background: amount > 0
                    ? `rgba(44, 166, 164, ${intensity})`
                    : 'var(--surface-container)',
                  outline: isToday ? '2px solid var(--primary)' : undefined,
                  outlineOffset: isToday ? '-2px' : undefined,
                }}
                title={amount > 0 ? `${dateStr}: ${formatCurrency(amount)}` : dateStr}
              >
                <span
                  className="font-label leading-none select-none"
                  style={{
                    fontSize: '8px',
                    color: amount > 0 && intensity > 0.55 ? 'rgba(255,255,255,0.9)' : 'var(--on-surface-variant)',
                    opacity: amount > 0 && intensity > 0.55 ? 1 : 0.5,
                  }}
                >
                  {day}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span
          className="font-label text-[8px] uppercase tracking-widest mr-1"
          style={{ color: 'var(--on-surface-variant)', opacity: 0.45 }}
        >
          Less
        </span>
        {[0.12, 0.3, 0.5, 0.75, 1].map(op => (
          <div
            key={op}
            className="w-3 h-3 rounded-sm"
            style={{ background: `rgba(44, 166, 164, ${op})` }}
          />
        ))}
        <span
          className="font-label text-[8px] uppercase tracking-widest ml-1"
          style={{ color: 'var(--on-surface-variant)', opacity: 0.45 }}
        >
          More
        </span>
      </div>
    </div>
  )
}
