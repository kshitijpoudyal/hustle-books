// Verifies Kshitij Studio request tokens: short-lived HS256 JWTs signed with STUDIO_APP_SECRET.
// Vendored from studio/lib/apps/token.ts (tested there). Keep the two in sync.
import { createHmac, timingSafeEqual } from 'node:crypto'

const STUDIO_ISSUER = 'https://studio.kshitijstudio.com'
const MAX_LIFETIME_S = 60
const CLOCK_SKEW_S = 30

export function verifyStudioToken(token: string, secret: string, appId: string, scope = 'read', now = Date.now()): boolean {
  try {
    if (!secret || secret.length < 32) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [h, p, s] = parts

    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'))
    if (header.alg !== 'HS256') return false

    const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest()
    const given = Buffer.from(s, 'base64url')
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false

    const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
    const nowS = Math.floor(now / 1000)
    if (claims.iss !== STUDIO_ISSUER || claims.aud !== appId) return false
    if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') return false
    if (claims.exp - claims.iat > MAX_LIFETIME_S) return false
    if (claims.exp + CLOCK_SKEW_S < nowS || claims.iat - CLOCK_SKEW_S > nowS) return false
    const scopes = typeof claims.scope === 'string' ? claims.scope.split(' ') : []
    return scopes.includes(scope)
  } catch {
    return false
  }
}

export function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}
