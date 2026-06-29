// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityPage } from './AvailabilityPage';

const getStoredUserMock = vi.fn();
const listEmployeesMock = vi.fn();
const getEmployeeAvailabilityMock = vi.fn();
const getWeeklyAvailabilityMock = vi.fn();
const submitAvailabilityMock = vi.fn();
const updateAvailabilityMock = vi.fn();

vi.mock('../../../shared/components/PhoneShell', () => ({
  PhoneShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../shared/components/StatusBar', () => ({
  StatusBar: () => <div>StatusBar</div>,
}));

vi.mock('../../../shared/components/BottomNav', () => ({
  BottomNav: () => <div>BottomNav</div>,
}));

vi.mock('../../auth/services/auth.service', () => ({
  getStoredUser: () => getStoredUserMock(),
}));

vi.mock('../../employees/services/employees.service', () => ({
  listEmployees: (...args: unknown[]) => listEmployeesMock(...args),
}));

vi.mock('../services/availability.service', () => ({
  getEmployeeAvailability: (...args: unknown[]) => getEmployeeAvailabilityMock(...args),
  getWeeklyAvailability: (...args: unknown[]) => getWeeklyAvailabilityMock(...args),
  submitAvailability: (...args: unknown[]) => submitAvailabilityMock(...args),
  updateAvailability: (...args: unknown[]) => updateAvailabilityMock(...args),
}));

function getMondayIsoOfCurrentWeek(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('AvailabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getStoredUserMock.mockReturnValue({
      id: 'user-1',
      email: 'employee@example.com',
      systemRole: 'EMPLOYEE',
      employeeId: 'emp-1',
    });
    listEmployeesMock.mockResolvedValue([]);
    getEmployeeAvailabilityMock.mockResolvedValue(null);
    getWeeklyAvailabilityMock.mockResolvedValue([]);
    submitAvailabilityMock.mockResolvedValue({
      id: 'avail-new',
      employeeId: 'emp-1',
      weekStartDate: getMondayIsoOfCurrentWeek(),
      status: 'SUBMITTED',
      entries: [],
    });
    updateAvailabilityMock.mockResolvedValue({
      id: 'avail-1',
      employeeId: 'emp-1',
      weekStartDate: getMondayIsoOfCurrentWeek(),
      status: 'SUBMITTED',
      entries: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a manager employee selector and loads weekly availability', async () => {
    const weekStartDate = getMondayIsoOfCurrentWeek();
    listEmployeesMock.mockResolvedValue([
      {
        id: 'emp-7',
        firstName: 'Maria',
        lastName: 'Lopez',
        email: 'maria@example.com',
        phone: null,
        employmentType: 'PART_TIME',
        employeeRole: 'WAITER',
        weeklyHourLimit: 25,
        active: true,
      },
    ]);

    render(<AvailabilityPage role="manager" />);

    expect(await screen.findByLabelText('Employee')).toBeInTheDocument();

    await waitFor(() => {
      expect(listEmployeesMock).toHaveBeenCalledWith({ active: true });
      expect(getWeeklyAvailabilityMock).toHaveBeenCalledWith(weekStartDate);
      expect(getEmployeeAvailabilityMock).toHaveBeenCalledWith('emp-7', weekStartDate);
    });
  });

  it('shows manager availability as read-only', async () => {
    const weekStartDate = getMondayIsoOfCurrentWeek();
    const secondDay = addDays(weekStartDate, 1);
    listEmployeesMock.mockResolvedValue([
      {
        id: 'emp-7',
        firstName: 'Maria',
        lastName: 'Lopez',
        email: 'maria@example.com',
        phone: null,
        employmentType: 'PART_TIME',
        employeeRole: 'WAITER',
        weeklyHourLimit: 25,
        active: true,
      },
    ]);

    getEmployeeAvailabilityMock.mockResolvedValue({
      id: 'avail-7',
      employeeId: 'emp-7',
      weekStartDate,
      status: 'SUBMITTED',
      entries: [
        {
          date: secondDay,
          startTime: '11:00',
          endTime: '17:00',
          available: true,
          preferred: false,
        },
      ],
    });

    render(<AvailabilityPage role="manager" />);

    await waitFor(() => {
      expect(getEmployeeAvailabilityMock).toHaveBeenCalledWith('emp-7', weekStartDate);
    });

    const morningButtons = await screen.findAllByRole('button', { name: /Morning Shift/i });
    expect(morningButtons[1]).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Submit Availability/i })).not.toBeInTheDocument();

    fireEvent.click(morningButtons[1]);

    expect(submitAvailabilityMock).not.toHaveBeenCalled();
    expect(updateAvailabilityMock).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /Morning Shift/i })[1]).toBeDisabled();
  });

  it('updates an existing employee availability with entries only', async () => {
    const weekStartDate = getMondayIsoOfCurrentWeek();
    getEmployeeAvailabilityMock.mockResolvedValue({
      id: 'avail-1',
      employeeId: 'emp-1',
      weekStartDate,
      status: 'SUBMITTED',
      entries: [
        {
          date: weekStartDate,
          startTime: '11:00',
          endTime: '17:00',
          available: true,
          preferred: false,
        },
      ],
    });

    render(<AvailabilityPage role="employee" />);

    const submitButton = await screen.findByRole('button', { name: /Update Availability/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateAvailabilityMock).toHaveBeenCalledTimes(1);
    });

    expect(updateAvailabilityMock).toHaveBeenCalledWith('avail-1', {
      entries: [
        {
          date: weekStartDate,
          startTime: '11:00',
          endTime: '17:00',
          available: true,
          preferred: false,
        },
      ],
    });
  });
});
