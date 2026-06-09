"use client";

// Root route — ClientLayoutWrapper handles all auth/redirect logic.
// We render null here; the wrapper will redirect to /login or /action-center
// based on session state. A server-side redirect() here races with the
// client-side auth check and causes the "Verifying session..." hang.
export default function RootPage() {
  return null;
}
