import { apiClient, setToken, clearToken } from '../../../shared/lib/apiClient';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ConfirmEmailRequest,
  CurrentUser,
} from '../../../shared/types/api.types';

const USER_KEY = 'currentUser';

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse>('/auth/register', data);
}

export async function confirmEmail(data: ConfirmEmailRequest): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/confirm', data);
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

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout', undefined);
  } catch {
    // ignore — clear local session regardless of network/API state
  }
  clearToken();
  localStorage.removeItem(USER_KEY);
}
