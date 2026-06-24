import { apiClient } from '../../../shared/lib/apiClient';
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  ListEmployeesParams,
} from '../../../shared/types/api.types';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'emp-1', firstName: 'James',  lastName: 'Wright', email: 'james@demo.com',  phone: '+1 555 000 0042', employmentType: 'FULL_TIME',  employeeRole: 'WAITER',     weeklyHourLimit: 40, active: true },
  { id: 'emp-2', firstName: 'Maria',  lastName: 'Lopez',  email: 'maria@demo.com',  phone: '+1 555 000 0043', employmentType: 'PART_TIME',  employeeRole: 'WAITER',     weeklyHourLimit: 25, active: true },
  { id: 'emp-3', firstName: 'Tom',    lastName: 'Baker',  email: 'tom@demo.com',    phone: '+1 555 000 0044', employmentType: 'PART_TIME',  employeeRole: 'RUNNER',     weeklyHourLimit: 20, active: true },
  { id: 'emp-4', firstName: 'Priya',  lastName: 'Patel',  email: 'priya@demo.com',  phone: '+1 555 000 0045', employmentType: 'FULL_TIME',  employeeRole: 'RUNNER',     weeklyHourLimit: 40, active: true },
  { id: 'emp-5', firstName: 'Carlos', lastName: 'Ruiz',   email: 'carlos@demo.com', phone: '+1 555 000 0046', employmentType: 'MINI_JOB',   employeeRole: 'BARTENDER',  weeklyHourLimit: 15, active: true },
  { id: 'emp-6', firstName: 'Aisha',  lastName: 'Khan',   email: 'aisha@demo.com',  phone: '+1 555 000 0047', employmentType: 'PART_TIME',  employeeRole: 'BARTENDER',  weeklyHourLimit: 25, active: true },
];

// ─── EMPLOYEES SERVICE ────────────────────────────────────────────────────────

export async function listEmployees(params?: ListEmployeesParams): Promise<Employee[]> {
  // MOCK — replace with:
  // const query = new URLSearchParams(params as Record<string, string>).toString();
  // return apiClient.get<Employee[]>(`/employees${query ? `?${query}` : ''}`);
  let results = [...MOCK_EMPLOYEES];
  if (params?.active !== undefined) results = results.filter(e => e.active === params.active);
  if (params?.employeeRole)         results = results.filter(e => e.employeeRole === params.employeeRole);
  if (params?.employmentType)       results = results.filter(e => e.employmentType === params.employmentType);
  return results;
}

export async function getEmployee(employeeId: string): Promise<Employee> {
  // MOCK — replace with:
  // return apiClient.get<Employee>(`/employees/${employeeId}`);
  const found = MOCK_EMPLOYEES.find(e => e.id === employeeId);
  if (!found) throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' };
  return found;
}

export async function createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
  // MOCK — replace with:
  // return apiClient.post<Employee>('/employees', data);
  const newEmployee: Employee = { id: `emp-${Date.now()}`, ...data, active: true };
  MOCK_EMPLOYEES.push(newEmployee);
  return newEmployee;
}

export async function updateEmployee(employeeId: string, data: UpdateEmployeeRequest): Promise<Employee> {
  // MOCK — replace with:
  // return apiClient.put<Employee>(`/employees/${employeeId}`, data);
  const idx = MOCK_EMPLOYEES.findIndex(e => e.id === employeeId);
  if (idx === -1) throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' };
  MOCK_EMPLOYEES[idx] = { ...MOCK_EMPLOYEES[idx], ...data };
  return MOCK_EMPLOYEES[idx];
}

export async function deactivateEmployee(employeeId: string): Promise<void> {
  // MOCK — replace with:
  // return apiClient.patch<void>(`/employees/${employeeId}/deactivate`);
  const idx = MOCK_EMPLOYEES.findIndex(e => e.id === employeeId);
  if (idx !== -1) MOCK_EMPLOYEES[idx].active = false;
}
