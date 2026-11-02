// GET /api/studio/v1/summary?period=YYYY-MM — the owner's profit summary for Kshitij Studio.
// Only accepts a valid Studio token, and only ever returns STUDIO_OWNER_EMAIL's data.
import { buildSummary, isPeriod, monthRange, previousPeriod } from '@/lib/studio/summary'
import { envelope, loadOwnerData, resolveOwner, STUDIO_APP_ID, studioConfigured, studioError } from '@/lib/studio/server'
import { bearerToken, verifyStudioToken } from '@/lib/studio/token'

export async function GET(request: Request) {
  if (!studioConfigured()) return studioError(503, 'unavailable', 'Studio API is not configured')
  if (!verifyStudioToken(bearerToken(request), process.env.STUDIO_APP_SECRET!, STUDIO_APP_ID, 'read')) {
    return studioError(401, 'unauthorized', 'Invalid or missing Studio token')
  }

  const param = new URL(request.url).searchParams.get('period')
  const period = isPeriod(param) ? param : new Date().toISOString().slice(0, 7)

  try {
    const owner = await resolveOwner()
    if (!owner) return studioError(503, 'unavailable', 'Owner account not found')

    const data = await loadOwnerData(owner.id, monthRange(previousPeriod(period)).start, monthRange(period).end)
    return Response.json(envelope(buildSummary({ period, ...data }), owner), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Studio summary failed:', error)
    return studioError(500, 'internal', 'Could not build the summary')
  }
}
