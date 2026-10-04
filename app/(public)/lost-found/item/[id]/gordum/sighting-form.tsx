'use client'

import { useRef, useState } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OpenInAppButton } from '@/components/open-in-app-button'
import {
  submitSighting,
  fileToBase64,
  MAX_PHOTO_BYTES,
  type SightingResult,
} from '@/lib/sighting'

type SeenMode = 'now' | 'today' | 'custom'
type Status = 'idle' | 'submitting' | 'success' | 'error'

const LOCATION_MAX = 500
const CONTACT_MAX = 200
const NOTE_MAX = 500
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// datetime-local wants a naive local "YYYY-MM-DDTHH:mm"
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Naive local input -> Date in the browser's time zone (null if unparseable).
function parseSeen(mode: SeenMode, time: string, dt: string): Date | null {
  if (mode === 'today') {
    const m = /^(\d{2}):(\d{2})$/.exec(time)
    if (!m) return null
    const d = new Date()
    d.setHours(Number(m[1]), Number(m[2]), 0, 0)
    return d
  }
  const d = new Date(dt)
  return Number.isNaN(d.getTime()) ? null : d
}

const FUTURE_MSG = 'Gelecekte bir saat seçilemez.'
const RANGE_MSG = 'Seçtiğin zaman bu ilan için geçerli değil.'

function errorMessageFor(result: SightingResult): string {
  switch (result) {
    case 'turnstile_failed':
      return 'Doğrulama başarısız, sayfayı yenileyip tekrar dene.'
    case 'rate_limited':
      return 'Çok fazla deneme oldu, biraz sonra tekrar dene.'
    case 'invalid_input':
    case 'seen_at_out_of_range':
    case 'error':
    default:
      return 'Bir şeyler ters gitti, tekrar dene.'
  }
}

export function SightingForm({
  lostFoundId,
  siteKey,
}: {
  lostFoundId: string
  siteKey: string
}) {
  const [location, setLocation] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [seenMode, setSeenMode] = useState<SeenMode>('now')
  const [seenTime, setSeenTime] = useState('')
  const [seenDt, setSeenDt] = useState('')
  const [seenError, setSeenError] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  if (status === 'success') {
    return (
      <div className="rounded-2xl border p-4 flex flex-col items-center gap-3 text-center">
        <p className="font-semibold">Bildirin için teşekkürler 🐾</p>
        <p className="text-sm text-muted-foreground">İlan sahibine iletildi.</p>
        <OpenInAppButton
          path={`/lost-found/item/${lostFoundId}`}
          label="Uygulamada Aç"
        />
      </div>
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setPhotoError(null)
    if (selected && !ALLOWED_PHOTO_TYPES.includes(selected.type)) {
      setPhotoError('Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsin.')
      setFile(null)
      e.target.value = ''
      return
    }
    if (selected && selected.size > MAX_PHOTO_BYTES) {
      setPhotoError('Fotoğraf 5 MB\'tan küçük olmalı.')
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(selected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location.trim() || !token || status === 'submitting') return

    let seenAt: string | undefined
    if (seenMode !== 'now') {
      const d = parseSeen(seenMode, seenTime, seenDt)
      if (!d) {
        setSeenError(RANGE_MSG)
        return
      }
      if (d.getTime() > Date.now()) {
        setSeenError(FUTURE_MSG)
        return
      }
      seenAt = d.toISOString()
    }
    setSeenError(null)
    setStatus('submitting')
    setErrorMsg(null)

    try {
      let photoBase64: string | undefined
      let photoMime: string | undefined
      if (file) {
        const encoded = await fileToBase64(file)
        photoBase64 = encoded.base64
        photoMime = encoded.mime
      }

      const result = await submitSighting({
        lostFoundId,
        locationText: location.trim(),
        note: note.trim() || undefined,
        reporterContact: contact.trim() || undefined,
        photoBase64,
        photoMime,
        seenAt,
        turnstileToken: token,
      })

      if (result === 'ok') {
        setStatus('success')
      } else {
        setStatus('error')
        if (result === 'seen_at_out_of_range') setSeenError(RANGE_MSG)
        else setErrorMsg(errorMessageFor(result))
        turnstileRef.current?.reset()
        setToken(null)
      }
    } catch {
      setStatus('error')
      setErrorMsg('Bir şeyler ters gitti, tekrar dene.')
      turnstileRef.current?.reset()
      setToken(null)
    }
  }

  const disabled = status === 'submitting' || !location.trim() || !token

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Nerede gördün? *</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value.slice(0, LOCATION_MAX))}
          maxLength={LOCATION_MAX}
          placeholder="Örn. Kadıköy, Moda sahili"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label id="seen-label">Ne zaman gördün?</Label>
        <div role="radiogroup" aria-labelledby="seen-label" className="flex flex-col gap-1.5">
        {(
          [
            ['now', 'Az önce'],
            ['today', 'Bugün içinde'],
            ['custom', 'Tarih ve saat seç'],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="seen-mode"
              checked={seenMode === value}
              onChange={() => {
                setSeenMode(value)
                setSeenError(null)
              }}
            />
            {text}
          </label>
        ))}
        {seenMode === 'today' && (
          <Input
            type="time"
            value={seenTime}
            aria-label="Görülme saati"
            onChange={(e) => {
              setSeenTime(e.target.value)
              setSeenError(null)
            }}
            required
          />
        )}
        {seenMode === 'custom' && (
          <Input
            type="datetime-local"
            value={seenDt}
            max={toLocalInput(new Date())}
            aria-label="Görülme tarihi ve saati"
            onChange={(e) => {
              setSeenDt(e.target.value)
              setSeenError(null)
            }}
            required
          />
        )}
        </div>
        {seenError && (
          <p role="alert" className="text-sm text-destructive">
            {seenError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact">İletişim bilgin (opsiyonel)</Label>
        <Input
          id="contact"
          value={contact}
          onChange={(e) => setContact(e.target.value.slice(0, CONTACT_MAX))}
          maxLength={CONTACT_MAX}
          placeholder="Telefon veya sosyal medya"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Not (opsiyonel)</Label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          maxLength={NOTE_MAX}
          rows={3}
          placeholder="Gördüğün an hakkında kısa bilgi"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo">Fotoğraf (opsiyonel)</Label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="text-sm"
        />
        {photoError && <p className="text-sm text-destructive">{photoError}</p>}
      </div>

      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={setToken}
        onError={() => setToken(null)}
        onExpire={() => setToken(null)}
      />

      {status === 'error' && errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      <Button type="submit" disabled={disabled} className="w-full">
        {status === 'submitting' ? 'Gönderiliyor…' : 'Gönder'}
      </Button>
    </form>
  )
}
