/**
 * Secure API Client
 * - Never persists tokens in localStorage or sessionStorage.
 * - Uses HttpOnly cookies (credentials: 'include') + in-memory access token fallback.
 * - Attaches X-Requested-With header for CSRF validation on state-changing routes.
 * - Transparently rotates refresh cookie on 401 responses.
 */

let inMemoryAccessToken: string | null = null;

export function setInMemoryAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getInMemoryAccessToken(): string | null {
  return inMemoryAccessToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          inMemoryAccessToken = null;
          return false;
        }
        const data = await res.json();
        if (data?.accessToken) {
          inMemoryAccessToken = data.accessToken;
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit & { skipAuthRefresh?: boolean } = {}
): Promise<T> {
  const { skipAuthRefresh, headers: customHeaders, body, ...rest } = options;
  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(customHeaders as Record<string, string>),
  };

  if (inMemoryAccessToken) {
    headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }

  let response = await fetch(path, {
    ...rest,
    body,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !skipAuthRefresh && !path.startsWith('/api/auth/')) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      if (inMemoryAccessToken) {
        headers.Authorization = `Bearer ${inMemoryAccessToken}`;
      }
      response = await fetch(path, {
        ...rest,
        body,
        headers,
        credentials: 'include',
      });
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (!response.ok) {
    const msg =
      typeof data === 'object' && data && 'error' in data
        ? String((data as any).error)
        : `Request failed (${response.status})`;
    throw new ApiError(msg, response.status);
  }

  return data as T;
}

export async function downloadAuthorizedFile(url: string, fallbackFilename: string): Promise<void> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (inMemoryAccessToken) {
    headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  const res = await fetch(url, { credentials: 'include', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Download failed' }));
    throw new ApiError(err.error || 'Authorized download failed', res.status);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}
