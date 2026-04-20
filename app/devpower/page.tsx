'use client'

import { FLAG_REGISTRY, resolveFlag } from '@/lib/feature-flags'
import { useFeatureFlags } from '@/lib/context/feature-flags-context'
import { Terminal, FlaskConical, Wrench, Circle } from 'lucide-react'

const TAG_META: Record<string, { label: string; color: string }> = {
  experimental: { label: 'Experimental', color: '#f59e0b' },
  wip:          { label: 'WIP',          color: '#8b5cf6' },
  stable:       { label: 'Stable',       color: '#2ca6a4' },
}

export default function DevPowerPage() {
  const { flag, setFlag, stored } = useFeatureFlags()

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto space-y-8 font-mono">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--primary)]">
          <Terminal className="w-5 h-5" strokeWidth={1.5} />
          <h1 className="text-xl font-bold tracking-tight">devpower</h1>
        </div>
        <p className="text-xs text-[var(--on-surface-variant)]">
          HustleBooks · feature flags · localhost/devpower
        </p>
        <p className="text-[10px] text-[var(--on-surface-variant)] opacity-60">
          Changes are persisted to localStorage and take effect immediately.
          Not visible to end users.
        </p>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--outline-variant)' }} />

      {/* Flag list */}
      <div className="space-y-3">
        {FLAG_REGISTRY.map((def) => {
          const enabled = flag(def.key as Parameters<typeof flag>[0])
          const isOverridden = def.key in stored
          const tagMeta = def.tag ? TAG_META[def.tag] : null

          return (
            <div
              key={def.key}
              className="rounded-2xl p-4 space-y-3 transition-all"
              style={{
                backgroundColor: 'var(--surface-container-low)',
                outline: enabled ? '1px solid var(--primary)' : '1px solid transparent',
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--on-surface)]">
                      {def.label}
                    </span>
                    {tagMeta && (
                      <span
                        className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: tagMeta.color + '22', color: tagMeta.color }}
                      >
                        {tagMeta.label}
                      </span>
                    )}
                    {isOverridden && (
                      <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)' }}
                      >
                        overridden
                      </span>
                    )}
                  </div>
                  <code className="text-[10px] text-[var(--on-surface-variant)]">
                    {def.key}
                  </code>
                  <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    {def.description}
                  </p>
                </div>

                {/* Toggle */}
                <button
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setFlag(def.key as Parameters<typeof flag>[0], !enabled)}
                  className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200 active:scale-95"
                  style={{
                    background: enabled
                      ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)'
                      : 'var(--surface-container-highest)',
                  }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm"
                    style={{ left: enabled ? '1.5rem' : '0.25rem' }}
                  />
                </button>
              </div>

              {/* Footer row */}
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--on-surface-variant)]">
                <Circle
                  className="w-2 h-2 flex-shrink-0"
                  fill={enabled ? '#2ca6a4' : 'currentColor'}
                  stroke="none"
                />
                <span>{enabled ? 'enabled' : 'disabled'}</span>
                <span className="opacity-40 mx-1">·</span>
                <span>default: {def.defaultValue ? 'on' : 'off'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="pt-4 flex items-center gap-2 text-[10px] text-[var(--on-surface-variant)] opacity-50">
        <Wrench className="w-3 h-3" />
        <span>Add flags to lib/feature-flags.ts · they appear here automatically.</span>
      </div>
    </div>
  )
}
