'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Delete, Clock } from 'lucide-react'

interface CalculatorModalProps {
  onClose: () => void
}

type CalcOp = '+' | '−' | '×' | '÷' | null

interface HistoryEntry {
  expression: string
  result: string
}

const STORAGE_STATE_KEY = 'calc_state'
const STORAGE_HISTORY_KEY = 'calc_history'
const MAX_HISTORY = 20

const BTN_BASE = 'flex items-center justify-center rounded-2xl font-headline font-bold text-xl h-14 w-full active:scale-95 transition-transform duration-75 select-none cursor-pointer'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_STATE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export default function CalculatorModal({ onClose }: CalculatorModalProps) {
  const saved = useRef(loadState())

  const [display, setDisplay] = useState<string>(saved.current?.display ?? '0')
  const [stored, setStored] = useState<number | null>(saved.current?.stored ?? null)
  const [op, setOp] = useState<CalcOp>(saved.current?.op ?? null)
  const [fresh, setFresh] = useState<boolean>(saved.current?.fresh ?? true)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [showHistory, setShowHistory] = useState(false)

  // Persist state whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify({ display, stored, op, fresh }))
    } catch {}
  }, [display, stored, op, fresh])

  // Persist history whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history))
    } catch {}
  }, [history])

  const appendDigit = useCallback((d: string) => {
    setDisplay(prev => {
      if (fresh) { setFresh(false); return d === '.' ? '0.' : d }
      if (d === '.' && prev.includes('.')) return prev
      if (prev === '0' && d !== '.') return d
      return prev.length >= 12 ? prev : prev + d
    })
  }, [fresh])

  const chooseOp = useCallback((next: CalcOp) => {
    const val = parseFloat(display)
    if (stored !== null && op && !fresh) {
      const result = compute(stored, val, op)
      setDisplay(fmt(result))
      setStored(result)
    } else {
      setStored(val)
    }
    setOp(next)
    setFresh(true)
  }, [display, stored, op, fresh])

  const equals = useCallback(() => {
    if (stored === null || !op) return
    const val = parseFloat(display)
    const result = compute(stored, val, op)
    const resultStr = fmt(result)
    const expression = `${fmt(stored)} ${op} ${display}`
    setHistory(prev => [{ expression, result: resultStr }, ...prev].slice(0, MAX_HISTORY))
    setDisplay(resultStr)
    setStored(null)
    setOp(null)
    setFresh(true)
  }, [stored, op, display])

  const clear = useCallback(() => {
    setDisplay('0'); setStored(null); setOp(null); setFresh(true)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const backspace = useCallback(() => {
    setDisplay(prev => {
      if (fresh || prev.length <= 1) return '0'
      return prev.slice(0, -1) || '0'
    })
  }, [fresh])

  const toggleSign = useCallback(() => {
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : prev === '0' ? '0' : '-' + prev)
  }, [])

  const percent = useCallback(() => {
    setDisplay(prev => fmt(parseFloat(prev) / 100))
  }, [])

  const recallHistory = useCallback((entry: HistoryEntry) => {
    setDisplay(entry.result)
    setStored(null)
    setOp(null)
    setFresh(true)
    setShowHistory(false)
  }, [])

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') appendDigit(e.key)
      else if (e.key === '.') appendDigit('.')
      else if (e.key === '+') chooseOp('+')
      else if (e.key === '-') chooseOp('−')
      else if (e.key === '*') chooseOp('×')
      else if (e.key === '/') { e.preventDefault(); chooseOp('÷') }
      else if (e.key === 'Enter' || e.key === '=') equals()
      else if (e.key === 'Backspace') backspace()
      else if (e.key === 'Escape') onClose()
      else if (e.key === 'c' || e.key === 'C') clear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [appendDigit, chooseOp, equals, backspace, clear, onClose])

  const isActiveOp = (o: CalcOp) => op === o && fresh

  return (
    <>
      {/* Floating panel — no backdrop so the rest of the app remains interactive */}
      <div
        className="fixed z-50 bottom-24 right-4 lg:bottom-8 lg:right-8 w-72 squircle overflow-hidden"
        style={{ boxShadow: '0 4px 16px rgba(30,58,95,0.25), 0 24px 60px rgba(30,58,95,0.45), 0 64px 120px rgba(30,58,95,0.30)', backgroundColor: 'var(--surface-container-low)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="font-label text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">Calculator</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHistory(h => !h)}
              aria-label="Toggle history"
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: showHistory ? 'var(--secondary)' : 'var(--surface-container-high)' }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: showHistory ? 'white' : 'var(--on-surface-variant)' }} strokeWidth={2} />
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-container-high)' }}>
              <X className="w-3.5 h-3.5 text-[var(--on-surface-variant)]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="px-3 pb-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--surface-container)' }}
            >
              {/* History header */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-label text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]">History</span>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="font-label text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70"
                    style={{ color: 'var(--error, #b3261e)' }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Entries */}
              <div className="max-h-36 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="px-3 pb-3 text-center font-label text-[10px] text-[var(--on-surface-variant)] opacity-50">
                    No history yet
                  </p>
                ) : (
                  history.map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => recallHistory(entry)}
                      className="w-full text-right px-3 py-1.5 transition-colors hover:opacity-80 active:scale-[0.98]"
                      style={{ borderTop: i > 0 ? '1px solid var(--surface-container-high)' : undefined }}
                    >
                      <p className="font-label text-[10px] text-[var(--on-surface-variant)] opacity-60 truncate">{entry.expression}</p>
                      <p className="font-headline font-bold text-sm text-[var(--primary)]">= {entry.result}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Display */}
        <div className="px-5 pb-3 pt-1">
          <div className="text-right">
            {op && stored !== null && (
              <p className="font-label text-xs text-[var(--on-surface-variant)] opacity-60 h-4">
                {fmt(stored)} {op}
              </p>
            )}
            {!(op && stored !== null) && <p className="h-4" />}
            <p
              className="font-headline font-black text-[var(--primary)] leading-none mt-1 overflow-hidden"
              style={{ fontSize: display.length > 9 ? '1.6rem' : display.length > 6 ? '2rem' : '2.5rem' }}
            >
              {display}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ backgroundColor: 'var(--surface-container-high)' }} />

        {/* Buttons */}
        <div className="p-4 grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <CalcBtn label="C" onClick={clear} variant="function" />
          <CalcBtn label="+/−" onClick={toggleSign} variant="function" />
          <CalcBtn label="%" onClick={percent} variant="function" />
          <CalcBtn label="÷" onClick={() => chooseOp('÷')} variant="op" active={isActiveOp('÷')} />
          {/* Row 2 */}
          <CalcBtn label="7" onClick={() => appendDigit('7')} />
          <CalcBtn label="8" onClick={() => appendDigit('8')} />
          <CalcBtn label="9" onClick={() => appendDigit('9')} />
          <CalcBtn label="×" onClick={() => chooseOp('×')} variant="op" active={isActiveOp('×')} />
          {/* Row 3 */}
          <CalcBtn label="4" onClick={() => appendDigit('4')} />
          <CalcBtn label="5" onClick={() => appendDigit('5')} />
          <CalcBtn label="6" onClick={() => appendDigit('6')} />
          <CalcBtn label="−" onClick={() => chooseOp('−')} variant="op" active={isActiveOp('−')} />
          {/* Row 4 */}
          <CalcBtn label="1" onClick={() => appendDigit('1')} />
          <CalcBtn label="2" onClick={() => appendDigit('2')} />
          <CalcBtn label="3" onClick={() => appendDigit('3')} />
          <CalcBtn label="+" onClick={() => chooseOp('+')} variant="op" active={isActiveOp('+')} />
          {/* Row 5 */}
          <CalcBtn label="⌫" onClick={backspace} />
          <CalcBtn label="0" onClick={() => appendDigit('0')} />
          <CalcBtn label="." onClick={() => appendDigit('.')} />
          <CalcBtn label="=" onClick={equals} variant="equals" />
        </div>
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function compute(a: number, b: number, op: CalcOp): number {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b === 0 ? 0 : a / b
    default: return b
  }
}

function fmt(n: number): string {
  if (!isFinite(n)) return 'Error'
  const s = parseFloat(n.toPrecision(10)).toString()
  return s.length > 12 ? parseFloat(n.toFixed(6)).toString() : s
}

// ── Button sub-component ──────────────────────────────────────────────────────

function CalcBtn({
  label, onClick, variant = 'digit', active = false, wide = false,
}: {
  label: string
  onClick: () => void
  variant?: 'digit' | 'function' | 'op' | 'equals'
  active?: boolean
  wide?: boolean
}) {
  const bg =
    active ? 'var(--primary)' :
    variant === 'equals' ? 'var(--secondary)' :
    variant === 'op' ? 'var(--primary)' :
    variant === 'function' ? 'var(--surface-container)' :
    'var(--surface-container-high)'

  const color =
    active ? 'white' :
    variant === 'equals' ? 'white' :
    variant === 'op' ? 'white' :
    variant === 'function' ? 'var(--on-surface-variant)' :
    'var(--on-surface)'

  return (
    <button
      onClick={onClick}
      className={`${BTN_BASE} ${wide ? 'col-span-2' : ''}`}
      style={{ backgroundColor: bg, color }}
    >
      {label === '⌫'
        ? <Delete className="w-5 h-5" strokeWidth={1.5} />
        : label}
    </button>
  )
}
