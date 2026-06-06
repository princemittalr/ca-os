// TODO: migrate to httpOnly cookie via Next.js API route in v2

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem("access_token");
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("full_name");
  localStorage.removeItem("role");
  localStorage.removeItem("firm_id");
}
