export const EXPENSE_CATEGORIES = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'fees', label: 'Fees' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' },
] as const

export const HUSTLE_COLORS = [
  '#2ca6a4', // Oxidized Teal
  '#1e3a5f', // Deep Navy
  '#e06c4b', // Warm Coral
  '#7c5cbf', // Muted Violet
  '#4a9e6b', // Forest Green
  '#d4a017', // Warm Amber
  '#c45b8a', // Dusty Rose
  '#4a7fa5', // Steel Blue
  '#8b6e5a', // Warm Brown
  '#5a8a6e', // Sage
] as const

export const HUSTLE_ICONS = [
  'briefcase',
  'car',
  'package',
  'scissors',
  'laptop',
  'camera',
  'music',
  'wrench',
  'home',
  'utensils',
  'dog',
  'shopping-bag',
] as const

export const DEFAULT_SETTINGS = {
  mileage_method: 'actual' as const,
  currency: 'USD',
  dark_mode: true,
  vehicle: {
    year: null,
    make_model: null,
    purchase_price: null,
    salvage_value: null,
    expected_total_miles: null,
    current_odometer: null,
  },
}

export const DEFAULT_RATE_SNAPSHOT = {
  label: 'Initial rates',
  gas_price: 3.5,
  mpg: 25.0,
  irs_rate: 0.67,
  tax_rate: 25.0,
  depreciation_per_mile: 0.0,
  is_locked: false,
  notes: 'Default rates — update in Settings. Set your depreciation rate too!',
}

export const IRS_MILEAGE_RATE_DEFAULT = 0.67

export const STALE_RATES_THRESHOLD_DAYS = 30
