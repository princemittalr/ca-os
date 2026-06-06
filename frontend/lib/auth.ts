/**
 * auth.ts — Session helpers that delegate to the Supabase SDK.
 *
 * The SDK persists the session in localStorage under its own namespaced key
 * and auto-refreshes the JWT before expiry. We never touch access_token directly.
 *
 * Note: full_name / role / firm_id are still written to localStorage by the
 * auth pages (login / signup) so that Sidebar and TopBar can read them
 * synchronously. Those will be migrated to read from user_metadata in a
 * follow-up prompt once all consumers are updated.
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
 * Signs the user out via Supabase (clears SDK storage) and removes
 * profile metadata that was manually written to localStorage.
 */
export async function clearAuth(): Promise<void> {
  await supabase.auth.signOut()
  // Remove profile metadata kept for sidebar/topbar compatibility
  localStorage.removeItem('full_name')
  localStorage.removeItem('role')
  localStorage.removeItem('firm_id')
  localStorage.removeItem('user_id')
}

/**
 * Returns the currently authenticated Supabase user, or null.
 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}
