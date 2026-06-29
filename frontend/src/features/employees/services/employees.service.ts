import { apiClient } from '../../../shared/lib/apiClient';
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  ListEmployeesParams,
  CreateEmployeeAccountRequest,
  UserAccount,
} from '../../../shared/types/api.types';

export async function listEmployees(params?: ListEmployeesParams): Promise<Employee[]> {
  const query = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
  return apiClient.get<Employee[]>(`/employees${query ? `?${query}` : ''}`);
}

export async function getEmployee(employeeId: string): Promise<Employee> {
  return apiClient.get<Employee>(`/employees/${employeeId}`);
}

export async function createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
  return apiClient.post<Employee>('/employees', data);
}

export async function updateEmployee(employeeId: string, data: UpdateEmployeeRequest): Promise<Employee> {
  return apiClient.put<Employee>(`/employees/${employeeId}`, data);
}

export async function deactivateEmployee(employeeId: string): Promise<void> {
  return apiClient.patch<void>(`/employees/${employeeId}/deactivate`);
}

export async function createEmployeeAccount(data: CreateEmployeeAccountRequest): Promise<UserAccount> {
  return apiClient.post<UserAccount>('/users/employees', data);
}
