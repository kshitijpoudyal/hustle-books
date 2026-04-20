'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  Clock,
  Rocket,
  Settings,
  PlusCircle,
  BookOpen,
  Mic,
  MicOff,
  Loader2,
} from 'lucide-react'
import { useProfile } from '@/lib/hooks/use-profile'
import { useVoiceInput } from '@/lib/hooks/use-voice-input'

const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/history',   label: 'History',   Icon: Clock },
  { href: '/log',       label: 'Log',       Icon: PlusCircle, primary: true },
  { href: '/hustles',   label: 'Hustles',   Icon: Rocket },
  { href: '/settings',  label: 'Settings',  Icon: Settings },
]

/* ── Mobile top header ────────────────────────────────────────────────────── */
export function MobileHeader() {
  const { profile, email } = useProfile()

  const displayName = profile?.full_name ?? email?.split('@')[0] ?? 'You'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-40 flex justify-between items-center px-6 py-4"
      style={{
        background: 'rgba(251, 249, 243, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 0 rgba(2, 36, 72, 0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-[var(--primary)]" strokeWidth={2} />
        <span className="font-headline font-black text-xl tracking-tight text-[var(--primary)]">
          HustleBooks
        </span>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-[var(--on-surface-variant)]">
          Powered by{' '}
          <a
            href="https://www.kshitijstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--secondary)] hover:underline"
          >
            KshitijStudio
          </a>
        </p>
        <div className="w-10 h-10 rounded-2xl bg-[var(--surface-container-high)] flex items-center justify-center flex-shrink-0">
          <span className="font-label text-xs font-semibold text-[var(--primary)]">{initials}</span>
        </div>
      </div>
    </header>
  )
}

/* ── Log FAB — PlusCircle on other pages, Mic on /log ────────────────────── */
function LogFAB({ isOnLogPage }: { isOnLogPage: boolean }) {
  const { state, transcript, errorMessage, isSupported, start, stop, reset } = useVoiceInput()

  // Forward raw transcript to the log page via a custom event
  useEffect(() => {
    if (transcript) {
      window.dispatchEvent(new CustomEvent('hustle-voice-transcript', { detail: transcript }))
    }
  }, [transcript])

  // Errors → toast (no inline UI clutter)
  useEffect(() => {
    if (errorMessage) toast.error(errorMessage)
  }, [errorMessage])

  const isListening = state === 'listening'
  const isLoading = state === 'requesting' || state === 'processing'

  function handleMicClick() {
    if (isListening) { stop(); return }
    if (state === 'error') { reset(); return }
    start()
  }

  if (!isOnLogPage || !isSupported) {
    return (
      <Link href="/log" className="flex flex-col items-center">
        <div
          className="-mt-8 w-12 h-12 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(2,36,72,0.25)] active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
        >
          <PlusCircle className="w-5 h-5 text-white" strokeWidth={1.5} />
        </div>
        <span className="font-label uppercase tracking-[0.1rem] text-[9px] mt-1 text-[var(--on-surface-variant)]">
          Log
        </span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleMicClick}
        disabled={isLoading}
        aria-label={isListening ? 'Stop recording' : 'Log by voice'}
        className="relative -mt-8 w-12 h-12 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(2,36,72,0.25)] active:scale-95 transition-all duration-200 disabled:opacity-70"
        style={{
          background: isListening
            ? 'linear-gradient(135deg, var(--expense) 0%, #c0392b 100%)'
            : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
        }}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" strokeWidth={1.5} />
        ) : state === 'error' ? (
          <MicOff className="w-5 h-5 text-white" strokeWidth={1.5} />
        ) : (
          <Mic className="w-5 h-5 text-white" strokeWidth={1.5} />
        )}
        {isListening && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: 'rgba(180,60,40,0.35)' }}
          />
        )}
      </button>
      <span className="font-label uppercase tracking-[0.1rem] text-[9px] mt-1 text-[var(--on-surface-variant)]">
        {isListening ? 'Listening' : state === 'error' ? 'Retry' : isLoading ? '…' : 'Voice'}
      </span>
    </div>
  )
}

/* ── Mobile bottom nav ────────────────────────────────────────────────────── */
function MobileNav({ pathname }: { pathname: string }) {
  const isOnLogPage = pathname === '/log'
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-3 pb-8 rounded-t-[24px]"
      style={{
        background: 'rgba(251, 249, 243, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 -4px 32px rgba(2, 36, 72, 0.08)',
      }}
    >
      {NAV_ITEMS.map(({ href, label, Icon, primary }) => {
        const active = pathname === href
        if (primary) {
          return <LogFAB key={href} isOnLogPage={isOnLogPage} />
        }
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center pb-1 transition-colors ${
              active
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--on-surface-variant)] opacity-60'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" strokeWidth={active ? 2 : 1} />
            <span className={`font-label uppercase tracking-[0.1rem] text-[9px] ${active ? 'font-bold' : ''}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

/* ── Desktop sidebar ──────────────────────────────────────────────────────── */
function DesktopSidebar({ pathname }: { pathname: string }) {
  const { profile, email } = useProfile()

  const displayName = profile?.full_name ?? email?.split('@')[0] ?? 'You'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col py-8 px-6 z-50 gap-y-4"
      style={{
        background: 'rgba(245, 243, 238, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '32px 0 64px -20px rgba(2, 36, 72, 0.08)',
      }}
    >
      {/* Brand */}
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-bold tracking-tighter text-[var(--primary)] font-headline">
          HustleBooks
        </h1>
        <p className="font-label text-[10px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] mt-1">
          V1.0.4-STABLE
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-y-6">
        {NAV_ITEMS.filter(n => !n.primary).map(({ href, label, Icon }) => {
          const active = pathname === href
          return active ? (
            <Link
              key={href}
              href={href}
              className="relative text-[var(--primary)] font-semibold flex items-center gap-x-3 px-2 py-1"
            >
              <span
                className="absolute -bottom-1 left-0 w-full h-0.5 rounded-full"
                style={{ background: 'linear-gradient(to right, var(--primary), var(--primary-container))' }}
              />
              <Icon className="w-5 h-5" strokeWidth={2} />
              <span className="font-headline">{label}</span>
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors flex items-center gap-x-3 px-2 py-1 hover:bg-[rgba(2,36,72,0.04)] rounded-lg"
            >
              <Icon className="w-5 h-5" strokeWidth={1} />
              <span className="font-headline">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* CTA + User */}
      <div className="mt-auto pt-8">
        <Link
          href="/log"
          className="w-full py-4 rounded-full flex items-center justify-center gap-x-2 text-white font-semibold shadow-[0_12px_32px_rgba(2,36,72,0.2)] hover:opacity-90 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
        >
          <PlusCircle className="w-4 h-4" strokeWidth={2} />
          Log
        </Link>

        <p className="mt-4 text-center text-[10px] text-[var(--on-surface-variant)]">
          Powered by{' '}
          <a
            href="https://www.kshitijstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline text-[var(--secondary)]"
          >
            KshitijStudio
          </a>
        </p>

        <div className="mt-4 flex items-center gap-x-3 px-2">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-container-highest)] flex items-center justify-center flex-shrink-0">
            <span className="font-label text-xs font-semibold text-[var(--primary)]">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline text-sm font-bold text-[var(--primary)] truncate">{displayName}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function Nav() {
  const pathname = usePathname()
  return (
    <>
      <MobileHeader />
      <MobileNav pathname={pathname} />
      <DesktopSidebar pathname={pathname} />
    </>
  )
}
