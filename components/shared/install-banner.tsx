'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { usePWAInstall } from '@/lib/hooks/use-pwa-install'

const DISMISSED_KEY = 'hustlebooks-install-banner-dismissed'
/** Delay (ms) before the banner fades in on first visit */
const SHOW_DELAY_MS = 4000

export default function InstallBanner() {
  const { canInstall, isInstalled, installState, promptInstall } = usePWAInstall()
  const [visible, setVisible] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  const dismiss = useCallback(() => {
    setAnimateIn(false)
    setTimeout(() => setVisible(false), 350)
    if (typeof window !== 'undefined') localStorage.setItem(DISMISSED_KEY, '1')
  }, [])

  // Show banner after delay once install prompt is available
  useEffect(() => {
    if (!canInstall || isInstalled) return
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY)) return
    // Only show on mobile/tablet — skip desktop (min-width 1024px)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return

    const timer = setTimeout(() => {
      setVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true))
      })
    }, SHOW_DELAY_MS)

    return () => clearTimeout(timer)
  }, [canInstall, isInstalled])

  // Auto-hide when the app gets installed
  const dismissRef = useRef(dismiss)
  useEffect(() => { dismissRef.current = dismiss }, [dismiss])
  useEffect(() => {
    if (installState === 'accepted') dismissRef.current()
  }, [installState])

  async function handleInstall() {
    await promptInstall()
    dismiss()
  }

  if (!visible) return null

  return (
    <div
      aria-live="polite"
      role="dialog"
      aria-label="Install HustleBooks"
      className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-50"
      style={{
        transition: 'opacity 350ms ease-out, transform 350ms ease-out',
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? 'translateY(0)' : 'translateY(1.5rem)',
      }}
    >
      <div
        className="rounded-[1.5rem] p-5 flex items-center gap-4 shadow-[0_12px_32px_rgba(30,58,95,0.18)]"
        style={{
          backgroundColor: 'rgba(30, 58, 95, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(44,166,164,0.25)' }}
        >
          <Smartphone className="w-5 h-5" style={{ color: '#2ca6a4' }} strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-white text-sm leading-tight">
            Add to Home Screen
          </p>
          <p className="font-body text-white/60 text-xs mt-0.5 leading-tight">
            Install HustleBooks for offline access
          </p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white font-label text-[10px] uppercase tracking-widest font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #022448 0%, #1e3a5f 100%)' }}
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2} />
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white/50" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
