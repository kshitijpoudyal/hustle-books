'use client'

import { usePathname } from 'next/navigation'
import Nav from './nav'
import { UserSettingsProvider } from '@/lib/context/user-settings-context'
import { FeatureFlagsProvider } from '@/lib/context/feature-flags-context'
import CalculatorFab from '@/components/calculator/calculator-fab'
import InstallBanner from '@/components/shared/install-banner'
import ServiceWorkerRegistration from '@/components/shared/service-worker-registration'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNav = pathname !== '/login'

  return (
    <FeatureFlagsProvider>
      <UserSettingsProvider>
      {showNav && <Nav />}
      {/* Mobile: pt-[72px] for fixed header height + pb-20 for bottom nav. Desktop: pl-64 sidebar + pt-8 topbar. */}
      <div className={showNav ? 'pt-[72px] pb-20 lg:pt-0 lg:pb-0 lg:pl-64 lg:pt-8' : ''}>
        {children}
      </div>
      {showNav && <CalculatorFab />}
      {showNav && <InstallBanner />}
      {showNav && <ServiceWorkerRegistration />}
      </UserSettingsProvider>
    </FeatureFlagsProvider>
  )
}
