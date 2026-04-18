'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { useUserSettings } from '@/lib/context/user-settings-context'
import dynamic from 'next/dynamic'

const CalculatorModal = dynamic(() => import('./calculator-modal'), { ssr: false })

export default function CalculatorFab() {
  const { showCalculatorFab } = useUserSettings()
  const [open, setOpen] = useState(false)

  if (!showCalculatorFab) return null

  return (
    <>
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label="Open calculator"
        className="fixed z-40 bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95"
        style={{
          background: open
            ? 'linear-gradient(135deg, #1a7a78 0%, #2ca6a4 100%)'
            : 'linear-gradient(135deg, #2ca6a4 0%, #1a7a78 100%)',
          boxShadow: '0 12px 32px rgba(44,166,164,0.35)',
        }}
      >
        <Calculator className="w-6 h-6 text-white" strokeWidth={1.5} />
      </button>

      {open && <CalculatorModal onClose={() => setOpen(false)} />}
    </>
  )
}
