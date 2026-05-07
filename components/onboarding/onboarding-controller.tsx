'use client'

import { useUserSettings } from '@/lib/context/user-settings-context'
import { useFeatureFlags } from '@/lib/context/feature-flags-context'
import OnboardingWizard from './onboarding-wizard'

export default function OnboardingController() {
  const { settings, loading, updateSettings } = useUserSettings()
  const { flag } = useFeatureFlags()

  if (!flag('ONBOARDING_WIZARD')) return null
  if (loading || !settings) return null
  if (settings.onboarding_complete !== false) return null

  return (
    <OnboardingWizard
      onComplete={() => updateSettings({ onboarding_complete: true })}
    />
  )
}
