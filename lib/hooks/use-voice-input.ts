'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceState = 'idle' | 'requesting' | 'listening' | 'processing' | 'error' | 'unsupported'

export interface UseVoiceInputReturn {
  state: VoiceState
  transcript: string
  interimTranscript: string
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
  readonly resultIndex: number
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
  const [interimTranscript, setInterimTranscript] = useState('')
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
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    setState('requesting')
    setErrorMessage(null)
    setTranscript('')
    setInterimTranscript('')

    recognition.onstart = () => {
      setState('listening')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) {
          final += text
        } else {
          interim += text
        }
      }
      if (interim) setInterimTranscript(interim)
      if (final) {
        setInterimTranscript('')
        setTranscript(final)
        setState('processing')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let message: string
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          message = 'Microphone permission denied. Check your browser site settings and try again.'
          break
        case 'no-speech':
          message = 'No speech detected. Speak clearly and try again.'
          break
        case 'network':
          message = 'Network error. Speech recognition needs an internet connection.'
          break
        case 'audio-capture':
          message = 'Could not access the microphone (audio-capture). It may be in use by another app or tab — close them and try again.'
          break
        case 'aborted':
          setState('idle')
          return
        default:
          message = `Speech recognition failed [${event.error}]. Try again.`
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
    setInterimTranscript('')
    setErrorMessage(null)
  }, [])

  useEffect(() => {
    return () => { recognitionRef.current?.abort() }
  }, [])

  return { state, transcript, interimTranscript, errorMessage, isSupported, start, stop, reset }
}
