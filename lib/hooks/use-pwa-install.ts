'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export type InstallState = 'unavailable' | 'ready' | 'accepted' | 'dismissed'

interface UsePWAInstall {
  /** Whether the install prompt is available to trigger */
  canInstall: boolean
  /** Current installation state */
  installState: InstallState
  /** Whether the app is already running in standalone/installed mode */
  isInstalled: boolean
  /** Trigger the native install prompt */
  promptInstall: () => Promise<void>
}

export function usePWAInstall(): UsePWAInstall {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  const isInstalled =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true))

  const [installState, setInstallState] = useState<InstallState>(() =>
    isInstalled ? 'accepted' : 'unavailable'
  )

  useEffect(() => {
    if (isInstalled) return

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setInstallState('ready')
    }

    function handleAppInstalled() {
      setDeferredPrompt(null)
      setInstallState('accepted')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setInstallState(outcome === 'accepted' ? 'accepted' : 'dismissed')
  }, [deferredPrompt])

  return {
    canInstall: installState === 'ready',
    installState,
    isInstalled,
    promptInstall,
  }
}
