import { RateSnapshot } from '@/lib/types'

// Fuel cost per trip — ALWAYS uses snapshot rates, never "current" rates
export function calcFuelCost(mileage: number, snapshot: RateSnapshot): number {
  return (mileage / snapshot.mpg) * snapshot.gas_price
}

// IRS standard method — uses snapshot's IRS rate
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
  const taxBase = taxableIncome ?? totalIncome
  const taxSetAside = taxBase * (taxRate / 100)
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
  const tax = incomeAmount * (taxRate / 100)
  return incomeAmount - tax
}
