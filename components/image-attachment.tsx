'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, X, Loader2, ZoomIn } from 'lucide-react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { AuthResponse } from '@supabase/supabase-js'

interface ImageAttachmentProps {
  value: string | null
  onChange: (url: string | null) => void
}

function FullscreenViewer({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(2,36,72,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
        aria-label="Close"
      >
        <X className="w-5 h-5 text-white" strokeWidth={1.5} />
      </button>
      <img
        src={src}
        alt="Receipt"
        className="max-w-[92vw] max-h-[88vh] rounded-3xl object-contain shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body
  )
}

export function ImageAttachment({ value, onChange }: ImageAttachmentProps) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void createClient().auth.getUser().then((res: AuthResponse) => setUserId(res.data.user?.id ?? null))
  }, [])

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image.'); return }
    if (!userId) { toast.error('Not authenticated.'); return }
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const supabase = createClient()
    const { error } = await supabase.storage.from('receipts').upload(path, file)
    if (error) { toast.error('Upload failed: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('receipts').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  const labelCls = 'font-label text-[10px] font-semibold uppercase tracking-[0.1rem] text-[var(--on-surface-variant)]'

  if (value) {
    return (
      <>
        <div className="bg-[var(--surface-container-low)] squircle px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="relative flex-shrink-0 group"
            aria-label="View receipt"
          >
            <img src={value} alt="Receipt" className="w-10 h-10 rounded-xl object-cover" />
            <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 group-active:bg-black/40 transition-colors flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            </div>
          </button>
          <span className={`${labelCls} flex-1`}>Receipt attached</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="w-7 h-7 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center flex-shrink-0"
            aria-label="Remove receipt"
          >
            <X className="w-3.5 h-3.5 text-[var(--on-surface-variant)]" strokeWidth={1.5} />
          </button>
        </div>

        {fullscreen && <FullscreenViewer src={value} onClose={() => setFullscreen(false)} />}
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files?.[0]
        if (f) upload(f)
      }}
      disabled={uploading}
      className={`w-full squircle px-5 py-4 flex items-center gap-3 transition-colors text-left disabled:cursor-not-allowed ${
        dragging ? 'bg-[var(--surface-container)]' : 'bg-[var(--surface-container-low)]'
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }}
      />
      {uploading
        ? <Loader2 className="w-4 h-4 text-[var(--on-surface-variant)] animate-spin flex-shrink-0" />
        : <Camera className="w-4 h-4 text-[var(--on-surface-variant)] flex-shrink-0" strokeWidth={1.5} />
      }
      <span className={labelCls}>
        {uploading ? 'Uploading…' : dragging ? 'Drop to attach' : 'Attach Receipt'}
      </span>
      <span className="ml-auto font-label text-[9px] text-[var(--on-surface-variant)] opacity-30">
        Optional
      </span>
    </button>
  )
}
