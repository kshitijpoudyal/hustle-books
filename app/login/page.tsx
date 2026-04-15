'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        toast.success('Signed in successfully')
        router.push('/')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) {
        setError(error.message)
      } else {
        toast.success('Account created — check your email to confirm.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--surface-container-lowest)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[960px] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

        {/* ── Brand ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[var(--secondary)]" strokeWidth={2} />
            <span className="font-semibold text-base text-[var(--on-surface)]">HustleBooks</span>
          </div>

          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--on-surface)] leading-tight tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h1>
            <p className="text-base text-[var(--on-surface-variant)] mt-3 max-w-sm leading-relaxed">
              {mode === 'login'
                ? 'Track your income, expenses, and real profit — all in one place.'
                : 'Track every hustle. See true profit after fuel, fees, and taxes.'}
            </p>
          </div>
        </div>

        {/* ── Auth card ── */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-8">
          <h2 className="text-lg font-semibold text-[var(--on-surface)] mb-6">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-[var(--on-surface)] mb-1.5">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] transition-shadow"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--on-surface)] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] transition-shadow"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[var(--on-surface)]">Password</label>
                {mode === 'login' && (
                  <button type="button" className="text-xs text-[var(--secondary)] hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] transition-shadow"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--expense)] bg-[var(--expense)]/10 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg text-sm font-medium text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-center text-[var(--on-surface-variant)] mt-6">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
              className="text-[var(--secondary)] hover:underline font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
