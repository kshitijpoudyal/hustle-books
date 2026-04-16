'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, Unlock, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useRates } from '@/lib/hooks/use-rates'
import type { RateSnapshotWithCount } from '@/lib/hooks/use-rates'
import { createClient } from '@/lib/supabase/client'
import {
  formatDate,
  formatGasPrice,
  formatMpg,
  formatIrsRate,
  formatTaxRate,
  formatDepreciationRate,
} from '@/lib/utils/formatters'

// ── helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface RateFormState {
  gas_price: string
  mpg: string
  irs_rate: string
  tax_rate: string
  depreciation_per_mile: string
  effective_date: string
  label: string
  notes: string
  is_locked: boolean
}

function emptyForm(): RateFormState {
  return {
    gas_price: '',
    mpg: '',
    irs_rate: '',
    tax_rate: '',
    depreciation_per_mile: '',
    effective_date: today(),
    label: '',
    notes: '',
    is_locked: false,
  }
}

function snapshotToForm(snap: RateSnapshotWithCount): RateFormState {
  return {
    gas_price: snap.gas_price.toString(),
    mpg: snap.mpg.toString(),
    irs_rate: snap.irs_rate.toString(),
    tax_rate: snap.tax_rate.toString(),
    depreciation_per_mile: snap.depreciation_per_mile.toString(),
    effective_date: snap.effective_date,
    label: snap.label ?? '',
    notes: snap.notes ?? '',
    is_locked: snap.is_locked,
  }
}

// ── sub-components ─────────────────────────────────────────────────────────

interface RateValueProps {
  label: string
  value: string
  amber?: boolean
}

function RateValue({ label, value, amber }: RateValueProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-xs text-[var(--on-surface-variant)]"
      >
        {label}
      </span>
      <span
        className="text-xl font-semibold tabular-nums leading-tight"
        style={{ color: amber ? 'var(--warning)' : 'var(--on-surface)' }}
      >
        {value}
      </span>
    </div>
  )
}

interface ActiveCardProps {
  snap: RateSnapshotWithCount
  onUpdateRates: () => void
  showForm: boolean
  onToggleLock: () => void
  pendingUnlock: boolean
  onConfirmUnlock: () => void
  onCancelUnlock: () => void
}

function ActiveCard({
  snap,
  onUpdateRates,
  showForm,
  onToggleLock,
  pendingUnlock,
  onConfirmUnlock,
  onCancelUnlock,
}: ActiveCardProps) {
  const isDeprecationUnset = snap.depreciation_per_mile === 0

  return (
    <div className="mx-4 lg:mx-6 rounded-xl p-5 border border-[var(--border)] bg-[var(--surface-container-lowest)] shadow-sm">
      {/* header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-[var(--on-surface-variant)]">Active Rates</p>
          {snap.label && (
            <p className="text-sm font-semibold text-[var(--on-surface)] mt-0.5">{snap.label}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {snap.is_locked && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}
            >
              <Lock className="w-2.5 h-2.5" strokeWidth={2} />
              Locked
            </span>
          )}
          <p className="text-xs text-[var(--on-surface-variant)] opacity-60">
            Eff. {formatDate(snap.effective_date, 'short')}
          </p>
        </div>
      </div>

      {/* rate values grid */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-4 mb-5">
        <RateValue label="Gas/gal" value={formatGasPrice(snap.gas_price)} />
        <RateValue label="MPG" value={formatMpg(snap.mpg)} />
        <RateValue label="IRS Rate" value={formatIrsRate(snap.irs_rate)} />
        <RateValue label="Tax %" value={formatTaxRate(snap.tax_rate)} />
        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-xs text-[var(--on-surface-variant)]">
            Depreciation/mi
          </span>
          {isDeprecationUnset ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--warning)' }} strokeWidth={2} />
              <span className="text-lg font-semibold" style={{ color: 'var(--warning)' }}>Not set</span>
              <span className="text-xs opacity-80" style={{ color: 'var(--warning)' }}>· Set in Settings → Calculator</span>
            </div>
          ) : (
            <span className="text-xl font-semibold tabular-nums text-[var(--on-surface)]">
              {formatDepreciationRate(snap.depreciation_per_mile)}
            </span>
          )}
        </div>
      </div>

      {/* action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onUpdateRates}
          disabled={snap.is_locked}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity active:scale-[0.98]"
          style={{
            backgroundColor: snap.is_locked ? 'var(--surface-container-high)' : 'var(--primary)',
            color: snap.is_locked ? 'var(--on-surface-variant)' : 'var(--on-primary)',
          }}
        >
          {showForm ? 'Close form' : 'Update rates'}
        </button>

        <button
          onClick={onToggleLock}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)] transition-all active:scale-[0.98]"
        >
          {snap.is_locked ? (
            <><Unlock className="w-3 h-3" strokeWidth={2} /> Unlock</>
          ) : (
            <><Lock className="w-3 h-3" strokeWidth={2} /> Lock</>
          )}
        </button>
      </div>

      {/* inline unlock confirmation */}
      {pendingUnlock && (
        <div className="mt-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10">
          <p className="text-xs text-[var(--on-surface)] mb-2">
            Unlocking allows editing. Existing entries won&apos;t be affected.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConfirmUnlock}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--warning)' }}
            >
              Confirm
            </button>
            <button
              onClick={onCancelUnlock}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface RateFormProps {
  form: RateFormState
  editingId: string | null
  saving: boolean
  onFieldChange: (field: keyof RateFormState, value: string | boolean) => void
  onSubmit: () => void
}

function RateForm({ form, editingId, saving, onFieldChange, onSubmit }: RateFormProps) {
  const inputClass =
    'w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] transition-shadow'

  return (
    <div className="mx-4 lg:mx-6 rounded-xl p-5 border border-[var(--border)] bg-[var(--surface-container-lowest)] shadow-sm">
      <p className="text-sm font-semibold text-[var(--on-surface)] mb-4">
        {editingId ? 'Edit Snapshot' : 'New Rate Snapshot'}
      </p>

      <div className="flex flex-col gap-4">
        {/* gas price */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            Gas Price / gal
          </p>
          <input
            type="number"
            step="0.001"
            placeholder="3.500"
            value={form.gas_price}
            onChange={e => onFieldChange('gas_price', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* mpg */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            Vehicle MPG
          </p>
          <input
            type="number"
            step="0.1"
            placeholder="25.0"
            value={form.mpg}
            onChange={e => onFieldChange('mpg', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* irs rate */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            IRS Mileage Rate $/mi
          </p>
          <input
            type="number"
            step="0.001"
            placeholder="0.670"
            value={form.irs_rate}
            onChange={e => onFieldChange('irs_rate', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* tax rate */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            Tax Set-Aside %
          </p>
          <input
            type="number"
            step="1"
            placeholder="25"
            value={form.tax_rate}
            onChange={e => onFieldChange('tax_rate', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* depreciation */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            Depreciation $/mi
          </p>
          <input
            type="number"
            step="0.001"
            placeholder="0.000"
            value={form.depreciation_per_mile}
            onChange={e => onFieldChange('depreciation_per_mile', e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-[var(--on-surface-variant)] opacity-60 mt-1">Not sure? Use the calculator in Settings.</p>
        </div>

        {/* effective date */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            Effective Date
          </p>
          <input
            type="date"
            value={form.effective_date}
            onChange={e => onFieldChange('effective_date', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* label */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            Label (optional)
          </p>
          <input
            type="text"
            placeholder="e.g. Q1 2026 rates"
            value={form.label}
            onChange={e => onFieldChange('label', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* notes */}
        <div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1.5">
            Notes (optional)
          </p>
          <input
            type="text"
            placeholder="Any additional notes"
            value={form.notes}
            onChange={e => onFieldChange('notes', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* lock toggle */}
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-medium text-[var(--on-surface)]">Lock immediately</p>
            <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">Prevents edits after saving</p>
          </div>
          <button
            type="button"
            onClick={() => onFieldChange('is_locked', !form.is_locked)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ backgroundColor: form.is_locked ? 'var(--primary)' : 'var(--surface-container-highest)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
              style={{ transform: form.is_locked ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* submit */}
        <button
          onClick={onSubmit}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-60 mt-1"
        >
          {saving ? 'Saving…' : 'Save Rates'}
        </button>

        <p className="text-xs text-center text-[var(--on-surface-variant)] opacity-60 px-2">
          If you already have a snapshot for this date, it will be updated (unless locked).
        </p>
      </div>
    </div>
  )
}

interface SnapshotRowProps {
  snap: RateSnapshotWithCount
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}

function SnapshotRow({ snap, expanded, onToggle, onEdit, onDelete, deleting }: SnapshotRowProps) {
  const canEdit = !snap.is_locked && snap.linked_entry_count === 0
  const canDelete = snap.linked_entry_count === 0

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-container-lowest)]">
      {/* collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[var(--surface-container-low)]"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--on-surface-variant)]">
            {formatDate(snap.effective_date, 'medium')}
          </p>
          {snap.label && (
            <p className="text-sm font-medium text-[var(--on-surface)] truncate mt-0.5">
              {snap.label}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {snap.linked_entry_count > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]">
              {snap.linked_entry_count} entries
            </span>
          )}
          {snap.is_locked && (
            <Lock className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} strokeWidth={2} />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--on-surface-variant)] opacity-50" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--on-surface-variant)] opacity-50" strokeWidth={1.5} />
          )}
        </div>
      </button>

      {/* expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)]">
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 pt-4 mb-4">
            <RateValue label="Gas/gal" value={formatGasPrice(snap.gas_price)} />
            <RateValue label="MPG" value={formatMpg(snap.mpg)} />
            <RateValue label="IRS Rate" value={formatIrsRate(snap.irs_rate)} />
            <RateValue label="Tax %" value={formatTaxRate(snap.tax_rate)} />
            <RateValue
              label="Depr/mi"
              value={formatDepreciationRate(snap.depreciation_per_mile)}
              amber={snap.depreciation_per_mile === 0}
            />
          </div>

          {snap.notes && (
            <p className="text-xs text-[var(--on-surface-variant)] mb-4 px-0.5">
              {snap.notes}
            </p>
          )}

          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] transition-all active:scale-[0.98]"
              >
                Edit
              </button>
            )}
            <button
              onClick={canDelete ? onDelete : undefined}
              disabled={!canDelete || deleting}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-40"
              style={
                canDelete
                  ? { backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--expense)' }
                  : { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }
              }
              title={!canDelete ? `${snap.linked_entry_count} entries use these rates` : undefined}
            >
              {deleting ? 'Deleting…' : canDelete ? 'Delete' : `${snap.linked_entry_count} entries`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── loading skeleton ────────────────────────────────────────────────────────

function RatesSkeleton() {
  return (
    <div className="px-4 lg:px-6 animate-pulse">
      <div className="rounded-xl p-5 mb-4 border border-[var(--border)] bg-[var(--surface-container-lowest)]">
        <div className="h-3.5 w-28 rounded bg-[var(--surface-container-high)] mb-4" />
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-12 rounded bg-[var(--surface-container-high)]" />
              <div className="h-6 w-16 rounded bg-[var(--surface-container-high)]" />
            </div>
          ))}
        </div>
        <div className="h-10 rounded-lg bg-[var(--surface-container-high)]" />
      </div>
    </div>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

function RatesPageInner() {
  const { snapshots, activeSnapshot, loading, createSnapshot, updateSnapshot, deleteSnapshot, toggleLock } = useRates()
  const searchParams = useSearchParams()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<RateFormState>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingUnlock, setPendingUnlock] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mileageEntryCount, setMileageEntryCount] = useState(0)
  const [applying, setApplying] = useState(false)

  const formRef = useRef<HTMLDivElement>(null)

  // Count all income entries with mileage
  useEffect(() => {
    if (loading) return
    const supabase = createClient()
    supabase
      .from('income')
      .select('id', { count: 'exact', head: true })
      .gt('mileage', 0)
      .then(({ count }) => setMileageEntryCount(count ?? 0))
  }, [loading])

  async function handleHistoricalApply(snapshotId: string, method: 'actual' | 'irs') {
    const snap = snapshots.find(s => s.id === snapshotId)
    if (!snap) return
    setApplying(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('income')
      .select('id, mileage')
      .gt('mileage', 0)

    if (error || !data) {
      toast.error(error?.message ?? 'Failed to fetch entries')
      setApplying(false)
      return
    }

    const updates = data.map(row => {
      const miles = Number(row.mileage)
      const fuelCost = method === 'irs'
        ? miles * snap.irs_rate
        : (miles / snap.mpg) * snap.gas_price
      const deprCost = miles * snap.depreciation_per_mile
      return supabase
        .from('income')
        .update({ fuel_cost_at_log: fuelCost, depreciation_cost_at_log: deprCost, rate_snapshot_id: snap.id })
        .eq('id', row.id)
    })

    const results = await Promise.all(updates)
    const failed = results.filter(r => r.error).length
    setApplying(false)

    if (failed > 0) {
      toast.error(`${failed} entries failed to update`)
    } else {
      toast.success(`Updated ${data.length} ${data.length === 1 ? 'entry' : 'entries'}`)
    }
  }

  // Handle ?depr= query param from Settings depreciation calculator
  useEffect(() => {
    const depr = searchParams.get('depr')
    if (depr) {
      setForm(prev => ({ ...prev, depreciation_per_mile: depr }))
      setShowForm(true)
    }
  }, [searchParams])

  function handleFieldChange(field: keyof RateFormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleUpdateRatesClick() {
    if (!showForm) {
      // pre-fill from active snapshot if no edit in progress
      if (!editingId && activeSnapshot) {
        setForm(snapshotToForm(activeSnapshot))
        // set date to today for a new snapshot
        setForm(prev => ({ ...prev, effective_date: today(), label: '', notes: '', is_locked: false }))
      }
    }
    setShowForm(prev => !prev)
    // scroll to form
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function handleEditSnapshot(snap: RateSnapshotWithCount) {
    setEditingId(snap.id)
    setForm(snapshotToForm(snap))
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function handleSubmit() {
    const gasPrice = parseFloat(form.gas_price)
    const mpg = parseFloat(form.mpg)
    const irsRate = parseFloat(form.irs_rate)
    const taxRate = parseFloat(form.tax_rate)
    const deprPerMile = parseFloat(form.depreciation_per_mile || '0')

    if (isNaN(gasPrice) || gasPrice <= 0) { toast.error('Enter a valid gas price'); return }
    if (isNaN(mpg) || mpg <= 0) { toast.error('Enter a valid MPG'); return }
    if (isNaN(irsRate) || irsRate <= 0) { toast.error('Enter a valid IRS rate'); return }
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) { toast.error('Tax rate must be 0–100'); return }

    setSaving(true)

    const payload = {
      gas_price: gasPrice,
      mpg,
      irs_rate: irsRate,
      tax_rate: taxRate,
      depreciation_per_mile: isNaN(deprPerMile) ? 0 : deprPerMile,
      effective_date: form.effective_date,
      label: form.label || null,
      notes: form.notes || null,
      is_locked: form.is_locked,
    }

    let success = false
    if (editingId) {
      success = await updateSnapshot(editingId, payload)
    } else {
      success = await createSnapshot(payload)
    }

    setSaving(false)
    if (success) {
      toast.success('Rates saved')
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm())
    }
  }

  function handleToggleLockClick() {
    if (!activeSnapshot) return
    if (activeSnapshot.is_locked) {
      // show inline confirmation before unlocking
      setPendingUnlock(true)
    } else {
      toggleLock(activeSnapshot.id, true)
      toast.success('Snapshot locked')
    }
  }

  async function handleConfirmUnlock() {
    if (!activeSnapshot) return
    await toggleLock(activeSnapshot.id, false)
    toast.success('Snapshot unlocked')
    setPendingUnlock(false)
  }

  async function handleDeleteSnapshot(snap: RateSnapshotWithCount) {
    setDeletingId(snap.id)
    await deleteSnapshot(snap.id)
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24 max-w-3xl mx-auto">

      {/* ── header ── */}
      <div className="px-4 lg:px-6 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-[var(--on-surface)]">Rates</h1>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Manage your cost rates &amp; snapshots
        </p>
      </div>

      {/* ── loading ── */}
      {loading && <RatesSkeleton />}

      {/* ── no snapshots empty state ── */}
      {!loading && snapshots.length === 0 && (
        <div className="mx-4 lg:mx-6 rounded-xl p-8 text-center border border-[var(--border)] bg-[var(--surface-container-lowest)]">
          <p className="text-sm font-semibold text-[var(--on-surface)] mb-1">No rates yet</p>
          <p className="text-xs text-[var(--on-surface-variant)] mb-5">
            Add your first rate snapshot to start tracking real costs
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 transition-opacity"
          >
            Add Rates
          </button>
        </div>
      )}

      {/* ── active card ── */}
      {!loading && activeSnapshot && (
        <ActiveCard
          snap={activeSnapshot}
          onUpdateRates={handleUpdateRatesClick}
          showForm={showForm}
          onToggleLock={handleToggleLockClick}
          pendingUnlock={pendingUnlock}
          onConfirmUnlock={handleConfirmUnlock}
          onCancelUnlock={() => setPendingUnlock(false)}
        />
      )}

      {/* ── create/edit form ── */}
      {showForm && (
        <div ref={formRef} className="mt-4">
          <RateForm
            form={form}
            editingId={editingId}
            saving={saving}
            onFieldChange={handleFieldChange}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {/* ── rate history ── */}
      {!loading && snapshots.length > 0 && (
        <div className="mt-8 px-4 lg:px-6">
          <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-3">Rate History</p>
          <div className="flex flex-col gap-2">
            {snapshots.map(snap => (
              <SnapshotRow
                key={snap.id}
                snap={snap}
                expanded={expandedId === snap.id}
                onToggle={() => setExpandedId(expandedId === snap.id ? null : snap.id)}
                onEdit={() => handleEditSnapshot(snap)}
                onDelete={() => handleDeleteSnapshot(snap)}
                deleting={deletingId === snap.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RatesPage() {
  return (
    <Suspense>
      <RatesPageInner />
    </Suspense>
  )
}
