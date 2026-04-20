'use client'

import { Mic, MicOff, Loader2, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { useVoiceInput } from '@/lib/hooks/use-voice-input'
import { parseVoiceTranscript, ParsedVoiceTransaction } from '@/lib/utils/voice-parser'
import { useEffect } from 'react'

interface VoiceInputButtonProps {
  hustleNames?: string[]
  onParsed: (result: ParsedVoiceTransaction) => void
  disabled?: boolean
}

export function VoiceInputButton({ hustleNames = [], onParsed, disabled }: VoiceInputButtonProps) {
  const { state, transcript, errorMessage, isSupported, start, stop, reset } = useVoiceInput()

  useEffect(() => {
    if (transcript) {
      const parsed = parseVoiceTranscript(transcript, hustleNames)
      onParsed(parsed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  // Surface errors via toast
  useEffect(() => {
    if (errorMessage) toast.error(errorMessage)
  }, [errorMessage])

  if (!isSupported) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full font-label text-[10px] uppercase tracking-[0.08rem]"
        style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)', opacity: 0.5 }}
        title="Speech recognition is not supported in this browser"
      >
        <WifiOff className="w-4 h-4" strokeWidth={1.5} />
        <span>Voice unavailable</span>
      </div>
    )
  }

  const isListening = state === 'listening'
  const isLoading = state === 'requesting' || state === 'processing'

  function handleClick() {
    if (isListening) { stop(); return }
    if (state === 'error') { reset(); return }
    start()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
      title={isListening ? 'Tap to stop' : 'Log by voice'}
      className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        backgroundColor: isListening ? 'rgba(180,60,40,0.1)' : 'var(--surface-container)',
        color: isListening ? 'var(--expense)' : 'var(--secondary)',
      }}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
      ) : state === 'error' ? (
        <MicOff className="w-5 h-5" strokeWidth={1.5} />
      ) : (
        <Mic className="w-5 h-5" strokeWidth={1.5} />
      )}
      {isListening && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: 'rgba(180,60,40,0.2)' }}
        />
      )}
    </button>
  )
}
