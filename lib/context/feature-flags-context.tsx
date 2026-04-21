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
  UserGroup,
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
  /** Keys of non-disabled flags visible to this user */
  visibleFlagKeys: Set<string>
  /** Map of flag key → release_stage from DB */
  keyToStage: Record<string, string>
  userGroup: UserGroup
  isInternal: boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flag: () => false,
  setFlag: () => {},
  stored: {},
  visibleFlagKeys: new Set(),
  keyToStage: {},
  userGroup: UserGroup.PUBLIC,
  isInternal: false,
})

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<Record<string, boolean>>({})
  const [visibleFlagKeys, setVisibleFlagKeys] = useState<Set<string>>(new Set())
  const [keyToStage, setKeyToStage] = useState<Record<string, string>>({})
  const [userGroup, setUserGroup] = useState<UserGroup>(UserGroup.PUBLIC)

  const keyToIdRef = useRef<Record<string, string>>({})
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      const { data: profile } = await supabase
        .from('users')
        .select('user_group')
        .eq('id', user.id)
        .single()

      const group: UserGroup =
        (profile?.user_group as UserGroup | null) ?? UserGroup.PUBLIC
      setUserGroup(group)

      const resolved = await loadUserFlags(user.id, group)
      keyToIdRef.current = resolved.keyToId
      setVisibleFlagKeys(resolved.visibleFlagKeys)
      setKeyToStage(resolved.keyToStage)
      setStored(resolved.stored)
    }
    load()
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
  }, [userGroup])

  const isInternal = userGroup === UserGroup.INTERNAL

  return (
    <FeatureFlagsContext.Provider value={{ flag, setFlag, stored, visibleFlagKeys, keyToStage, userGroup, isInternal }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
