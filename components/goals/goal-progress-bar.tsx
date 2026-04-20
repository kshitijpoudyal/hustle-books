'use client'

import { getMilestoneTier } from '@/lib/hooks/use-goal-milestones'

interface GoalProgressBarProps {
  pct: number          // 0–100
  isComplete: boolean
  color?: string
  /** When true, apply a glow pulse animation on the bar */
  animate?: boolean
}

// Milestone marker positions — thin tick lines at 25/50/75%
const MARKERS = [25, 50, 75]

export default function GoalProgressBar({ pct, isComplete, color, animate }: GoalProgressBarProps) {
  const fill = Math.min(100, pct)
  const tier = getMilestoneTier(pct)
  const barColor = isComplete ? 'var(--secondary)' : (color ?? 'var(--primary)')

  // Glow intensity increases with milestone tier
  const glowOpacity = isComplete ? 0.55 : tier === 75 ? 0.4 : tier === 50 ? 0.3 : tier === 25 ? 0.2 : 0

  return (
    <div className="relative w-full">
      {/* Track */}
      <div
        className="w-full h-2.5 rounded-full overflow-visible relative"
        style={{ backgroundColor: 'var(--surface-container-high)' }}
        role="progressbar"
        aria-valuenow={Math.round(fill)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Fill */}
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out relative ${animate && !isComplete ? 'animate-pulse' : ''}`}
          style={{
            width: `${fill}%`,
            background: isComplete
              ? `linear-gradient(90deg, ${barColor}, var(--secondary))`
              : `linear-gradient(90deg, ${barColor}bb, ${barColor})`,
            boxShadow: glowOpacity > 0
              ? `0 0 ${isComplete ? 12 : 8}px ${isComplete ? 6 : 4}px ${barColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}`
              : 'none',
          }}
        >
          {/* Shimmer overlay for completed goals */}
          {isComplete && (
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear' }}
            />
          )}
        </div>

        {/* Milestone marker ticks — sit on top of the track */}
        {MARKERS.map(ms => (
          <div
            key={ms}
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${ms}%`,
              backgroundColor: fill >= ms ? 'rgba(255,255,255,0.4)' : 'var(--surface-container-highest)',
              zIndex: 1,
            }}
          />
        ))}
      </div>

      {/* Milestone dot labels — tiny dots below the bar showing tier positions */}
      <div className="relative h-3 mt-0.5">
        {MARKERS.map(ms => (
          <div
            key={ms}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${ms}%` }}
          >
            <div
              className="w-1 h-1 rounded-full transition-colors duration-500"
              style={{
                backgroundColor: fill >= ms ? barColor : 'var(--outline-variant)',
                opacity: fill >= ms ? 0.9 : 0.4,
              }}
            />
          </div>
        ))}
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

