// Base API client — swap BASE_URL to point at the real NestJS server when ready.
// All service files go through this — never call fetch directly in components.

const BASE_URL = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function setToken(token: string): void {
  localStorage.setItem('accessToken', token);
}

export function clearToken(): void {
  localStorage.removeItem('accessToken');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const apiClient = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)   => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),
};
