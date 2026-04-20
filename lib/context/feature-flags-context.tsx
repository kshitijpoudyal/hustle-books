'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  loadFlags,
  saveFlags,
  resolveFlag,
  type FlagKey,
} from '@/lib/feature-flags'
import { createClient } from '@/lib/supabase/client'

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
  // Seed from localStorage immediately so there's no flicker on mount
  const [stored, setStored] = useState<Record<string, boolean>>(() => loadFlags())
  const userIdRef = useRef<string | null>(null)

  // On mount, pull flags from Supabase and merge (remote wins over stale localStorage)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      userIdRef.current = user.id
      supabase
        .from('profiles')
        .select('feature_flags')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (!data) return
          const remote = (data.feature_flags ?? {}) as Record<string, boolean>
          setStored(remote)
          saveFlags(remote) // keep localStorage in sync
        })
    })
  }, [])

  const flag = useCallback(
    (key: FlagKey) => resolveFlag(stored, key),
    [stored]
  )

  const setFlag = useCallback((key: FlagKey, value: boolean) => {
    setStored(prev => {
      const next = { ...prev, [key]: value }
      // Optimistically persist to localStorage for instant feedback
      saveFlags(next)
      // Persist to Supabase in the background
      if (userIdRef.current) {
        const supabase = createClient()
        supabase
          .from('profiles')
          .update({ feature_flags: next })
          .eq('id', userIdRef.current)
          .then(({ error }) => {
            if (error) console.error('[FeatureFlags] failed to persist to Supabase:', error.message)
          })
      }
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
