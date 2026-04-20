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
  type FlagKey,
} from '@/lib/feature-flags'
import {
  loadUserFlags,
  enableFlag,
  disableFlag,
  resolveFlag,
} from '@/lib/services/feature-flags'
import { createClient } from '@/lib/supabase/client'

interface FeatureFlagsContextValue {
  flag: (key: FlagKey) => boolean
  setFlag: (key: FlagKey, value: boolean) => void
  stored: Record<string, boolean>
  publicFlagKeys: Set<string>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flag: (key) => resolveFlag({}, key),
  setFlag: () => {},
  stored: {},
  publicFlagKeys: new Set(),
})

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<Record<string, boolean>>(() => loadFlags())
  const [publicFlagKeys, setPublicFlagKeys] = useState<Set<string>>(new Set())

  const keyToIdRef = useRef<Record<string, string>>({})
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      const resolved = await loadUserFlags(user.id)
      keyToIdRef.current = resolved.keyToId
      setPublicFlagKeys(resolved.publicFlagKeys)

      // DB enrollment only records 'true' (enrolled). Merge in any explicit
      // false overrides the user has set locally so they survive a page reload.
      const localStored = loadFlags()
      const merged: Record<string, boolean> = { ...resolved.stored }
      for (const [k, v] of Object.entries(localStored)) {
        if (v === false) merged[k] = false
      }
      setStored(merged)
      saveFlags(merged)
    }
    load()
  }, [])

  const flag = useCallback(
    (key: FlagKey) => resolveFlag(stored, key),
    [stored]
  )

  const setFlag = useCallback((key: FlagKey, value: boolean) => {
    setStored(prev => {
      const next = { ...prev, [key]: value }
      saveFlags(next)

      const userId = userIdRef.current
      if (userId) {
        if (value) {
          enableFlag(userId, key, keyToIdRef.current)
            .then(r => { if (!r.ok) console.error('[FeatureFlags] enable error:', r.error) })
        } else {
          disableFlag(userId, key, keyToIdRef.current)
            .then(r => { if (!r.ok) console.error('[FeatureFlags] disable error:', r.error) })
        }
      }

      return next
    })
  }, [])

  return (
    <FeatureFlagsContext.Provider value={{ flag, setFlag, stored, publicFlagKeys }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
