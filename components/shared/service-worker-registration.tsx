'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for PWA offline support.
 * Skipped in development to avoid stale-cache issues during hot reload.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.debug('[SW] Registered:', registration.scope)
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err)
      })
  }, [])

  return null
}
