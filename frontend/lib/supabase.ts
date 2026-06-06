import { createClient } from '@supabase/supabase-js'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton — the only place in the codebase that calls createClient()
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Returns the current Supabase session (null if not authenticated).
 * Supabase SDK auto-refreshes the token before it expires.
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * Subscribes to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.).
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}