'use client';

import { useAuthStore } from '@/store/auth';

declare global {
  interface Window {
    lastApiCall?: {
      path: string;
      token: string | null;
      timestamp: string;
    };
  }
}

export const API_BASE = 'http://localhost:3000';
//export const API_BASE = '';
/**
 * Get the current token synchronously from the store.
 * Falls back to localStorage if store is not yet hydrated.
 */
export function getToken(): string | null {
  let token = useAuthStore.getState().token;
  
  // If token is null in store, try localStorage directly
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token');
    console.log('[getToken] Retrieved token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NULL');
  } else {
    console.log('[getToken] Retrieved token from store:', token ? `${token.substring(0, 20)}...` : 'NULL');
  }
  
  return token;
}

/**
 * Make an API call with automatic Authorization header if token is available.
 * Can be called from any client component.
 */
export async function apiCallWithAuth<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};

  // Add Authorization header if token is available
  const token = getToken();
  console.log('TOKEN USED IN REQUEST:', token);

  if (typeof window !== 'undefined') {
    window.lastApiCall = { path, token: token ? token.substring(0, 50) : null, timestamp: new Date().toISOString() };
  }
  
  console.log(`[apiCallWithAuth] Making ${method} request to ${path}`);
  console.log('[apiCallWithAuth] Token available:', !!token);
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('[apiCallWithAuth] Authorization header set');
  } else {
    console.warn('[apiCallWithAuth] ⚠️ NO TOKEN AVAILABLE!');
  }

  const opts: RequestInit = {
    method,
    credentials: 'include',
    headers,
  };

  if (body !== undefined) {
    if (method === 'GET') {
      throw new Error('GET requests must not include a body');
    }

    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      opts.body = body as BodyInit;
    } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
      opts.body = body as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  console.log('[apiCallWithAuth] Request headers:', headers);
  const res = await fetch(url, opts);

  if (!res.ok) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const parsed = await res.json().catch(() => null);
      const msg = parsed?.message ?? parsed?.error?.message ?? JSON.stringify(parsed) ?? res.statusText;
      const err = new Error(msg);
      (err as any).status = res.status;
      throw err;
    }

    const text = await res.text().catch(() => '');
    const err = new Error(text || `${res.status} ${res.statusText}`);
    (err as any).status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return res.json();
  }

  const text = await res.text();
  return text as unknown as T;
}

/**
 * Hook to get the apiCall function with access to the auth store.
 */
export function useApiCall() {
  const token = useAuthStore((state) => state.token); // 'token' is assigned a value but never used. Consider removing it or using it in the function.

  async function apiCall<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<T> {
    return apiCallWithAuth<T>(path, method, body);
  }

  return apiCall;
}

// Default export for backwards compatibility (login/register pages don't need auth)
async function apiCallDefault<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};

  const opts: RequestInit = {
    method,
    credentials: 'include',
    headers,
  };

  if (body !== undefined) {
    if (method === 'GET') {
      throw new Error('GET requests must not include a body');
    }

    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      opts.body = body as BodyInit;
    } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
      opts.body = body as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, opts);

  if (!res.ok) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const parsed = await res.json().catch(() => null);
      const msg = parsed?.message ?? parsed?.error?.message ?? JSON.stringify(parsed) ?? res.statusText;
      const err = new Error(msg);
      (err as any).status = res.status;
      throw err;
    }

    const text = await res.text().catch(() => '');
    const err = new Error(text || `${res.status} ${res.statusText}`);
    (err as any).status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return res.json();
  }

  const text = await res.text();
  return text as unknown as T;
}

export default apiCallDefault;
