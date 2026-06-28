// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityPage } from './AvailabilityPage';

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

vi.mock('../../employees/services/employees.service', () => ({
  listEmployees: (...args: unknown[]) => listEmployeesMock(...args),
}));

vi.mock('../services/availability.service', () => ({
  getEmployeeAvailability: (...args: unknown[]) => getEmployeeAvailabilityMock(...args),
  getWeeklyAvailability: (...args: unknown[]) => getWeeklyAvailabilityMock(...args),
  submitAvailability: (...args: unknown[]) => submitAvailabilityMock(...args),
  updateAvailability: (...args: unknown[]) => updateAvailabilityMock(...args),
}));

describe('AvailabilityPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    vi.clearAllMocks();
    listEmployeesMock.mockResolvedValue([]);
    getEmployeeAvailabilityMock.mockRejectedValue({
      statusCode: 404,
      code: 'AVAILABILITY_NOT_FOUND',
    });
    getWeeklyAvailabilityMock.mockResolvedValue([]);
    submitAvailabilityMock.mockResolvedValue(undefined);
    updateAvailabilityMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a manager employee selector and loads weekly availability', async () => {
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
      expect(getWeeklyAvailabilityMock).toHaveBeenCalledWith('2026-06-01');
      expect(getEmployeeAvailabilityMock).toHaveBeenCalledWith('emp-7', '2026-06-01');
    });
  });

  it('updates an existing employee availability with entries only', async () => {
    getEmployeeAvailabilityMock.mockResolvedValue({
      id: 'avail-1',
      employeeId: 'emp-1',
      weekStartDate: '2026-06-01',
      status: 'SUBMITTED',
      entries: [
        {
          date: '2026-06-01',
          startTime: '11:00',
          endTime: '17:00',
          available: true,
          preferred: false,
        },
      ],
    });
    updateAvailabilityMock.mockResolvedValue({
      id: 'avail-1',
      employeeId: 'emp-1',
      weekStartDate: '2026-06-01',
      status: 'SUBMITTED',
      entries: [
        {
          date: '2026-06-01',
          startTime: '11:00',
          endTime: '17:00',
          available: true,
          preferred: false,
        },
      ],
    });

    render(<AvailabilityPage role="employee" />);

    const submitButton = await screen.findByRole('button', { name: 'Update Availability' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateAvailabilityMock).toHaveBeenCalledTimes(1);
    });

    expect(updateAvailabilityMock).toHaveBeenCalledWith('avail-1', {
      entries: [
        {
          date: '2026-06-01',
          startTime: '11:00',
          endTime: '17:00',
          available: true,
          preferred: false,
        },
      ],
    });
  });
});
