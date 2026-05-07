'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FLAG_REGISTRY, FeatureReleaseStage } from '@/lib/feature-flags'
import { useFeatureFlags } from '@/lib/context/feature-flags-context'
import { Terminal, Zap, Lock, Search, ChevronUp, ChevronDown, ChevronsUpDown, FlaskConical, Globe, Ban } from 'lucide-react'

const STAGE_META: Record<FeatureReleaseStage, {
  label: string
  color: string
  bg: string
  icon: React.ReactNode
}> = {
  [FeatureReleaseStage.DISABLED]: {
    label: 'Disabled',
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.12)',
    icon: <Lock className="w-3 h-3" />,
  },
  [FeatureReleaseStage.BETA]: {
    label: 'Beta',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    icon: <FlaskConical className="w-3 h-3" />,
  },
  [FeatureReleaseStage.PRODUCTION]: {
    label: 'Production',
    color: '#2ca6a4',
    bg: 'rgba(44,166,164,0.12)',
    icon: <Globe className="w-3 h-3" />,
  },
}

type SortKey = 'label' | 'stage' | 'status' | 'createdAt'
type SortDir = 'asc' | 'desc'

function Toggle({ defKey, enabled, setFlag, flag }: {
  defKey: string
  enabled: boolean
  setFlag: (key: Parameters<ReturnType<typeof useFeatureFlags>['setFlag']>[0], val: boolean) => void
  flag: ReturnType<typeof useFeatureFlags>['flag']
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => setFlag(defKey as Parameters<typeof flag>[0], !enabled)}
      className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-300 active:scale-95 focus:outline-none"
      style={{
        background: enabled
          ? 'linear-gradient(135deg, #2ca6a4 0%, #1e8a88 100%)'
          : 'rgba(255,255,255,0.08)',
        boxShadow: enabled
          ? '0 0 12px rgba(44,166,164,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          : 'inset 0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      <span
        className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all duration-300 shadow-sm"
        style={{
          left: enabled ? 'calc(100% - 21px)' : '3px',
          background: enabled ? '#fff' : 'rgba(255,255,255,0.5)',
        }}
      />
    </button>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 opacity-25" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3" style={{ color: '#2ca6a4' }} />
    : <ChevronDown className="w-3 h-3" style={{ color: '#2ca6a4' }} />
}

export default function DevPowerPage() {
  const router = useRouter()
  const { flag, setFlag, visibleFlagKeys, keyToStage, userGroup, isInternal, flagsLoading } = useFeatureFlags()

  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('label')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    if (userGroup && !isInternal && !flagsLoading) router.replace('/')
  }, [userGroup, isInternal, flagsLoading, router])

  // All hooks must run before any conditional return
  const allFlags = useMemo(() =>
    FLAG_REGISTRY.map(def => ({
      ...def,
      dbStage:    (keyToStage[def.key] ?? def.releaseStage) as FeatureReleaseStage,
      enabled:    flag(def.key as Parameters<typeof flag>[0]),
      toggleable: def.releaseStage !== FeatureReleaseStage.DISABLED && visibleFlagKeys.has(def.key),
    })),
    [flag, keyToStage, visibleFlagKeys]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allFlags
      .filter(f =>
        !q ||
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'label')     cmp = a.label.localeCompare(b.label)
        if (sortKey === 'stage')     cmp = a.dbStage.localeCompare(b.dbStage)
        if (sortKey === 'status')    cmp = Number(a.enabled) - Number(b.enabled)
        if (sortKey === 'createdAt') cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [allFlags, search, sortKey, sortDir])

  const counts = useMemo(() => ({
    total:      allFlags.length,
    enabled:    allFlags.filter(f => f.enabled && f.releaseStage !== FeatureReleaseStage.DISABLED).length,
    beta:       allFlags.filter(f => f.releaseStage === FeatureReleaseStage.BETA).length,
    production: allFlags.filter(f => f.releaseStage === FeatureReleaseStage.PRODUCTION).length,
    disabled:   allFlags.filter(f => f.releaseStage === FeatureReleaseStage.DISABLED).length,
  }), [allFlags])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  // Loading skeleton while auth + flags resolve
  if (flagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-3">
          <Terminal className="w-6 h-6 animate-pulse" style={{ color: '#2ca6a4' }} />
          <p className="text-[10px] uppercase tracking-[0.15em] animate-pulse" style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-work-sans)' }}>
            Loading flags…
          </p>
        </div>
      </div>
    )
  }

  if (!isInternal) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>

      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #022448 0%, #0a3a6e 55%, #0d4a6e 100%)',
        }}
      >
        {/* grid bg */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8">
          {/* top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(44,166,164,0.2)',
                  border: '1px solid rgba(44,166,164,0.35)',
                  boxShadow: '0 0 16px rgba(44,166,164,0.2)',
                }}
              >
                <Terminal className="w-5 h-5" style={{ color: '#2ca6a4' }} />
              </div>
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight leading-none"
                  style={{ color: '#fff', fontFamily: 'var(--font-public-sans)' }}
                >
                  devpower
                </h1>
                <p
                  className="text-[11px] mt-0.5 uppercase tracking-[0.12em]"
                  style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-work-sans)' }}
                >
                  Feature Flag Control
                </p>
              </div>
            </div>

            <span
              className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold flex-shrink-0"
              style={{
                backgroundColor: 'rgba(245,158,11,0.18)',
                color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.3)',
                fontFamily: 'var(--font-work-sans)',
              }}
            >
              {userGroup}
            </span>
          </div>

          {/* stat chips */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            {[
              { label: `${counts.total} flags`,           color: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.7)' },
              { label: `${counts.enabled} on`,            color: 'rgba(44,166,164,0.2)',   text: '#2ca6a4' },
              { label: `${counts.beta} beta`,             color: 'rgba(167,139,250,0.2)',  text: '#a78bfa' },
              { label: `${counts.production} production`, color: 'rgba(44,166,164,0.15)',  text: '#5eead4' },
              { label: `${counts.disabled} disabled`,     color: 'rgba(156,163,175,0.15)', text: 'rgba(156,163,175,0.7)' },
            ].map(chip => (
              <span
                key={chip.label}
                className="text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: chip.color,
                  color: chip.text,
                  fontFamily: 'var(--font-work-sans)',
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            backgroundColor: 'var(--surface-container-low)',
            boxShadow: '0 2px 8px rgba(2,36,72,0.06)',
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} style={{ color: 'var(--on-surface-variant)' }} />
          <input
            type="text"
            placeholder="Search flags by name, key, or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
            style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-public-sans)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full transition-colors"
              style={{
                color: 'var(--on-surface-variant)',
                backgroundColor: 'var(--surface-container-highest)',
                fontFamily: 'var(--font-work-sans)',
              }}
            >
              clear
            </button>
          )}
        </div>

        {/* Result count */}
        <p
          className="text-[10px] uppercase tracking-[0.12em] px-1"
          style={{ color: 'var(--on-surface-variant)', opacity: 0.55, fontFamily: 'var(--font-work-sans)' }}
        >
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {search && ` for "${search}"`}
        </p>

        {/* ── Desktop Table (sm+) ── */}
        <div
          className="hidden sm:block rounded-3xl overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-container-low)',
            boxShadow: '0 4px 24px rgba(2,36,72,0.06)',
          }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)' }}>
                {([
                  { col: 'label'     as SortKey, label: 'Flag',        align: 'left',  cls: 'pl-6' },
                  { col: 'stage'     as SortKey, label: 'Stage',       align: 'left',  cls: '' },
                  { col: null,                   label: 'Description', align: 'left',  cls: '' },
                  { col: 'createdAt' as SortKey, label: 'Created',     align: 'left',  cls: '' },
                  { col: 'status'    as SortKey, label: 'Toggle',      align: 'right', cls: 'pr-6' },
                ] as const).map(({ col, label, align, cls }) => (
                  <th key={label} className={`py-3.5 px-3 ${cls}`} style={{ textAlign: align }}>
                    {col ? (
                      <button
                        onClick={() => handleSort(col)}
                        className="inline-flex items-center gap-1.5 transition-colors"
                        style={{
                          float: align === 'right' ? 'right' : undefined,
                          color: sortKey === col ? '#2ca6a4' : 'var(--on-surface-variant)',
                          fontFamily: 'var(--font-work-sans)',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {align === 'right' && <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />}
                        {label}
                        {align !== 'right' && <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />}
                      </button>
                    ) : (
                      <span
                        style={{
                          color: 'var(--on-surface-variant)',
                          fontFamily: 'var(--font-work-sans)',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {label}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-5 h-5 opacity-20" style={{ color: 'var(--on-surface-variant)' }} />
                      <span className="text-xs opacity-40" style={{ color: 'var(--on-surface-variant)' }}>
                        No flags match your search
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((def, i) => {
                const stageMeta  = STAGE_META[def.dbStage] ?? STAGE_META[FeatureReleaseStage.BETA]
                const isDisabled = def.releaseStage === FeatureReleaseStage.DISABLED
                const isLast     = i === filtered.length - 1
                return (
                  <tr
                    key={def.key}
                    className="group transition-colors"
                    style={{
                      borderBottom: isLast ? undefined : '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
                      opacity: isDisabled ? 0.4 : 1,
                      backgroundColor: def.enabled && !isDisabled
                        ? 'color-mix(in srgb, #2ca6a4 5%, transparent)'
                        : undefined,
                    }}
                  >
                    {/* Name + key */}
                    <td className="py-4 px-3 pl-6 w-48 align-top">
                      <div
                        className="font-semibold text-sm leading-tight"
                        style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-public-sans)' }}
                      >
                        {def.label}
                      </div>
                      <code
                        className="mt-1 block text-[9px] px-1.5 py-0.5 rounded-md w-fit"
                        style={{
                          color: '#2ca6a4',
                          backgroundColor: 'rgba(44,166,164,0.1)',
                          fontFamily: 'monospace',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {def.key}
                      </code>
                    </td>

                    {/* Stage */}
                    <td className="py-4 px-3 w-32 align-top">
                      <span
                        className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] px-2 py-1 rounded-full font-semibold"
                        style={{
                          backgroundColor: stageMeta.bg,
                          color: stageMeta.color,
                          fontFamily: 'var(--font-work-sans)',
                        }}
                      >
                        {stageMeta.icon}
                        {stageMeta.label}
                      </span>
                    </td>

                    {/* Description */}
                    <td
                      className="py-4 px-3 text-xs leading-relaxed align-top"
                      style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-public-sans)' }}
                    >
                      {def.description}
                    </td>

                    {/* Created */}
                    <td className="py-4 px-3 w-24 align-top">
                      {def.createdAt ? (
                        <span
                          className="text-[10px] tabular-nums"
                          style={{ color: 'var(--on-surface-variant)', opacity: 0.6, fontFamily: 'var(--font-work-sans)' }}
                        >
                          {def.createdAt}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--on-surface-variant)', opacity: 0.25, fontSize: '12px' }}>—</span>
                      )}
                    </td>

                    {/* Toggle */}
                    <td className="py-4 px-3 pr-6 text-right align-top">
                      {isDisabled ? (
                        <div
                          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest"
                          style={{ color: 'var(--on-surface-variant)', opacity: 0.4, fontFamily: 'var(--font-work-sans)' }}
                        >
                          <Ban className="w-3 h-3" strokeWidth={1.5} />
                          off
                        </div>
                      ) : (
                        <Toggle defKey={def.key} enabled={def.enabled} setFlag={setFlag} flag={flag} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards (< sm) ── */}
        <div className="sm:hidden space-y-2.5">
          {/* Sort pills */}
          <div className="flex items-center gap-1.5 flex-wrap pb-1">
            {([
              { key: 'label'     as SortKey, label: 'Name'    },
              { key: 'stage'     as SortKey, label: 'Stage'   },
              { key: 'status'    as SortKey, label: 'Status'  },
              { key: 'createdAt' as SortKey, label: 'Date'    },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: sortKey === key ? '#022448' : 'var(--surface-container-highest)',
                  color:           sortKey === key ? '#fff'    : 'var(--on-surface-variant)',
                  fontFamily: 'var(--font-work-sans)',
                }}
              >
                {label}
                {sortKey === key && (sortDir === 'asc'
                  ? <ChevronUp   className="w-2.5 h-2.5" />
                  : <ChevronDown className="w-2.5 h-2.5" />
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-14 text-center flex flex-col items-center gap-2">
              <Search className="w-5 h-5 opacity-20" style={{ color: 'var(--on-surface-variant)' }} />
              <p className="text-xs opacity-40" style={{ color: 'var(--on-surface-variant)' }}>
                No flags match your search
              </p>
            </div>
          )}

          {filtered.map(def => {
            const stageMeta  = STAGE_META[def.dbStage] ?? STAGE_META[FeatureReleaseStage.BETA]
            const isDisabled = def.releaseStage === FeatureReleaseStage.DISABLED
            return (
              <div
                key={def.key}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  backgroundColor: 'var(--surface-container-low)',
                  boxShadow: def.enabled && !isDisabled
                    ? '0 0 0 1.5px rgba(44,166,164,0.5), 0 4px 16px rgba(44,166,164,0.08)'
                    : '0 2px 8px rgba(2,36,72,0.04)',
                  opacity: isDisabled ? 0.45 : 1,
                }}
              >
                {/* accent bar */}
                <div
                  className="h-0.5 w-full"
                  style={{
                    background: def.enabled && !isDisabled
                      ? `linear-gradient(90deg, ${stageMeta.color} 0%, transparent 100%)`
                      : 'transparent',
                  }}
                />

                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-public-sans)' }}
                        >
                          {def.label}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: stageMeta.bg,
                            color: stageMeta.color,
                            fontFamily: 'var(--font-work-sans)',
                          }}
                        >
                          {stageMeta.icon}
                          {stageMeta.label}
                        </span>
                      </div>
                      <code
                        className="block text-[9px] px-1.5 py-0.5 rounded-md w-fit"
                        style={{
                          color: '#2ca6a4',
                          backgroundColor: 'rgba(44,166,164,0.1)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {def.key}
                      </code>
                    </div>

                    {isDisabled ? (
                      <div
                        className="flex items-center gap-1 text-[9px] uppercase tracking-widest px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: 'rgba(156,163,175,0.1)',
                          color: '#9ca3af',
                          fontFamily: 'var(--font-work-sans)',
                        }}
                      >
                        <Ban className="w-3 h-3" strokeWidth={1.5} />
                        off
                      </div>
                    ) : (
                      <Toggle defKey={def.key} enabled={def.enabled} setFlag={setFlag} flag={flag} />
                    )}
                  </div>

                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-public-sans)' }}
                  >
                    {def.description}
                  </p>

                  {def.createdAt && (
                    <p
                      className="text-[10px] tabular-nums opacity-45"
                      style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-work-sans)' }}
                    >
                      Added {def.createdAt}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-start gap-2 pt-2 pb-6"
          style={{ color: 'var(--on-surface-variant)', opacity: 0.35 }}
        >
          <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#2ca6a4' }} />
          <span
            className="text-[10px] leading-relaxed"
            style={{ fontFamily: 'var(--font-work-sans)' }}
          >
            Add flags in lib/feature-flags.ts · set release_stage in DB · disabled = all off · beta = internal only · production = all users
          </span>
        </div>

      </div>
    </div>
  )
}
