'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clock,
  Rocket,
  Settings,
  PlusCircle,
  BookOpen,
} from 'lucide-react'
import { useProfile } from '@/lib/hooks/use-profile'

/** Glass material from design.md: surface at ~85% + 12px blur. Token-driven so it follows dark mode. */
const glass = (pct: number) => ({
  background: `color-mix(in srgb, var(--surface) ${pct}%, transparent)`,
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
})

/** Nested routes (/hustles/abc, /log/abc) keep their parent tab highlighted. */
function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

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
      style={{ ...glass(88), paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-[var(--primary)]" strokeWidth={2} />
        <span className="font-headline font-black text-xl tracking-tight text-[var(--primary)]">
          HustleBooks
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Stacked so it never wraps mid-phrase at 375px */}
        <p className="text-[10px] leading-tight text-right text-[var(--on-surface-variant)]">
          Powered by
          <a
            href="https://www.kshitijstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block font-medium text-[var(--secondary)] hover:underline"
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

/* ── Mobile bottom nav ─────────────────────────────────────────────────────── */
function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-3 rounded-t-[24px]"
      style={{
        ...glass(85),
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 32px rgba(30, 58, 95, 0.08)',
      }}
    >
      {NAV_ITEMS.map(({ href, label, Icon, primary }) => {
        const active = isActive(pathname, href)
        if (primary) {
          return (
            <Link key={href} href="/log" aria-current={active ? 'page' : undefined} className="group flex flex-col items-center">
              <div
                className="-mt-8 w-12 h-12 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(30,58,95,0.25)] group-active:scale-90 transition-transform duration-100"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)' }}
              >
                <PlusCircle className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <span className={`font-label uppercase tracking-[0.1rem] text-[9px] mt-1 ${active ? 'font-bold text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}`}>
                Log
              </span>
            </Link>
          )
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center min-w-12 pb-2 transition-[color,opacity,transform] duration-100 active:scale-90 ${
              active ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)] opacity-60'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" strokeWidth={active ? 2 : 1} />
            <span className={`font-label uppercase tracking-[0.1rem] text-[9px] ${active ? 'font-bold' : ''}`}>
              {label}
            </span>
            {/* Teal dot instead of a border underline (borders are prohibited) */}
            <span
              aria-hidden
              className={`absolute bottom-0 w-1 h-1 rounded-full bg-[var(--secondary)] transition-[opacity,transform] duration-200 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
            />
          </Link>
        )
      })}
    </nav>
  )
}

/* ── Desktop sidebar ────────────────────────────────────────────────────────── */
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
        ...glass(80),
        boxShadow: '32px 0 64px -20px rgba(30, 58, 95, 0.08)',
      }}
    >
      {/* Brand */}
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-bold tracking-tighter text-[var(--primary)] font-headline">
          HustleBooks
        </h1>
        <p className="font-label text-[10px] uppercase tracking-[0.05rem] text-[var(--on-surface-variant)] mt-1">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-y-6">
        {NAV_ITEMS.filter(n => !n.primary).map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return active ? (
            <Link
              key={href}
              href={href}
              aria-current="page"
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
              className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors flex items-center gap-x-3 px-2 py-1 hover:bg-[var(--surface-container)] rounded-full"
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
          className="w-full py-4 rounded-full flex items-center justify-center gap-x-2 text-white font-headline font-bold shadow-[0_12px_32px_rgba(30,58,95,0.2)] hover:opacity-90 active:scale-95 transition-all"
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
