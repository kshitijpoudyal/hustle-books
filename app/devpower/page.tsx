'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FLAG_REGISTRY, FeatureReleaseStage } from '@/lib/feature-flags'
import { useFeatureFlags } from '@/lib/context/feature-flags-context'
import { Terminal, Wrench, Circle, Ban } from 'lucide-react'

const STAGE_META: Record<FeatureReleaseStage, { label: string; color: string }> = {
  [FeatureReleaseStage.DISABLED]: { label: 'Disabled',    color: '#6b7280' },
  [FeatureReleaseStage.BETA]:     { label: 'Beta',        color: '#8b5cf6' },
  [FeatureReleaseStage.PRODUCTION]:{ label: 'Production', color: '#2ca6a4' },
}

export default function DevPowerPage() {
  const router = useRouter()
  const { flag, setFlag, visibleFlagKeys, keyToStage, userGroup, isInternal } = useFeatureFlags()

  useEffect(() => {
    if (userGroup && !isInternal) {
      router.replace('/')
    }
  }, [userGroup, isInternal, router])

  if (!isInternal) return null

  const toggleableFlags = FLAG_REGISTRY.filter(
    def =>
      def.releaseStage !== FeatureReleaseStage.DISABLED &&
      visibleFlagKeys.has(def.key)
  )
  const disabledFlags = FLAG_REGISTRY.filter(
    def => def.releaseStage === FeatureReleaseStage.DISABLED
  )

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto space-y-8 font-mono">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--primary)]">
          <Terminal className="w-5 h-5" strokeWidth={1.5} />
          <h1 className="text-xl font-bold tracking-tight">devpower</h1>
        </div>
        <p className="text-xs text-[var(--on-surface-variant)]">
          HustleBooks · feature flags · /devpower
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] text-[var(--on-surface-variant)] opacity-60">
            Toggle beta and production flags. Disabled flags are off for all users.
          </p>
          <span
            className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}
          >
            {userGroup}
          </span>
        </div>
      </div>

      <div className="h-px" style={{ background: 'var(--outline-variant)' }} />

      {/* Toggleable flags (beta + production) */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
          Flags · internal controls
        </p>
        {toggleableFlags.length === 0 && (
          <p className="text-xs text-[var(--on-surface-variant)] opacity-60">
            No flags available.
          </p>
        )}
        {toggleableFlags.map((def) => {
          const enabled = flag(def.key as Parameters<typeof flag>[0])
          const dbStage = (keyToStage[def.key] ?? def.releaseStage) as FeatureReleaseStage
          const stageMeta = STAGE_META[dbStage] ?? STAGE_META[FeatureReleaseStage.BETA]

          return (
            <div
              key={def.key}
              className="rounded-2xl p-4 space-y-3 transition-all"
              style={{
                backgroundColor: 'var(--surface-container-low)',
                outline: enabled ? '1px solid var(--primary)' : '1px solid transparent',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--on-surface)]">
                      {def.label}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: stageMeta.color + '22', color: stageMeta.color }}
                    >
                      {stageMeta.label}
                    </span>
                  </div>
                  <code className="text-[10px] text-[var(--on-surface-variant)]">
                    {def.key}
                  </code>
                  <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    {def.description}
                  </p>
                </div>

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

              <div className="flex items-center gap-1.5 text-[10px] text-[var(--on-surface-variant)]">
                <Circle
                  className="w-2 h-2 flex-shrink-0"
                  fill={enabled ? '#2ca6a4' : 'currentColor'}
                  stroke="none"
                />
                <span>{enabled ? 'enabled' : 'disabled'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Disabled flags — read-only */}
      {disabledFlags.length > 0 && (
        <div className="space-y-2">
          <div className="h-px" style={{ background: 'var(--outline-variant)', opacity: 0.4 }} />
          <p className="text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
            Disabled · off for all users
          </p>
          {disabledFlags.map((def) => {
            const stageMeta = STAGE_META[def.releaseStage]
            return (
              <div
                key={def.key}
                className="rounded-2xl p-4 space-y-3 opacity-50"
                style={{ backgroundColor: 'var(--surface-container-low)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[var(--on-surface)]">
                        {def.label}
                      </span>
                      <span
                        className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: stageMeta.color + '22', color: stageMeta.color }}
                      >
                        {stageMeta.label}
                      </span>
                    </div>
                    <code className="text-[10px] text-[var(--on-surface-variant)]">
                      {def.key}
                    </code>
                    <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                      {def.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5 text-[10px] text-[var(--on-surface-variant)]">
                    <Ban className="w-3 h-3" strokeWidth={1.5} />
                    <span className="uppercase tracking-widest">off</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--on-surface-variant)]">
                  <Circle className="w-2 h-2 flex-shrink-0" fill="currentColor" stroke="none" />
                  <span>disabled globally — set release_stage in DB to enable</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 flex items-center gap-2 text-[10px] text-[var(--on-surface-variant)] opacity-50">
        <Wrench className="w-3 h-3" />
        <span>Add flags to lib/feature-flags.ts · set release_stage in DB · disabled=off-for-all, beta=internal, production=all.</span>
      </div>
    </div>
  )
}
