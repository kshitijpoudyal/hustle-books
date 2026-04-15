'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, LogOut, TrendingDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useProfile } from '@/lib/hooks/use-profile'
import { useRates } from '@/lib/hooks/use-rates'
import { calcDepreciationPerMile } from '@/lib/utils/calculations'
import {
  formatGasPrice,
  formatMpg,
  formatIrsRate,
  formatTaxRate,
  formatDepreciationRate,
} from '@/lib/utils/formatters'
import type { Profile } from '@/lib/types'

// ── Shared label style ────────────────────────────────────────────────────────
const labelCls = 'font-label text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest block mb-2'
const roundInput = 'w-full bg-[var(--surface-container-highest)] border-none rounded-full px-6 py-4 text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-container)] focus:outline-none'
const squircleInput = 'w-full bg-[var(--surface-container-highest)] border-none squircle py-3 px-5 text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none'

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="squircle bg-[var(--surface-container-low)] p-8 space-y-4">
          <div className="h-4 w-32 bg-[var(--surface-container-high)] rounded-full" />
          <div className="h-12 bg-[var(--surface-container-high)] rounded-full" />
          <div className="h-12 bg-[var(--surface-container-high)] rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ── Chapter header (desktop) ──────────────────────────────────────────────────
function ChapterHeader({ label }: { label: string }) {
  return (
    <div className="px-6 py-2 mb-6" style={{ backgroundColor: 'var(--surface-dim)' }}>
      <h3 className="text-2xl text-[var(--primary)]" style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
        {label}
      </h3>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const { profile, email, loading: profileLoading, updateProfile, signOut } = useProfile()
  const { activeSnapshot, loading: ratesLoading } = useRates()

  const [fullName, setFullName] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [vehicleMakeModel, setVehicleMakeModel] = useState('')
  const [vehicleOdometer, setVehicleOdometer] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [savingAll, setSavingAll] = useState(false)

  // Depreciation calculator
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salvageValue, setSalvageValue] = useState('')
  const [expectedMiles, setExpectedMiles] = useState('')
  // Slider versions (desktop)
  const [sliderPurchase, setSliderPurchase] = useState(42500)
  const [sliderMiles, setSliderMiles] = useState(150000)

  const loading = profileLoading || ratesLoading

  const hydrateFromProfile = useCallback((p: Profile) => {
    setFullName(p.full_name ?? '')
    const v = p.settings?.vehicle
    if (v) {
      setVehicleYear(v.year?.toString() ?? '')
      setVehicleMakeModel(v.make_model ?? '')
      setVehicleOdometer(v.current_odometer?.toString() ?? '')
    }
  }, [])

  useEffect(() => {
    if (profile) hydrateFromProfile(profile)
  }, [profile, hydrateFromProfile])

  async function handleSaveName() {
    if (!fullName.trim()) return
    setSavingName(true)
    const ok = await updateProfile({ full_name: fullName.trim() })
    setSavingName(false)
    if (ok) toast.success('Name updated')
  }

  async function handleSaveVehicle() {
    if (!profile) return
    setSavingVehicle(true)
    const ok = await updateProfile({
      settings: {
        ...profile.settings,
        vehicle: {
          ...profile.settings.vehicle,
          year: vehicleYear ? parseInt(vehicleYear) : null,
          make_model: vehicleMakeModel || null,
          current_odometer: vehicleOdometer ? parseFloat(vehicleOdometer) : null,
        },
      },
    })
    setSavingVehicle(false)
    if (ok) toast.success('Vehicle info saved')
  }

  async function handleCommitAll() {
    if (!profile) return
    setSavingAll(true)
    const nameOk = fullName.trim() ? await updateProfile({ full_name: fullName.trim() }) : true
    const vehicleOk = await updateProfile({
      settings: {
        ...profile.settings,
        vehicle: {
          ...profile.settings.vehicle,
          year: vehicleYear ? parseInt(vehicleYear) : null,
          make_model: vehicleMakeModel || null,
          current_odometer: vehicleOdometer ? parseFloat(vehicleOdometer) : null,
        },
      },
    })
    setSavingAll(false)
    if (nameOk && vehicleOk) toast.success('Settings saved')
  }

  // Depreciation calculator
  const deprResult = calcDepreciationPerMile(
    parseFloat(purchasePrice) || 0,
    parseFloat(salvageValue) || 0,
    parseFloat(expectedMiles) || 0,
  )
  const deprHasInput = parseFloat(purchasePrice) > 0 && parseFloat(expectedMiles) > 0

  const sliderDeprResult = calcDepreciationPerMile(sliderPurchase, 4000, sliderMiles)

  function handleUseDeprRate() {
    router.push(`/rates?depr=${deprResult.toFixed(3)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] pb-32">
        <div className="px-6 pt-8 pb-4">
          <h1 className="font-headline font-bold text-2xl text-[var(--primary)]">Settings</h1>
        </div>
        <div className="px-6 max-w-3xl mx-auto"><Skeleton /></div>
      </div>
    )
  }

  const initials = (profile?.full_name ?? email ?? 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-[var(--surface)]">

      {/* ══════════════════ MOBILE ══════════════════ */}
      <div className="lg:hidden pb-32">

        {/* Sticky AppBar */}
        <header
          className="sticky top-0 z-20 flex justify-between items-center px-6 py-4"
          style={{ backgroundColor: 'var(--surface)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <h1 className="font-headline font-black text-2xl tracking-tight text-[var(--primary)]">HustleBooks</h1>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-16">

          {/* Profile */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <h2 className="font-headline font-extrabold text-3xl tracking-tight text-[var(--primary)]">Profile</h2>
              <p className="text-[var(--on-surface-variant)] mt-2 font-body text-sm">Update your identity and contact details.</p>
            </div>
            <div className="md:col-span-8 bg-[var(--surface-container-low)] rounded-[1rem] p-8 space-y-6">
              <div className="space-y-2">
                <label className={labelCls}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onBlur={handleSaveName}
                  placeholder="Enter your name"
                  className={roundInput}
                />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Email Address</label>
                <input
                  type="email"
                  value={email ?? ''}
                  readOnly
                  className={`${roundInput} opacity-60 cursor-not-allowed`}
                />
              </div>
              <button
                onClick={handleSaveName}
                disabled={savingName || !fullName.trim()}
                className="w-full py-4 rounded-full text-white font-headline font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                {savingName ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </section>

          {/* Current Rates */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4">
              <h2 className="font-headline font-extrabold text-3xl tracking-tight text-[var(--primary)]">Current Rates</h2>
              <p className="text-[var(--on-surface-variant)] mt-2 font-body text-sm">Locked rates for tax and expense calculations.</p>
            </div>
            <div className="md:col-span-8">
              {activeSnapshot ? (
                <div
                  className="text-white rounded-[2rem] p-8 shadow-[0_24px_48px_-12px_rgba(2,36,72,0.25)] relative overflow-hidden"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                    <div className="space-y-1">
                      <span className="font-label uppercase tracking-widest text-[10px] text-white/60 block">Gas/Gal</span>
                      <span className="text-2xl font-black block">{formatGasPrice(activeSnapshot.gas_price)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-label uppercase tracking-widest text-[10px] text-white/60 block">Avg MPG</span>
                      <span className="text-2xl font-black block">{formatMpg(activeSnapshot.mpg)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-label uppercase tracking-widest text-[10px] text-white/60 block">IRS Rate</span>
                      <span className="text-2xl font-black block" style={{ color: 'var(--secondary-container)' }}>
                        {formatIrsRate(activeSnapshot.irs_rate)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-label uppercase tracking-widest text-[10px] text-white/60 block">Depreciation</span>
                      <div className="flex items-center gap-1">
                        {activeSnapshot.depreciation_per_mile === 0 && (
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" strokeWidth={1.5} />
                        )}
                        <span className="text-2xl font-black block">
                          {activeSnapshot.depreciation_per_mile === 0 ? '—' : formatDepreciationRate(activeSnapshot.depreciation_per_mile)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-8 pt-8 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div>
                      <span className="font-label uppercase tracking-widest text-[10px] text-white/60 block">Tax Liability</span>
                      <span className="text-4xl font-black">{formatTaxRate(activeSnapshot.tax_rate)}</span>
                    </div>
                    <button
                      onClick={() => router.push('/rates')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold text-white/80 hover:text-white transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    >
                      Manage Rates
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-white rounded-[2rem] p-8"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <p className="text-white/60 mb-4 font-label text-[10px] uppercase tracking-widest">No rates configured</p>
                  <button
                    onClick={() => router.push('/rates')}
                    className="px-5 py-2.5 rounded-full text-[var(--primary)] font-semibold bg-white text-sm hover:opacity-90"
                  >
                    Set up rates →
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Vehicle Info */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4">
              <h2 className="font-headline font-extrabold text-3xl tracking-tight text-[var(--primary)]">Vehicle Info</h2>
              <p className="text-[var(--on-surface-variant)] mt-2 font-body text-sm">Technical data of your primary asset.</p>
            </div>
            <div className="md:col-span-8 bg-[var(--surface-container-low)] rounded-[1rem] p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>Year</label>
                  <input
                    type="text"
                    placeholder="2022"
                    value={vehicleYear}
                    onChange={e => setVehicleYear(e.target.value)}
                    className={roundInput}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Make &amp; Model</label>
                  <input
                    type="text"
                    placeholder="Toyota Prius"
                    value={vehicleMakeModel}
                    onChange={e => setVehicleMakeModel(e.target.value)}
                    className={roundInput}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Current Odometer (MI)</label>
                <input
                  type="number"
                  placeholder="48500"
                  value={vehicleOdometer}
                  onChange={e => setVehicleOdometer(e.target.value)}
                  className={`${roundInput} font-mono text-xl tracking-tighter`}
                />
              </div>
              <button
                onClick={handleSaveVehicle}
                disabled={savingVehicle}
                className="w-full py-4 rounded-full text-white font-headline font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                {savingVehicle ? 'Saving…' : 'Save Vehicle Info'}
              </button>
            </div>
          </section>

          {/* Depreciation Calculator */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4">
              <h2 className="font-headline font-extrabold text-3xl tracking-tight text-[var(--primary)]">Depreciation</h2>
              <p className="text-[var(--on-surface-variant)] mt-2 font-body text-sm">Calculate the true cost of every mile driven.</p>
            </div>
            <div className="md:col-span-8 flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-[var(--surface-container-low)] rounded-[1rem] p-8 space-y-4">
                <div className="space-y-1">
                  <label className={labelCls}>Purchase Price</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="28500"
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(e.target.value)}
                    className={roundInput}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Salvage Value</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="4000"
                    value={salvageValue}
                    onChange={e => setSalvageValue(e.target.value)}
                    className={roundInput}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Expected Miles</label>
                  <input
                    type="number"
                    step="1000"
                    placeholder="200000"
                    value={expectedMiles}
                    onChange={e => setExpectedMiles(e.target.value)}
                    className={roundInput}
                  />
                </div>
              </div>

              {/* Result card */}
              <div
                className="w-full md:w-56 rounded-[2rem] p-8 flex flex-col justify-between items-center text-center shadow-[0_32px_64px_rgba(2,36,72,0.1)]"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                <span className="font-label uppercase tracking-widest text-[11px] text-white/60">Specimen Result</span>
                <div>
                  <span className="text-4xl font-black text-white block">
                    {deprHasInput ? `$${deprResult.toFixed(3)}` : '$0.000'}
                  </span>
                  <span className="font-label uppercase tracking-widest text-[10px] text-white/80">Per Mile</span>
                </div>
                <div className="w-full">
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, deprResult * 300)}%`,
                        backgroundColor: 'var(--secondary-container)',
                      }}
                    />
                  </div>
                  {deprHasInput && (
                    <button
                      onClick={handleUseDeprRate}
                      className="mt-4 w-full py-2 rounded-full font-label text-[9px] uppercase tracking-widest font-bold text-[var(--primary)] bg-white/90 hover:bg-white transition-colors"
                    >
                      Use this rate →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Sign Out */}
          <div className="flex justify-center pt-4">
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-12 py-5 rounded-full font-label uppercase tracking-[0.15rem] font-bold bg-[var(--surface-container-high)] text-[var(--primary)] hover:bg-[var(--error-container)] hover:text-[var(--on-error-container)] transition-all duration-300"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Sign Out
            </button>
          </div>
        </main>
      </div>

      {/* ══════════════════ DESKTOP ══════════════════ */}
      <div className="hidden lg:block">
        <main className="ml-64 pt-24 pb-20 px-12 max-w-7xl">
          <div className="grid grid-cols-12 gap-8">

            {/* Chapter I — Profile */}
            <section className="col-span-12">
              <ChapterHeader label="Chapter I. User Credentials" />
              <div className="bg-[var(--surface-container-low)] squircle p-8 flex flex-col md:flex-row gap-12 items-center">
                {/* Avatar */}
                <div className="w-32 h-32 rounded-full bg-[var(--surface-container-highest)] flex items-center justify-center flex-shrink-0">
                  <span className="font-headline font-black text-3xl text-[var(--primary)]">{initials}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 w-full">
                  <div className="space-y-2">
                    <label className={labelCls}>Full Legal Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your name"
                      className={squircleInput}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Communication Node (Email)</label>
                    <input
                      type="email"
                      value={email ?? ''}
                      readOnly
                      className={`${squircleInput} opacity-60 cursor-not-allowed`}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Chapter II — Financial Ratios */}
            <section className="col-span-12 lg:col-span-5">
              <ChapterHeader label="Chapter II. Financial Ratios" />
              {activeSnapshot ? (
                <div
                  className="text-white squircle p-8 shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
                >
                  <div className="flex justify-between items-start mb-10">
                    <span className="font-label text-[10px] uppercase tracking-widest opacity-60">Global Variable Card</span>
                    <TrendingDown className="w-5 h-5 text-[var(--secondary-container)]" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-6">
                    {[
                      { label: 'Gas Price', value: formatGasPrice(activeSnapshot.gas_price) },
                      { label: 'Avg MPG', value: formatMpg(activeSnapshot.mpg) },
                      { label: 'IRS Rate', value: formatIrsRate(activeSnapshot.irs_rate) },
                      {
                        label: 'Depreciation',
                        value: activeSnapshot.depreciation_per_mile === 0
                          ? 'Not set'
                          : formatDepreciationRate(activeSnapshot.depreciation_per_mile),
                      },
                    ].map((row, i, arr) => (
                      <div
                        key={row.label}
                        className={`flex justify-between items-center ${i < arr.length - 1 ? 'pb-4' : ''}`}
                        style={i < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.1)' } : {}}
                      >
                        <span className="font-label text-xs uppercase tracking-wider">{row.label}</span>
                        <span className="text-xl font-bold">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="mt-6 pt-6 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div>
                      <span className="font-label uppercase tracking-widest text-[10px] text-white/60 block">Tax Liability</span>
                      <span className="text-3xl font-black">{formatTaxRate(activeSnapshot.tax_rate)}</span>
                    </div>
                    <button
                      onClick={() => router.push('/rates')}
                      className="px-4 py-2 rounded-full font-label text-[9px] uppercase tracking-widest text-white/80 hover:text-white transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    >
                      Manage →
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="squircle p-8 text-white"
                  style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
                >
                  <p className="text-white/60 font-label text-[10px] uppercase tracking-widest mb-4">No rates configured</p>
                  <button
                    onClick={() => router.push('/rates')}
                    className="px-5 py-2.5 rounded-full bg-white text-[var(--primary)] font-semibold text-sm"
                  >
                    Set up rates →
                  </button>
                </div>
              )}
            </section>

            {/* Chapter III — Technical Inventory */}
            <section className="col-span-12 lg:col-span-7">
              <ChapterHeader label="Chapter III. Technical Inventory" />
              <div className="bg-[var(--surface-container-low)] squircle p-8 h-[calc(100%-4rem)] flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={labelCls}>Manufacturer</label>
                    <input
                      type="text"
                      placeholder="Toyota"
                      value={vehicleMakeModel.split(' ')[0] ?? vehicleMakeModel}
                      onChange={e => setVehicleMakeModel(e.target.value)}
                      className={squircleInput}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Year</label>
                    <input
                      type="text"
                      placeholder="2022"
                      value={vehicleYear}
                      onChange={e => setVehicleYear(e.target.value)}
                      className={squircleInput}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className={labelCls}>Archival Mileage (Odometer)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="48500"
                        value={vehicleOdometer}
                        onChange={e => setVehicleOdometer(e.target.value)}
                        className={`${squircleInput} font-mono text-lg tracking-widest pr-20`}
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-label text-[10px] text-[var(--on-surface-variant)]">
                        MILES
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className="mt-8 p-4 squircle flex items-center justify-between"
                  style={{ backgroundColor: 'var(--surface-container-high)', border: '1px solid rgba(2,36,72,0.05)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[var(--primary)] shadow-sm font-bold">
                      {vehicleYear ? vehicleYear.slice(-2) : '—'}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--primary)]">
                        {vehicleMakeModel || 'Vehicle not set'}
                      </p>
                      <p className="text-xs text-[var(--on-surface-variant)]">
                        {vehicleOdometer ? `${parseInt(vehicleOdometer).toLocaleString()} miles recorded` : 'Odometer not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Chapter IV — Depreciation Specimen */}
            <section className="col-span-12">
              <ChapterHeader label="Chapter IV. The Depreciation Specimen" />
              <div className="relative overflow-hidden bg-[var(--surface-container-low)] squircle p-10 group">
                {/* Glassmorphic overlay */}
                <div
                  className="absolute top-0 right-0 w-1/2 h-full -skew-x-12 translate-x-24 z-0"
                  style={{ backgroundColor: 'rgba(228,226,221,0.4)', backdropFilter: 'blur(8px)', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div>
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
                      style={{ backgroundColor: 'var(--secondary)', color: 'white' }}
                    >
                      <span className="font-label text-[10px] uppercase tracking-widest font-semibold">Live Calculation</span>
                    </div>
                    <h4 className="text-3xl font-bold text-[var(--primary)] leading-tight mb-4">
                      Precision Value Erosion Analyzer
                    </h4>
                    <p className="text-[var(--on-surface-variant)] leading-relaxed max-w-md mb-8">
                      Calculate the exact per-mile cost of ownership. Use the result in{' '}
                      <button onClick={() => router.push('/rates')} className="text-[var(--secondary)] font-semibold hover:underline">
                        Rate Snapshots
                      </button>{' '}
                      to apply it to future income entries.
                    </p>
                    <div className="space-y-8">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className={labelCls}>Expected Lifespan (Miles)</label>
                          <span className="font-mono text-[var(--primary)] font-bold text-sm">
                            {sliderMiles.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10000"
                          max="300000"
                          step="5000"
                          value={sliderMiles}
                          onChange={e => setSliderMiles(parseInt(e.target.value))}
                          className="w-full h-2 bg-[var(--surface-container-highest)] rounded-full appearance-none cursor-pointer accent-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className={labelCls}>Acquisition Cost ($)</label>
                          <span className="font-mono text-[var(--primary)] font-bold text-sm">
                            ${sliderPurchase.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5000"
                          max="150000"
                          step="1000"
                          value={sliderPurchase}
                          onChange={e => setSliderPurchase(parseInt(e.target.value))}
                          className="w-full h-2 bg-[var(--surface-container-highest)] rounded-full appearance-none cursor-pointer accent-[var(--primary)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Specimen output card */}
                  <div className="flex justify-center">
                    <div
                      className="w-72 h-96 bg-white squircle shadow-[0_32px_64px_-20px_rgba(2,36,72,0.1)] flex flex-col p-8 items-center text-center relative overflow-hidden"
                      style={{ border: '1px solid rgba(196,198,207,0.15)' }}
                    >
                      <div
                        className="absolute top-0 left-0 w-full h-1"
                        style={{ background: 'linear-gradient(to right, var(--primary), var(--secondary))' }}
                      />
                      <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50 mb-8">
                        Specimen ID: #HB-CALC
                      </span>
                      <div className="w-20 h-20 bg-[var(--surface-container-low)] rounded-full flex items-center justify-center mb-6">
                        <TrendingDown className="w-8 h-8 text-[var(--primary)]" strokeWidth={1.5} />
                      </div>
                      <p className="text-[var(--primary-container)] text-lg font-headline font-semibold italic mb-2">
                        Calculated Yield
                      </p>
                      <div className="my-2">
                        <span className="text-5xl font-black text-[var(--primary)] tracking-tighter">
                          {sliderDeprResult.toFixed(2)}
                        </span>
                        <p className="font-label text-[10px] uppercase tracking-[0.2rem] text-[var(--secondary)] mt-1">
                          USD per Mile
                        </p>
                      </div>
                      <div className="mt-auto w-full pt-4" style={{ borderTop: '1px solid var(--surface-container)' }}>
                        <button
                          onClick={() => router.push(`/rates?depr=${sliderDeprResult.toFixed(3)}`)}
                          className="text-[10px] font-label uppercase tracking-widest text-[var(--secondary)] hover:underline"
                        >
                          Use this rate →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Footer actions */}
          <footer className="mt-20 flex justify-end gap-4">
            <button
              onClick={signOut}
              className="px-8 py-3 rounded-full font-label text-xs uppercase tracking-widest text-[var(--primary)] hover:bg-[var(--error-container)] hover:text-[var(--on-error-container)] transition-colors flex items-center gap-2"
              style={{ backgroundColor: 'var(--surface-container-high)' }}
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              Sign Out
            </button>
            <button
              onClick={handleCommitAll}
              disabled={savingAll}
              className="px-8 py-3 rounded-full text-white font-label text-xs uppercase tracking-widest shadow-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
            >
              {savingAll ? 'Saving…' : 'Commit Changes'}
            </button>
          </footer>
        </main>

        {/* Decorative background */}
        <div
          className="fixed top-20 right-20 w-96 h-96 rounded-full blur-[120px] -z-10"
          style={{ backgroundColor: 'rgba(2,36,72,0.05)' }}
        />
      </div>
    </div>
  )
}
