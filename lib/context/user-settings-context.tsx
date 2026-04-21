'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

type UserSettings = Profile['settings']

interface UserSettingsContextValue {
  settings: UserSettings | null
  loading: boolean
  /** Update one or more settings keys and persist to Supabase */
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
  /** Convenience getter */
  includeDeprInProfit: boolean
  includeTaxInProfit: boolean
  showCalculatorFab: boolean
  goalAnimations: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  mileage_method: 'actual',
  currency: 'USD',
  dark_mode: false,
  include_depreciation_in_profit: true,
  include_tax_in_profit: true,
  show_calculator_fab: true,
  goal_animations: true,
  vehicle: {
    year: null,
    make_model: null,
    purchase_price: null,
    salvage_value: null,
    expected_total_miles: null,
    current_odometer: null,
  },
}

const UserSettingsContext = createContext<UserSettingsContextValue>({
  settings: null,
  loading: true,
  updateSettings: async () => {},
  includeDeprInProfit: true,
  includeTaxInProfit: true,
  showCalculatorFab: true,
  goalAnimations: true,
})

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('users').select('settings').single().then(
      (res: { data: { settings: unknown } | null }) => {
        setSettings((res.data?.settings as UserSettings) ?? DEFAULT_SETTINGS)
        setLoading(false)
      }
    )
  }, [])

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    const next = { ...(settings ?? DEFAULT_SETTINGS), ...patch }
    setSettings(next)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('users').update({ settings: next }).eq('id', user.id)
  }, [settings])

  return (
    <UserSettingsContext.Provider value={{
      settings,
      loading,
      updateSettings,
      includeDeprInProfit: settings?.include_depreciation_in_profit ?? true,
      includeTaxInProfit: settings?.include_tax_in_profit ?? true,
      showCalculatorFab: settings?.show_calculator_fab ?? true,
      goalAnimations: settings?.goal_animations ?? true,
    }}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettings() {
  return useContext(UserSettingsContext)
}
