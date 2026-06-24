export type EmployeeRole = 'waiter' | 'runner' | 'bartender' | 'chef';

export interface Employee {
  id: number;
  initial: string;
  name: string;
  role: EmployeeRole;
  contract: string;
  section: string;
  worked: number;
  target: number;
  monthWorked: number;
  monthTarget: number;
  shifts: number;
}

export const TEAM: Employee[] = [
  { id: 1, initial: 'J', name: 'James Wright',  role: 'waiter',    contract: '40h/week', section: 'floor',    worked: 32, target: 40, monthWorked: 96,  monthTarget: 160, shifts: 5 },
  { id: 2, initial: 'M', name: 'Maria Lopez',   role: 'waiter',    contract: '20h/week', section: 'bar',      worked: 12, target: 20, monthWorked: 36,  monthTarget: 80,  shifts: 3 },
  { id: 3, initial: 'T', name: 'Tom Baker',     role: 'runner',    contract: '40h/week', section: 'kitchen',  worked: 8,  target: 40, monthWorked: 24,  monthTarget: 160, shifts: 2 },
  { id: 4, initial: 'P', name: 'Priya Patel',   role: 'runner',    contract: '30h/week', section: 'delivery', worked: 24, target: 30, monthWorked: 24,  monthTarget: 120, shifts: 7 },
  { id: 5, initial: 'C', name: 'Carlos Ruiz',   role: 'waiter',    contract: '40h/week', section: 'floor',    worked: 16, target: 40, monthWorked: 48,  monthTarget: 160, shifts: 4 },
  { id: 6, initial: 'A', name: 'Aisha Khan',    role: 'bartender', contract: '30h/week', section: 'bar',      worked: 28, target: 30, monthWorked: 84,  monthTarget: 120, shifts: 6 },
  { id: 7, initial: 'L', name: 'Luca Ferrari',  role: 'chef',      contract: '40h/week', section: 'kitchen',  worked: 38, target: 40, monthWorked: 114, monthTarget: 160, shifts: 5 },
];
