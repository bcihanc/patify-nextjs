// lib/sighting.ts
// Client-side helper: POST an anonymous sighting to the submit-lost-found-sighting
// Edge Function (verify_jwt=false, CORS *). No Authorization header needed.

export type SightingResult =
  | 'ok'
  | 'turnstile_failed'
  | 'rate_limited'
  | 'invalid_input'
  | 'error'

export type SightingInput = {
  lostFoundId: string
  locationText: string
  note?: string
  reporterContact?: string
  photoBase64?: string
  photoMime?: string
  turnstileToken: string
}

const FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lost-found-sighting`

export async function submitSighting(input: SightingInput): Promise<SightingResult> {
  try {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lost_found_id: input.lostFoundId,
        location_text: input.locationText,
        note: input.note || undefined,
        reporter_contact: input.reporterContact || undefined,
        photo_base64: input.photoBase64 || undefined,
        photo_mime: input.photoMime || undefined,
        turnstile_token: input.turnstileToken,
      }),
    })
    if (res.status === 201) return 'ok'
    if (res.status === 403) return 'turnstile_failed'
    if (res.status === 429) return 'rate_limited'
    if (res.status === 400) return 'invalid_input'
    return 'error'
  } catch {
    return 'error'
  }
}

// Reads an image File into RAW base64 (no data: URL prefix — the Edge Function
// runs atob() on it) plus its mime type. Rejects > 5 MB.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export function fileToBase64(
  file: File,
): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_PHOTO_BYTES) {
      reject(new Error('too_large'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip "data:<mime>;base64," prefix
      const comma = result.indexOf(',')
      resolve({ base64: result.slice(comma + 1), mime: file.type })
    }
    reader.onerror = () => reject(new Error('read_failed'))
    reader.readAsDataURL(file)
  })
}
