import { RateSnapshot } from '@/lib/types'

// Fuel cost per trip — ALWAYS uses snapshot rates, never "current" rates
// when saving/updating an income entry with the actual mileage method (gas price × miles ÷ MPG). This bakes fuel_cost_at_log into the DB row.
export function calcFuelCost(mileage: number, snapshot: RateSnapshot): number {
  return (mileage / snapshot.mpg) * snapshot.gas_price
}

// IRS standard method — uses snapshot's IRS rate
//  when saving/updating an income entry with the irs mileage method. Bakes fuel_cost_at_log = mileage × irs_rate permanently into the DB row.
export function calcMileageDeduction(mileage: number, snapshot: RateSnapshot): number {
  return mileage * snapshot.irs_rate
}

// Determine which method to use based on user preference
export function calcMileageCost(
  mileage: number,
  snapshot: RateSnapshot,
  method: 'actual' | 'irs'
): number {
  if (method === 'irs') return calcMileageDeduction(mileage, snapshot)
  return calcFuelCost(mileage, snapshot)
}

// Depreciation cost per trip — uses snapshot's depreciation_per_mile
export function calcDepreciationCost(mileage: number, snapshot: RateSnapshot): number {
  return mileage * snapshot.depreciation_per_mile
}

// Total mileage-related cost (fuel + depreciation)
export function calcTotalMileageCost(
  mileage: number,
  snapshot: RateSnapshot,
  method: 'actual' | 'irs'
): { fuelCost: number; depreciationCost: number; total: number } {
  const fuelCost = calcMileageCost(mileage, snapshot, method)
  const depreciationCost = calcDepreciationCost(mileage, snapshot)
  return { fuelCost, depreciationCost, total: fuelCost + depreciationCost }
}

// Mileage preview total shown in the log form.
// Depreciation is only added when the rate has been configured (> 0).
export function calcMileagePreviewTotal(fuelCost: number, deprCost: number, depreciationPerMile: number): number {
  return fuelCost + (depreciationPerMile > 0 ? deprCost : 0)
}

// Depreciation helper calculator (used in Settings page)
// Straight-line: (purchase - salvage) / totalMiles
export function calcDepreciationPerMile(
  purchasePrice: number,
  salvageValue: number,
  expectedTotalMiles: number
): number {
  if (expectedTotalMiles <= 0) return 0
  return Math.max(0, (purchasePrice - salvageValue) / expectedTotalMiles)
}

// Tax amount to set aside — taxableIncome × taxRate (taxRate as a percentage, e.g. 25)
export function calcTaxSetAside(taxableIncome: number, taxRate: number): number {
  return taxableIncome * (taxRate / 100)
}

// Net margin after cost of goods sold
export function calcNetMargin(income: number, cogs: number): number {
  return income - cogs
}

// Net profit — uses snapshot tax rate for the period
// taxableIncome defaults to totalIncome when not provided (all income taxable)
// totalDepreciation is the sum of depreciation_cost_at_log (vehicle wear, baked in at log time)
export function calcNetProfit(
  totalIncome: number,
  totalExpenses: number,
  taxRate: number, // as percentage e.g. 25
  totalCogs: number = 0,
  taxableIncome?: number,
  totalDepreciation: number = 0
): number {
  const taxSetAside = calcTaxSetAside(taxableIncome ?? totalIncome, taxRate)
  return totalIncome - totalExpenses - taxSetAside - totalCogs - totalDepreciation
}

// Per-entry profit — income minus tax setaside only.
// Fuel and depreciation are tracked via expense records and mileage metadata
// respectively; they are NOT deducted here to avoid double-counting with
// actual fuel expense entries the user may log separately.
export function calcEntryProfit(
  incomeAmount: number,
  taxRate: number // as percentage e.g. 25
): number {
  return incomeAmount - calcTaxSetAside(incomeAmount, taxRate)
}
