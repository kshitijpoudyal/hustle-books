import { createBrowserClient } from '@supabase/ssr'

// Use globalThis to survive Next.js HMR hot-reloads — without this, each
// module re-evaluation creates a second client that races to refresh the token,
// producing "lock was released because another request stole it" warnings.
declare global {
  // eslint-disable-next-line no-var
  var _supabaseBrowserClient: ReturnType<typeof createBrowserClient> | undefined
}

export function createClient() {
  if (!globalThis._supabaseBrowserClient) {
    globalThis._supabaseBrowserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return globalThis._supabaseBrowserClient
}
