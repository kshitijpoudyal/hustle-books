'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Search, X, Lock, FlaskConical, Globe, Copy, Check, Terminal } from 'lucide-react'
import { FLAG_REGISTRY, FeatureReleaseStage, type FlagDefinition } from '@/lib/feature-flags'
import { useFeatureFlags } from '@/lib/context/feature-flags-context'
import { formatDate } from '@/lib/utils/formatters'

// ── Stage presentation ─────────────────────────────────────────────────────

const STAGES: Record<FeatureReleaseStage, {
  label: string
  audience: string
  Icon: typeof Globe
  chip: React.CSSProperties
}> = {
  [FeatureReleaseStage.PRODUCTION]: {
    label: 'Production',
    audience: 'Live for every user. On by default; internal users can switch it off for themselves.',
    Icon: Globe,
    chip: { backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' },
  },
  [FeatureReleaseStage.BETA]: {
    label: 'Beta',
    audience: 'Internal users only. Off by default; switch it on to try it.',
    Icon: FlaskConical,
    chip: { backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' },
  },
  [FeatureReleaseStage.DISABLED]: {
    label: 'Disabled',
    audience: 'Off for everyone. Set release_stage in the database to bring it back.',
    Icon: Lock,
    chip: { backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' },
  },
}

const STAGE_ORDER = [FeatureReleaseStage.PRODUCTION, FeatureReleaseStage.BETA, FeatureReleaseStage.DISABLED]

type StageFilter = 'all' | FeatureReleaseStage
type SortKey = 'name' | 'newest' | 'on'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'A–Z' },
  { key: 'newest', label: 'Newest' },
  { key: 'on', label: 'On first' },
]

interface FlagRow extends FlagDefinition {
  /** Stage as the database sees it. Flags absent from the DB (or disabled there) resolve to DISABLED. */
  stage: FeatureReleaseStage
  enabled: boolean
  toggleable: boolean
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DevPowerPage() {
  const router = useRouter()
  const { flag, setFlag, visibleFlagKeys, keyToStage, userGroup, isInternal, flagsLoading } = useFeatureFlags()

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')
  const [sort, setSort] = useState<SortKey>('name')

  useEffect(() => {
    if (!flagsLoading && !isInternal) router.replace('/')
  }, [isInternal, flagsLoading, router])

  const rows = useMemo<FlagRow[]>(() =>
    FLAG_REGISTRY.map(def => {
      const stage = (keyToStage[def.key] as FeatureReleaseStage | undefined) ?? FeatureReleaseStage.DISABLED
      const toggleable = stage !== FeatureReleaseStage.DISABLED && visibleFlagKeys.has(def.key)
      return { ...def, stage, toggleable, enabled: toggleable && flag(def.key) }
    }),
    [flag, keyToStage, visibleFlagKeys],
  )

  const stageCounts = useMemo(() => {
    const c = { all: rows.length } as Record<StageFilter, number>
    for (const s of STAGE_ORDER) c[s] = rows.filter(r => r.stage === s).length
    return c
  }, [rows])

  const live = rows.filter(r => r.toggleable)
  const onCount = live.filter(r => r.enabled).length

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(r => stageFilter === 'all' || r.stage === stageFilter)
      .filter(r => !q || [r.label, r.key, r.description].some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === 'newest') return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
        if (sort === 'on' && a.enabled !== b.enabled) return a.enabled ? -1 : 1
        return a.label.localeCompare(b.label)
      })
  }, [rows, search, stageFilter, sort])

  if (flagsLoading) return <DevPowerSkeleton />
  if (!isInternal) return null

  const filtered = search.trim() !== '' || stageFilter !== 'all'

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-32 lg:pb-16">
      <main className="max-w-5xl mx-auto px-6 pt-6 lg:px-12 lg:pt-8 space-y-8">

        {/* ── Header ── */}
        <header className="space-y-5">
          <Link
            href="/settings"
            className="group inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-[0.1em] text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.5} />
            Settings
          </Link>
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.1em] text-[var(--secondary)] font-semibold">
              Internal · Feature flags
            </p>
            <h1 className="font-headline font-black text-4xl lg:text-5xl leading-[1.05] tracking-[-0.02em] text-[var(--primary)] mt-1">
              Dev Power Tools
            </h1>
            <p className="font-body text-sm text-[var(--on-surface-variant)] mt-2 max-w-md leading-relaxed">
              Switch features on or off for your own account. Changes save instantly and only affect you.
            </p>
          </div>
        </header>

        {/* ── Summary specimen ── */}
        <section
          className="relative overflow-hidden rounded-[2rem] p-6 lg:p-8 text-white shadow-[0_24px_48px_-12px_rgba(30,58,95,0.25)]"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
        >
          <Terminal aria-hidden className="absolute -right-6 -bottom-8 w-40 h-40 opacity-[0.07]" strokeWidth={1} />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.1em] text-white/60">Enabled for you</p>
              <p className="font-label font-bold tabular-nums text-5xl leading-none tracking-[-0.02em] mt-2">
                {onCount}
                <span className="text-xl font-semibold text-white/50 tracking-normal"> / {live.length}</span>
              </p>
              <p className="font-body text-xs text-white/70 mt-2">
                of the live flags · {stageCounts[FeatureReleaseStage.DISABLED]} disabled
              </p>
            </div>
            <span className="font-label text-[10px] uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-full bg-white/15">
              {userGroup}
            </span>
          </div>
          <div className="relative mt-6 h-1.5 rounded-full bg-white/15 overflow-hidden" aria-hidden>
            <div
              className="h-full rounded-full bg-[var(--secondary-container)] transition-[width] duration-500 ease-out"
              style={{ width: live.length ? `${(onCount / live.length) * 100}%` : '0%' }}
            />
          </div>
        </section>

        {/* ── Controls ── */}
        <section className="space-y-4">
          <label className="flex items-center gap-3 px-5 h-12 rounded-full bg-[var(--surface-container-low)] focus-within:bg-[var(--surface-container)] transition-colors">
            <Search className="w-4 h-4 flex-shrink-0 text-[var(--on-surface-variant)]" strokeWidth={1.5} />
            <span className="sr-only">Search flags</span>
            <input
              type="search"
              placeholder="Search name, key, or description"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-base lg:text-sm outline-none text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-60 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="w-7 h-7 -mr-2 rounded-full flex items-center justify-center bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] active:scale-90 transition-transform duration-100"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Stage filter — the counts double as the stage summary */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by stage">
              {(['all', ...STAGE_ORDER] as StageFilter[]).map(s => {
                const active = stageFilter === s
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStageFilter(s)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full font-label text-[10px] uppercase tracking-[0.08em] transition-[background-color,color,transform] duration-150 active:scale-95 ${
                      active
                        ? 'bg-[var(--primary)] text-[var(--on-primary)] font-bold'
                        : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]'
                    }`}
                  >
                    {s === 'all' ? 'All' : STAGES[s].label}
                    <span className={`tabular-nums ${active ? 'opacity-70' : 'opacity-50'}`}>{stageCounts[s]}</span>
                  </button>
                )
              })}
            </div>

            {/* Sort — segmented control */}
            <div className="inline-flex p-1 rounded-full bg-[var(--surface-container-low)]" role="group" aria-label="Sort">
              {SORTS.map(o => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={sort === o.key}
                  onClick={() => setSort(o.key)}
                  className={`h-7 px-3 rounded-full font-label text-[10px] uppercase tracking-[0.08em] transition-[background-color,color,box-shadow] duration-150 ${
                    sort === o.key
                      ? 'bg-[var(--surface-container-lowest)] text-[var(--primary)] font-bold shadow-[0_2px_8px_rgba(30,58,95,0.08)]'
                      : 'text-[var(--on-surface-variant)]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Flags ── */}
        {visible.length === 0 ? (
          <section className="rounded-[2rem] bg-[var(--surface-container-low)] py-16 px-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center">
              <Search className="w-5 h-5 text-[var(--on-surface-variant)]" strokeWidth={1.5} />
            </div>
            <p className="font-headline font-bold text-[var(--primary)] mt-4">No flags match</p>
            <p className="font-body text-sm text-[var(--on-surface-variant)] mt-1">
              {search ? <>Nothing matches &ldquo;{search}&rdquo;.</> : 'No flags are in this stage.'}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={() => { setSearch(''); setStageFilter('all') }}
                className="mt-5 h-10 px-5 rounded-full bg-[var(--surface-container-highest)] font-label text-[10px] uppercase tracking-[0.1em] font-bold text-[var(--primary)] active:scale-95 transition-transform duration-100"
              >
                Show all flags
              </button>
            )}
          </section>
        ) : (
          <section
            aria-label="Feature flags"
            className="grid gap-4 lg:grid-cols-2 lg:gap-6 lg:pb-10 lg:[&>*:nth-child(even)]:translate-y-10"
          >
            {visible.map(row => (
              <FlagCard key={row.key} row={row} onToggle={v => setFlag(row.key, v)} />
            ))}
          </section>
        )}

        {/* ── Stage legend ── */}
        <section className="rounded-[2rem] bg-[var(--surface-container-low)] p-6 lg:p-8">
          <h2 className="font-headline font-bold text-[var(--primary)]">How stages work</h2>
          <dl className="mt-4 space-y-4">
            {STAGE_ORDER.map(s => {
              const { label, audience, Icon, chip } = STAGES[s]
              return (
                <div key={s} className="flex items-start gap-3">
                  <dt className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={chip}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span className="sr-only">{label}</span>
                  </dt>
                  <dd className="font-body text-sm text-[var(--on-surface-variant)] leading-relaxed pt-0.5">
                    <span className="font-semibold text-[var(--on-surface)]">{label}.</span> {audience}
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className="font-label text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)] mt-6">
            New flags: add to lib/feature-flags.ts, then seed the feature_flags table
          </p>
        </section>

      </main>
    </div>
  )
}

// ── Flag card ──────────────────────────────────────────────────────────────

function FlagCard({ row, onToggle }: { row: FlagRow; onToggle: (value: boolean) => void }) {
  const { label, chip, Icon } = STAGES[row.stage]
  const [copied, setCopied] = useState(false)

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(row.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      toast.error('Couldn’t copy to clipboard')
    }
  }

  return (
    <article
      className={`rounded-[2rem] p-5 lg:p-6 flex flex-col gap-3 transition-[background-color,opacity] duration-300 shadow-[0_12px_32px_rgba(30,58,95,0.06)] ${
        row.toggleable ? '' : 'opacity-60'
      }`}
      style={{
        backgroundColor: row.enabled
          ? 'color-mix(in srgb, var(--secondary) 7%, var(--surface-container-lowest))'
          : 'var(--surface-container-lowest)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full font-label text-[9px] uppercase tracking-[0.08em] font-semibold"
          style={chip}
        >
          <Icon className="w-3 h-3" strokeWidth={1.5} />
          {label}
        </span>
        {row.createdAt && (
          <span className="font-label text-[10px] uppercase tracking-[0.05em] tabular-nums text-[var(--on-surface-variant)]">
            {formatDate(row.createdAt)}
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <h3 id={`flag-${row.key}`} className="font-headline font-bold text-base leading-snug text-[var(--on-surface)] pt-1">
          {row.label}
        </h3>
        {row.toggleable ? (
          <FlagSwitch checked={row.enabled} onChange={onToggle} labelledBy={`flag-${row.key}`} />
        ) : (
          <span className="flex-shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[var(--surface-container-high)] font-label text-[9px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
            <Lock className="w-3 h-3" strokeWidth={1.5} />
            Locked
          </span>
        )}
      </div>

      <p className="font-body text-sm leading-relaxed text-[var(--on-surface-variant)]">{row.description}</p>

      <button
        type="button"
        onClick={copyKey}
        aria-label={`Copy flag key ${row.key}`}
        className="mt-1 self-start inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] font-label text-[10px] tracking-[0.05em] text-[var(--on-surface-variant)] active:scale-95 transition-[background-color,transform] duration-100"
      >
        <span className="tabular-nums">{row.key}</span>
        {copied
          ? <Check className="w-3 h-3 text-[var(--secondary)]" strokeWidth={2} />
          : <Copy className="w-3 h-3 opacity-60" strokeWidth={1.5} />}
      </button>
    </article>
  )
}

// ── Switch ─────────────────────────────────────────────────────────────────

/** Track + thumb. The thumb stretches on press (instant feedback) and slides on release. */
function FlagSwitch({ checked, onChange, labelledBy }: {
  checked: boolean
  onChange: (value: boolean) => void
  labelledBy: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => { navigator.vibrate?.(8); onChange(!checked) }}
      className={`group relative flex-shrink-0 w-[52px] h-8 rounded-full p-[3px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--secondary)] ${
        checked ? 'bg-[var(--secondary)]' : 'bg-[var(--surface-container-highest)]'
      }`}
    >
      <span
        aria-hidden
        className={`block h-[26px] w-[26px] rounded-full bg-[var(--surface-container-lowest)] dark:bg-[var(--on-surface)] shadow-[0_2px_6px_rgba(30,58,95,0.2)] transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-active:w-8 ${
          checked ? 'translate-x-5 group-active:translate-x-[14px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function DevPowerSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--surface)] pb-32" aria-busy="true" aria-label="Loading feature flags">
      <div className="max-w-5xl mx-auto px-6 pt-6 lg:px-12 lg:pt-8 space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-2.5 w-16 rounded-full bg-[var(--surface-container-high)]" />
          <div className="h-2.5 w-28 rounded-full bg-[var(--surface-container-high)] mt-6" />
          <div className="h-10 w-64 rounded-full bg-[var(--surface-container-high)]" />
        </div>
        <div className="h-40 rounded-[2rem] bg-[var(--surface-container)]" />
        <div className="h-12 rounded-full bg-[var(--surface-container-low)]" />
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-[2rem] bg-[var(--surface-container-low)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
