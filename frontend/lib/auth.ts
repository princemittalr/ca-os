/**
 * auth.ts — Session helpers that delegate to the Supabase SDK.
 *
 * The SDK persists the session in its own namespaced localStorage key and
 * auto-refreshes the JWT before expiry. We never read/write access_token
 * or profile keys (full_name, role, firm_id) to localStorage directly.
 *
 * Single source of truth for user identity: getCurrentUserMeta()
 */
import { supabase } from './supabase'

/**
 * Returns the current access token from the live Supabase session.
 * Always up-to-date — the SDK refreshes it automatically.
 * Returns null when the user is not authenticated.
 */
export async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * Signs the user out via Supabase (clears SDK storage server-side).
 * No manual localStorage cleanup required — the SDK manages its own keys.
 */
export async function clearAuth(): Promise<void> {
  await supabase.auth.signOut()
}

/**
 * Returns the currently authenticated Supabase user, or null.
 * Prefer getCurrentUserMeta() for structured profile data.
 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

/**
 * Returns structured profile metadata from the authenticated Supabase user.
 * This is the single source of truth for user identity — replaces all
 * localStorage.getItem("role"), getItem("full_name"), etc. calls.
 *
 * Returns null if the user is not authenticated.
 */
export async function getCurrentUserMeta(): Promise<{
  user_id: string
  firm_id: string
  role: string
  full_name: string
  email: string
} | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const meta = user.user_metadata || {}
  return {
    user_id: user.id,
    firm_id: meta.firm_id || '',
    role: meta.role || 'ARTICLE',
    full_name: meta.full_name || '',
    email: user.email || '',
  }
}
