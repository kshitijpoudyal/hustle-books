// Public liveness check for Kshitij Studio. No database calls and no user data.
export function GET() {
  return Response.json(
    { data: { status: 'ok', appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null, time: new Date().toISOString() } },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
