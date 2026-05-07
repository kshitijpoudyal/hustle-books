'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, ArrowLeft, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { createHustle } from '@/lib/services/hustles'
import { HUSTLE_COLORS, HUSTLE_ICONS } from '@/lib/utils/constants'
import { HUSTLE_ICON_MAP } from '@/lib/utils/hustle-icons'

type Step = 1 | 2 | 3

interface OnboardingWizardProps {
  onComplete: () => void
}

function StepDots({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2, 3] as Step[]).map(s => (
        <div
          key={s}
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: s === current ? '1.5rem' : '0.5rem',
            background: s <= current ? 'var(--primary)' : 'var(--surface-container-high)',
          }}
        />
      ))}
    </div>
  )
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)

  // Step 1 state
  const [hustleName, setHustleName] = useState('')
  const [hustleColor, setHustleColor] = useState<string>(HUSTLE_COLORS[0])
  const [hustleIcon, setHustleIcon] = useState<string>(HUSTLE_ICONS[0])

  // Step 2 state
  const [gasPrice, setGasPrice] = useState('3.89')
  const [mpg, setMpg] = useState('30')
  const [taxRate, setTaxRate] = useState('25')

  async function submitHustle() {
    if (!hustleName.trim()) return
    setSaving(true)
    const result = await createHustle({ name: hustleName.trim(), color: hustleColor, icon: hustleIcon })
    setSaving(false)
    if (!result.ok) { toast.error(result.error); return }
    setStep(2)
  }

  async function submitRates() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: snap } = await supabase
        .from('rate_snapshots')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (snap) {
        await supabase
          .from('rate_snapshots')
          .update({
            gas_price: parseFloat(gasPrice) || 3.89,
            mpg: parseFloat(mpg) || 30,
            tax_rate: parseFloat(taxRate) || 25,
          })
          .eq('id', snap.id)
      }
    }
    setSaving(false)
    setStep(3)
  }

  const inputCls = 'w-full bg-[var(--surface-container-low)] squircle px-4 py-3 font-headline text-[var(--on-surface)] border-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none'
  const labelCls = 'font-label text-[10px] uppercase tracking-widest block mb-2'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'color-mix(in srgb, var(--primary) 18%, transparent)', backdropFilter: 'blur(8px)' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className="squircle w-full max-w-md p-8 relative overflow-y-auto"
          style={{ background: 'var(--surface-container-lowest)', maxHeight: '92vh' }}
        >
          {/* Skip button */}
          <button
            onClick={onComplete}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
            aria-label="Skip setup"
          >
            <X size={14} strokeWidth={1.5} />
          </button>

          {/* ── Step 1: Create Hustle ──────────────────────────────────────── */}
          {step === 1 && (
            <>
              <p className="font-label text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--secondary)' }}>
                Step 1 of 3
              </p>
              <h2 className="font-headline font-black text-2xl mb-1.5" style={{ color: 'var(--primary)' }}>
                Create Your First Hustle
              </h2>
              <p className="font-body text-sm mb-6" style={{ color: 'var(--on-surface-variant)' }}>
                Give your side hustle a name so you can track income and expenses separately.
              </p>

              <StepDots current={1} />

              {/* Name */}
              <div className="mb-5">
                <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Hustle Name</label>
                <input
                  type="text"
                  placeholder="e.g. DoorDash, Photography, eBay…"
                  value={hustleName}
                  onChange={e => setHustleName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitHustle()}
                  className={inputCls}
                  autoFocus
                />
              </div>

              {/* Color */}
              <div className="mb-5">
                <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {HUSTLE_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHustleColor(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{
                        background: c,
                        outline: hustleColor === c ? '3px solid var(--primary)' : undefined,
                        outlineOffset: '2px',
                      }}
                      aria-label={`Color ${c}`}
                    >
                      {hustleColor === c && <Check size={12} strokeWidth={2.5} style={{ color: 'white' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div className="mb-8">
                <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {HUSTLE_ICONS.map(name => {
                    const Icon = HUSTLE_ICON_MAP[name as keyof typeof HUSTLE_ICON_MAP]
                    const selected = hustleIcon === name
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setHustleIcon(name)}
                        className="aspect-square rounded-2xl flex items-center justify-center transition-all"
                        style={{
                          background: selected ? hustleColor : 'var(--surface-container-low)',
                          color: selected ? 'white' : 'var(--on-surface-variant)',
                        }}
                        aria-label={name}
                      >
                        <Icon size={18} strokeWidth={1.5} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={submitHustle}
                disabled={!hustleName.trim() || saving}
                className="w-full py-4 squircle text-white font-headline font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                {saving
                  ? <Loader2 size={18} className="animate-spin" />
                  : <><span>Create &amp; Continue</span><ArrowRight size={18} /></>}
              </button>
            </>
          )}

          {/* ── Step 2: Set Rates ─────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <p className="font-label text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--secondary)' }}>
                Step 2 of 3
              </p>
              <h2 className="font-headline font-black text-2xl mb-1.5" style={{ color: 'var(--primary)' }}>
                Set Your Rates
              </h2>
              <p className="font-body text-sm mb-6" style={{ color: 'var(--on-surface-variant)' }}>
                Used to calculate fuel costs and estimated taxes. You can update these anytime in Settings.
              </p>

              <StepDots current={2} />

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Gas Price ($/gal)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={gasPrice}
                      onChange={e => setGasPrice(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Vehicle MPG</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="1"
                      value={mpg}
                      onChange={e => setMpg(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Estimated Tax Rate (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="1"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className={inputCls}
                  />
                  <p className="font-label text-[9px] mt-2 uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)', opacity: 0.55 }}>
                    Self-employment tax is typically 25–30%. This is an estimate only.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}
                  aria-label="Back"
                >
                  <ArrowLeft size={18} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={submitRates}
                  disabled={saving}
                  className="flex-1 py-4 squircle text-white font-headline font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
                  style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
                >
                  {saving
                    ? <Loader2 size={18} className="animate-spin" />
                    : <><span>Save &amp; Continue</span><ArrowRight size={18} /></>}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full mt-3 py-2 font-label text-[10px] uppercase tracking-widest text-center transition-opacity hover:opacity-70"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Skip for now
              </button>
            </>
          )}

          {/* ── Step 3: Done ──────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <StepDots current={3} />

              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'var(--secondary-container)' }}
                >
                  <Check size={28} strokeWidth={2} style={{ color: 'var(--secondary)' }} />
                </div>
                <h2 className="font-headline font-black text-2xl mb-2" style={{ color: 'var(--primary)' }}>
                  You&apos;re all set!
                </h2>
                <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                  Your hustle is ready. Log your first income entry to start tracking your earnings.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { onComplete(); router.push('/log') }}
                  className="w-full py-4 squircle text-white font-headline font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
                >
                  Log First Entry <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={onComplete}
                  className="w-full py-4 squircle font-headline font-bold text-base transition-opacity hover:opacity-80"
                  style={{ background: 'var(--surface-container-low)', color: 'var(--primary)' }}
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
