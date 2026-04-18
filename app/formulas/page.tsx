'use client'

import { Sigma, TrendingUp, Building2, Fuel, Route, Car } from 'lucide-react'
import { useUserSettings } from '@/lib/context/user-settings-context'

interface FormulaRowProps {
  symbol: string
  label: string
  description: string
  tone?: 'income' | 'expense' | 'neutral'
}

function FormulaRow({ symbol, label, description, tone = 'neutral' }: FormulaRowProps) {
  const color =
    tone === 'income' ? 'var(--secondary)' :
    tone === 'expense' ? 'var(--expense)' :
    'var(--on-surface-variant)'

  return (
    <div className="flex items-start gap-4">
      <span
        className="font-headline font-black text-xl w-6 flex-shrink-0 leading-tight mt-0.5"
        style={{ color }}
      >
        {symbol}
      </span>
      <div>
        <p className="font-headline font-bold text-sm text-[var(--on-surface)]">{label}</p>
        <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  )
}

interface FormulaCardProps {
  icon: React.ElementType
  title: string
  formula: string
  children: React.ReactNode
  accent?: boolean
}

function FormulaCard({ icon: Icon, title, formula, children, accent }: FormulaCardProps) {
  return (
    <section
      className="squircle p-6 lg:p-8 space-y-6"
      style={{ backgroundColor: accent ? 'var(--primary)' : 'var(--surface-container-low)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accent ? 'rgba(255,255,255,0.15)' : 'var(--surface-container-high)' }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: accent ? 'white' : 'var(--primary)' }}
            strokeWidth={1.5}
          />
        </div>
        <h3
          className="font-headline font-bold text-lg"
          style={{ color: accent ? 'white' : 'var(--primary)' }}
        >
          {title}
        </h3>
      </div>

      <div
        className="rounded-2xl px-5 py-4"
        style={{ backgroundColor: accent ? 'rgba(255,255,255,0.10)' : 'var(--surface-container)' }}
      >
        <p
          className="font-headline font-black text-base lg:text-lg tracking-tight"
          style={{ color: accent ? 'white' : 'var(--primary)' }}
        >
          {formula}
        </p>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  )
}

function Divider({ accent }: { accent?: boolean }) {
  return (
    <div
      className="h-px"
      style={{ backgroundColor: accent ? 'rgba(255,255,255,0.12)' : 'var(--surface-container-high)' }}
    />
  )
}

export default function FormulasPage() {
  const { includeDeprInProfit, includeTaxInProfit } = useUserSettings()

  // Build dynamic formula string based on active settings
  const netProfitFormula = [
    'Income',
    '− Expenses',
    includeTaxInProfit ? '− Tax Reserve' : null,
    '− COGS',
    includeDeprInProfit ? '− Depreciation' : null,
  ].filter(Boolean).join(' ')

  return (
    <div className="min-h-screen bg-[var(--background)]">

      {/* ── Mobile ─────────────────────────────────────────────────────────── */}
      <div className="lg:hidden pb-32 px-6 mt-4 space-y-6">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--surface-container-high)] flex items-center justify-center">
            <Sigma className="w-5 h-5 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-headline font-black text-2xl text-[var(--primary)] tracking-tight">Formulas</h1>
            <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">How your numbers are calculated</p>
          </div>
        </div>

        <FormulaCard icon={TrendingUp} title="Net Profit" formula={netProfitFormula} accent>
          <FormulaRow symbol="+" label="Income" description="Total revenue logged across all income entries." tone="income" />
          <Divider accent />
          <FormulaRow symbol="−" label="Expenses" description="Logged business expenses (fuel, fees, supplies, etc.)." tone="expense" />
          {includeTaxInProfit && (
            <>
              <Divider accent />
              <FormulaRow symbol="−" label="Tax Reserve" description="Taxable income × your SE tax rate. Set aside, not sent." tone="expense" />
            </>
          )}
          <Divider accent />
          <FormulaRow symbol="−" label="COGS" description="Cost of goods sold — what you paid for items you resold." tone="expense" />
          {includeDeprInProfit && (
            <>
              <Divider accent />
              <FormulaRow symbol="−" label="Depreciation" description="Vehicle wear baked in at log time (miles × $/mile). Optional." tone="expense" />
            </>
          )}
          {(!includeTaxInProfit || !includeDeprInProfit) && (
            <p className="font-body text-xs text-white/60 leading-relaxed pt-1">
              {[
                !includeTaxInProfit ? 'Tax reserve' : null,
                !includeDeprInProfit ? 'Depreciation' : null,
              ].filter(Boolean).join(' and ')} excluded per your Settings.
            </p>
          )}
        </FormulaCard>

        <FormulaCard icon={Building2} title="Tax Reserve" formula="Taxable Income × Tax Rate">
          <FormulaRow symbol="×" label="Taxable Income" description="Only income entries marked 'Is Taxable'. Non-taxable entries are excluded." />
          <Divider />
          <FormulaRow symbol="×" label="Tax Rate" description="Your self-employment tax rate from your rate snapshot (e.g. 25%)." />
          <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
            This is money to <span className="font-semibold text-[var(--on-surface)]">set aside</span>, not an expense you log.{' '}
            {includeTaxInProfit ? 'It reduces net profit to show what\'s truly yours to keep.' : 'Currently excluded from net profit — toggle in Settings → Profit.'}
          </p>
        </FormulaCard>

        <FormulaCard icon={Fuel} title="Fuel Cost (Actual Method)" formula="(Miles ÷ MPG) × Gas Price">
          <FormulaRow symbol="÷" label="Miles ÷ MPG" description="How many gallons the trip consumed based on your vehicle's fuel efficiency." />
          <Divider />
          <FormulaRow symbol="×" label="Gas Price" description="Price per gallon at the time of the entry, from your rate snapshot." />
          <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
            Locked in at log time. Changing rates later never affects past entries.
          </p>
        </FormulaCard>

        <FormulaCard icon={Fuel} title="Fuel Cost (IRS Standard)" formula="Miles × IRS Mileage Rate">
          <FormulaRow symbol="×" label="Miles" description="Business miles driven for the trip." />
          <Divider />
          <FormulaRow symbol="×" label="IRS Rate" description="The IRS standard mileage rate from your rate snapshot (e.g. $0.67/mile)." />
          <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
            Bundles fuel, wear, and maintenance into one rate. Choose your method in Settings.
          </p>
        </FormulaCard>

        <FormulaCard icon={Route} title="Depreciation per Trip" formula="Miles × Depreciation per Mile">
          <FormulaRow symbol="×" label="Miles" description="Business miles driven for the trip." />
          <Divider />
          <FormulaRow symbol="×" label="Depreciation per Mile" description="Your vehicle's wear rate in $/mile, set in your rate snapshot." />
          <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
            {includeDeprInProfit ? 'Subtracted from net profit.' : 'Currently excluded from net profit — toggle in Settings → Profit.'}{' '}
            Zero by default — use the depreciation calculator in Settings to estimate your rate.
          </p>
        </FormulaCard>

        <FormulaCard icon={Car} title="Depreciation per Mile (Helper)" formula="(Purchase Price − Salvage Value) ÷ Expected Total Miles">
          <FormulaRow symbol="−" label="Purchase − Salvage" description="The vehicle's total value lost over its lifetime (straight-line method)." tone="expense" />
          <Divider />
          <FormulaRow symbol="÷" label="Expected Total Miles" description="How many total business miles you expect over the vehicle's life." />
          <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
            This calculator lives in Settings. The result flows into your rate snapshot — it never writes directly.
          </p>
        </FormulaCard>

      </div>

      {/* ── Desktop ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block px-8 pb-16">

        <div className="flex items-center gap-4 pt-10 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-[var(--surface-container-high)] flex items-center justify-center">
            <Sigma className="w-6 h-6 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-headline font-black text-5xl text-[var(--primary)] tracking-tight">Formulas</h1>
            <p className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mt-1">
              How every number in HustleBooks is calculated
            </p>
          </div>
        </div>

        {/* Net Profit — full width */}
        <div className="mb-6">
          <FormulaCard icon={TrendingUp} title="Net Profit" formula={netProfitFormula} accent>
            {(() => {
              const cols = [
                { symbol: '+', label: 'Income', desc: 'Total revenue across all logged income entries.', show: true },
                { symbol: '−', label: 'Expenses', desc: 'All logged business expenses for the period.', show: true },
                { symbol: '−', label: 'Tax Reserve', desc: 'Taxable income × SE tax rate. Set aside, not spent.', show: includeTaxInProfit },
                { symbol: '−', label: 'COGS', desc: 'Cost of goods for reselling/flipping entries.', show: true },
                { symbol: '−', label: 'Depreciation', desc: 'Vehicle wear baked in at log time. Optional.', show: includeDeprInProfit },
              ].filter(c => c.show)
              return (
                <div className={`grid gap-6 grid-cols-${cols.length}`}>
                  {cols.map(c => (
                    <div key={c.label} className="space-y-1">
                      <span className="font-headline font-black text-2xl text-white/90">{c.symbol}</span>
                      <p className="font-headline font-bold text-sm text-white">{c.label}</p>
                      <p className="font-body text-xs text-white/60 leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
            {(!includeTaxInProfit || !includeDeprInProfit) && (
              <p className="font-body text-xs text-white/50 leading-relaxed border-t border-white/10 pt-4">
                {[
                  !includeTaxInProfit ? 'Tax reserve' : null,
                  !includeDeprInProfit ? 'Depreciation' : null,
                ].filter(Boolean).join(' and ')} excluded per Settings → Profit.
              </p>
            )}
          </FormulaCard>
        </div>

        {/* 2-col */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <FormulaCard icon={Building2} title="Tax Reserve" formula="Taxable Income × Tax Rate">
            <FormulaRow symbol="×" label="Taxable Income" description="Only income entries marked 'Is Taxable'. Non-taxable entries are excluded." />
            <Divider />
            <FormulaRow symbol="×" label="Tax Rate" description="Your self-employment tax rate from your rate snapshot (e.g. 25%)." />
            <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
              This is money to <span className="font-semibold text-[var(--on-surface)]">set aside</span>, not an expense.{' '}
              {includeTaxInProfit ? 'It reduces net profit to show what\'s truly yours to keep.' : 'Currently excluded from net profit — toggle in Settings → Profit.'}
            </p>
          </FormulaCard>

          <FormulaCard icon={Car} title="Depreciation per Mile (Helper)" formula="(Purchase − Salvage) ÷ Expected Miles">
            <FormulaRow symbol="−" label="Purchase − Salvage" description="Total value the vehicle loses over its lifetime." tone="expense" />
            <Divider />
            <FormulaRow symbol="÷" label="Expected Total Miles" description="Estimated business miles over the vehicle's full life." />
            <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
              Calculated in Settings. The output flows into your rate snapshot — it never writes directly.
            </p>
          </FormulaCard>
        </div>

        {/* 3-col */}
        <div className="grid grid-cols-3 gap-6">
          <FormulaCard icon={Fuel} title="Fuel Cost (Actual)" formula="(Miles ÷ MPG) × Gas Price">
            <FormulaRow symbol="÷" label="Miles ÷ MPG" description="Gallons consumed for the trip." />
            <Divider />
            <FormulaRow symbol="×" label="Gas Price" description="Per-gallon price from your rate snapshot." />
            <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
              Locked in at log time. Past entries are never recalculated.
            </p>
          </FormulaCard>

          <FormulaCard icon={Fuel} title="Fuel Cost (IRS Standard)" formula="Miles × IRS Mileage Rate">
            <FormulaRow symbol="×" label="Miles" description="Business miles driven for the trip." />
            <Divider />
            <FormulaRow symbol="×" label="IRS Rate" description="Standard mileage rate from your rate snapshot." />
            <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
              Bundles fuel, wear, and maintenance into one flat rate. Set your method in Settings.
            </p>
          </FormulaCard>

          <FormulaCard icon={Route} title="Depreciation per Trip" formula="Miles × Depreciation per Mile">
            <FormulaRow symbol="×" label="Miles" description="Business miles driven for the trip." />
            <Divider />
            <FormulaRow symbol="×" label="Depr. per Mile" description="Your vehicle's wear rate from your rate snapshot." />
            <p className="font-body text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1">
              {includeDeprInProfit ? 'Subtracted from net profit.' : 'Currently excluded from net profit — toggle in Settings → Profit.'}{' '}
              Zero by default — estimate using the helper in Settings.
            </p>
          </FormulaCard>
        </div>

      </div>
    </div>
  )
}
