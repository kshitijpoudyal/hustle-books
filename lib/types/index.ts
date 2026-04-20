export interface Profile {
  id: string
  full_name: string | null
  settings: {
    mileage_method: 'actual' | 'irs'
    currency: string
    dark_mode: boolean
    include_depreciation_in_profit: boolean
    include_tax_in_profit: boolean
    show_calculator_fab: boolean
    /** Whether to show milestone animations (confetti, toasts, glow) on goal progress */
    goal_animations: boolean
    vehicle: {
      year: number | null
      make_model: string | null
      purchase_price: number | null
      salvage_value: number | null
      expected_total_miles: number | null
      current_odometer: number | null
    }
  }
  created_at: string
  updated_at: string
}

export interface RateSnapshot {
  id: string
  user_id: string
  label: string | null
  gas_price: number
  mpg: number
  irs_rate: number
  tax_rate: number
  depreciation_per_mile: number
  effective_date: string // ISO date string YYYY-MM-DD
  is_locked: boolean
  notes: string | null
  created_at: string
  // Virtual field — populated by join or separate count query
  linked_entry_count?: number
}

export interface Hustle {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  is_active: boolean
  category: import('@/lib/utils/constants').HustleCategory | null
  created_at: string
}

export interface IncomeEntry {
  id: string
  user_id: string
  hustle_id: string
  amount: number
  description: string | null
  mileage: number | null
  rate_snapshot_id: string | null
  fuel_cost_at_log: number | null
  depreciation_cost_at_log: number | null
  cogs: number | null
  is_taxable: boolean
  date: string
  created_at: string
  updated_at: string
  // Joined fields
  hustle?: Hustle
  rate_snapshot?: RateSnapshot
}

export interface ExpenseEntry {
  id: string
  user_id: string
  hustle_id: string | null
  amount: number
  category: 'fuel' | 'fees' | 'supplies' | 'maintenance' | 'phone' | 'other'
  description: string | null
  is_recurring: boolean
  date: string
  created_at: string
  updated_at: string
  // Joined fields
  hustle?: Hustle
}

export type TransactionEntry =
  | (IncomeEntry & { entry_type: 'income' })
  | (ExpenseEntry & { entry_type: 'expense' })

export interface Goal {
  id: string
  user_id: string
  /** null = global goal spanning all hustles */
  hustle_id: string | null
  title: string
  target_amount: number
  type: 'hustle' | 'global'
  timeframe_start: string | null  // ISO date YYYY-MM-DD
  timeframe_end: string | null    // ISO date YYYY-MM-DD
  created_at: string
  updated_at: string
  /** Virtual: populated by hook from income aggregation */
  current_amount?: number
}
