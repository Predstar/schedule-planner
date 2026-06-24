import { apiClient, setToken, clearToken } from '../../../shared/lib/apiClient';
import type { LoginRequest, LoginResponse, CurrentUser } from '../../../shared/types/api.types';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Remove this block and uncomment the real implementations below when the
// backend is ready. The response shapes are identical to API_CONTRACTS.md.

const MOCK_USERS: Record<string, LoginResponse> = {
  'manager@demo.com': {
    accessToken: 'mock-token-manager',
    tokenType: 'Bearer',
    user: { id: 'uuid-manager-1', email: 'manager@demo.com', systemRole: 'MANAGER' },
  },
  'employee@demo.com': {
    accessToken: 'mock-token-employee',
    tokenType: 'Bearer',
    user: { id: 'uuid-employee-1', email: 'employee@demo.com', systemRole: 'EMPLOYEE' },
  },
};

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────

export async function login(data: LoginRequest): Promise<LoginResponse> {
  // MOCK — replace with real call:
  // const res = await apiClient.post<LoginResponse>('/auth/login', data);
  const res = MOCK_USERS[data.email];
  if (!res) throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
  setToken(res.accessToken);
  return res;

  // REAL (uncomment when backend is ready):
  // const res = await apiClient.post<LoginResponse>('/auth/login', data);
  // setToken(res.accessToken);
  // return res;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  // MOCK — replace with real call:
  // return apiClient.get<CurrentUser>('/auth/me');
  return {
    id: 'uuid-manager-1',
    email: 'manager@demo.com',
    systemRole: 'MANAGER',
    employeeId: null,
  };
}

export function logout(): void {
  clearToken();
  // If backend adds a logout endpoint later:
  // await apiClient.post('/auth/logout', {});
}
