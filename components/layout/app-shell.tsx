'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './bottom-nav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNav = pathname !== '/login'

  return (
    <>
      {showNav && <BottomNav />}
      {/* Mobile: pad bottom for nav bar. Desktop: pad left for sidebar (w-64). */}
      <div className={showNav ? 'pb-20 lg:pb-0 lg:pl-64' : ''}>
        {children}
      </div>
    </>
  )
}
