'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import {
  UserGroup,
  type FlagKey,
} from '@/lib/feature-flags'
import {
  loadUserFlags,
  enableFlag,
  disableFlag,
  resolveFlag,
} from '@/lib/services/feature-flags'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface FeatureFlagsContextValue {
  flag: (key: FlagKey) => boolean
  setFlag: (key: FlagKey, value: boolean) => void
  stored: Record<string, boolean>
  /** Keys of non-disabled flags visible to this user */
  visibleFlagKeys: Set<string>
  /** Map of flag key → release_stage from DB */
  keyToStage: Record<string, string>
  userGroup: UserGroup
  isInternal: boolean
  /** True while the initial flag load is in progress */
  flagsLoading: boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flag: () => false,
  setFlag: () => {},
  stored: {},
  visibleFlagKeys: new Set(),
  keyToStage: {},
  userGroup: UserGroup.PUBLIC,
  isInternal: false,
  flagsLoading: true,
})

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<Record<string, boolean>>({})
  const [visibleFlagKeys, setVisibleFlagKeys] = useState<Set<string>>(new Set())
  const [keyToStage, setKeyToStage] = useState<Record<string, string>>({})
  const [userGroup, setUserGroup] = useState<UserGroup>(UserGroup.PUBLIC)
  const [flagsLoading, setFlagsLoading] = useState(true)

  const keyToIdRef = useRef<Record<string, string>>({})
  const userIdRef = useRef<string | null>(null)
  const loadedRef = useRef(false)
  const loadingRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    async function load(userId: string) {
      if (loadingRef.current) return
      loadingRef.current = true
      userIdRef.current = userId

      try {
        const { data: profile, error } = await supabase
          .from('users')
          .select('user_group')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.error('[FeatureFlags] Failed to fetch user group:', error.message)
          return  // loadedRef stays false — allows retry on next auth event
        }

        const group: UserGroup =
          (profile?.user_group as UserGroup | null) ?? UserGroup.PUBLIC
        setUserGroup(group)
        loadedRef.current = true

        const resolved = await loadUserFlags(userId, group)
        keyToIdRef.current = resolved.keyToId
        setVisibleFlagKeys(resolved.visibleFlagKeys)
        setKeyToStage(resolved.keyToStage)
        setStored(resolved.stored)
      } finally {
        loadingRef.current = false
        setFlagsLoading(false)
      }
    }

    // Initial load — may return null on mobile before auth is ready
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (user) load(user.id)
      else setFlagsLoading(false)
    })

    // Re-run when the session becomes available. Also retries if the initial
    // load failed (loadedRef.current stays false on error), which handles the
    // mobile case where the DB query fails before auth is fully established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const isNewUser = session.user.id !== userIdRef.current
        const needsRetry = !loadedRef.current
        if (isNewUser || needsRetry) {
          load(session.user.id)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const flag = useCallback(
    (key: FlagKey) => resolveFlag(stored, key),
    [stored]
  )

  const setFlag = useCallback((key: FlagKey, value: boolean) => {
    if (userGroup === UserGroup.PUBLIC) {
      console.warn('[FeatureFlags] Public users cannot toggle feature flags')
      return
    }
    setStored(prev => {
      const next = { ...prev, [key]: value }

      const userId = userIdRef.current
      if (userId) {
        const op = value ? enableFlag : disableFlag
        op(userId, key, keyToIdRef.current).then(r => {
          if (!r.ok) {
            console.error('[FeatureFlags] toggle error:', r.error)
            toast.error(`Failed to save flag: ${r.error}`)
            // Revert optimistic update
            setStored(prev => ({ ...prev, [key]: !value }))
          }
        })
      }

      return next
    })
  }, [userGroup])

  const isInternal = userGroup === UserGroup.INTERNAL

  return (
    <FeatureFlagsContext.Provider value={{ flag, setFlag, stored, visibleFlagKeys, keyToStage, userGroup, isInternal, flagsLoading }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
