/**
 * api.ts — Centralized API client for all backend requests.
 *
 * Automatically injects the Supabase JWT access token as an
 * Authorization: Bearer <token> header on every request.
 * On 401 responses, signs the user out and redirects to /login.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const data = await api.get('/api/clients/');
 *   const result = await api.post('/api/action-center', { ... });
 */

import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Builds common headers including the Authorization token from the
 * live Supabase session. Content-Type is set to application/json.
 */
async function getHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Handles 401 responses by signing out and redirecting to /login.
 * Re-throws all errors so per-page error handling still works.
 */
async function handleResponse(res: Response): Promise<Response> {
  if (res.status === 401) {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized — session expired');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res;
}

export const api = {
  /**
   * GET request — returns parsed JSON.
   */
  async get<T = unknown>(path: string): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, { headers });
    const handled = await handleResponse(res);
    return handled.json() as Promise<T>;
  },

  /**
   * POST request with a JSON body — returns parsed JSON.
   */
  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const handled = await handleResponse(res);
    return handled.json() as Promise<T>;
  },

  /**
   * PUT request with a JSON body — returns parsed JSON.
   */
  async put<T = unknown>(path: string, body: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    const handled = await handleResponse(res);
    return handled.json() as Promise<T>;
  },

  /**
   * PATCH request with a JSON body — returns parsed JSON.
   */
  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const handled = await handleResponse(res);
    return handled.json() as Promise<T>;
  },


  /**
   * DELETE request — returns parsed JSON.
   */
  async delete<T = unknown>(path: string): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers,
    });
    const handled = await handleResponse(res);
    return handled.json() as Promise<T>;
  },

  /**
   * POST request with a FormData body (for file uploads).
   * Does NOT set Content-Type — the browser sets it automatically
   * with the correct multipart boundary.
   */
  async postForm<T = unknown>(path: string, formData: FormData): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (res.status === 401) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized — session expired');
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  /**
   * GET request returning raw Blob (for file downloads).
   * Handles 401 auto-signout same as other methods.
   */
  async getBlob(path: string): Promise<Blob> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized — session expired');
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.blob();
  },
};
