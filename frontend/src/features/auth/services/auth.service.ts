import { apiClient, setToken, clearToken } from '../../../shared/lib/apiClient';
import type { LoginRequest, LoginResponse, RegisterRequest, CurrentUser } from '../../../shared/types/api.types';

const USER_KEY = 'currentUser';

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/register', data);
  setToken(res.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login', data);
  setToken(res.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('/auth/me');
}

export function getStoredUser(): LoginResponse['user'] | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function logout(): void {
  clearToken();
  localStorage.removeItem(USER_KEY);
}
