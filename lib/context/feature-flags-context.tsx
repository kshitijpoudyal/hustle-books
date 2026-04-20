'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  FLAG_REGISTRY,
  loadFlags,
  saveFlags,
  resolveFlag,
  type FlagKey,
} from '@/lib/feature-flags'

interface FeatureFlagsContextValue {
  /** Check if a flag is enabled */
  flag: (key: FlagKey) => boolean
  /** Toggle or set a specific flag */
  setFlag: (key: FlagKey, value: boolean) => void
  /** Raw stored overrides (used by /devpower) */
  stored: Record<string, boolean>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flag: (key) => resolveFlag({}, key),
  setFlag: () => {},
  stored: {},
})

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setStored(loadFlags())
  }, [])

  const flag = useCallback(
    (key: FlagKey) => resolveFlag(stored, key),
    [stored]
  )

  const setFlag = useCallback((key: FlagKey, value: boolean) => {
    setStored(prev => {
      const next = { ...prev, [key]: value }
      saveFlags(next)
      return next
    })
  }, [])

  return (
    <FeatureFlagsContext.Provider value={{ flag, setFlag, stored }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
