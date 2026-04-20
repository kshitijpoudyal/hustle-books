'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceState = 'idle' | 'requesting' | 'listening' | 'processing' | 'error' | 'unsupported'

export interface UseVoiceInputReturn {
  state: VoiceState
  transcript: string
  errorMessage: string | null
  isSupported: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

// Minimal ambient types for Web Speech API (not in TypeScript's strict DOM lib by default)
interface SpeechRecognitionResultItem {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionResultItem
  readonly length: number
  readonly isFinal: boolean
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult
  readonly length: number
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface WebSpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: WebSpeechRecognition, ev: Event) => void) | null
  onend: ((this: WebSpeechRecognition, ev: Event) => void) | null
  onresult: ((this: WebSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: WebSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
}

interface WebSpeechRecognitionConstructor {
  new (): WebSpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: WebSpeechRecognitionConstructor
    webkitSpeechRecognition?: WebSpeechRecognitionConstructor
  }
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Start as false to match SSR output; set to real value after mount
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<WebSpeechRecognition | null>(null)

  useEffect(() => {
    const supported =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    setIsSupported(supported)
    if (!supported) setState('unsupported')
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!isSupported) {
      setState('unsupported')
      return
    }

    const RecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!RecognitionAPI) return

    const recognition = new RecognitionAPI()
    recognitionRef.current = recognition

    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    setState('requesting')
    setErrorMessage(null)
    setTranscript('')

    recognition.onstart = () => {
      setState('listening')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setState('processing')
      const result = event.results[0]?.[0]?.transcript ?? ''
      setTranscript(result)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let message: string
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          message = 'Microphone access was denied. Please allow microphone permission and try again.'
          break
        case 'no-speech':
          message = 'No speech was detected. Please try speaking clearly near your microphone.'
          break
        case 'network':
          message = 'Network error. Speech recognition requires an internet connection.'
          break
        case 'audio-capture':
          message = 'No microphone found. Please connect a microphone and try again.'
          break
        case 'aborted':
          setState('idle')
          return
        default:
          message = `Speech recognition failed (${event.error}). Please try again.`
      }
      setErrorMessage(message)
      setState('error')
    }

    recognition.onend = () => {
      setState(prev => {
        if (prev === 'listening') {
          setErrorMessage('No speech detected. Try speaking clearly and try again.')
          return 'error'
        }
        if (prev === 'processing') return 'idle'
        return prev
      })
    }

    try {
      recognition.start()
    } catch {
      setErrorMessage('Failed to start speech recognition. Please try again.')
      setState('error')
    }
  }, [isSupported])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    setState('idle')
    setTranscript('')
    setErrorMessage(null)
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return { state, transcript, errorMessage, isSupported, start, stop, reset }
}
