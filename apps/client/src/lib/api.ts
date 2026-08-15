export const API_BASE = 'http://localhost:3000';
// Or, if you want to use the same origin as the frontend (recommended for production):
 //export const API_BASE = 'http:localhost:8888';
/**
 * Fetch wrapper that uses relative paths — all requests go through
 * the same origin, proxied by Nginx to the Gateway.
 * e.g., GET /identity/login calls the identity service via the gateway.
 */
async function apiCall<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};

  const opts: RequestInit = {
    method,
    credentials: 'include', // Maintain session cookies
    headers,
  };

  if (body !== undefined) {
    if (method === 'GET') {
      throw new Error('GET requests must not include a body');
    }

    // Allow FormData / Blob and similar body types to be passed through
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      opts.body = body as BodyInit;
      // Let the browser set Content-Type (with boundary)
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

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return res.json();
  }

  // Fallback: return plain text for non-JSON responses
  const text = await res.text();
  return text as unknown as T;
}

export default apiCall;
