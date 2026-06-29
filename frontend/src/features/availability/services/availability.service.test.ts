import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getEmployeeAvailability,
  submitAvailability,
  updateAvailability,
} from './availability.service';

describe('availability.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('uses the documented employee availability endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'avail-1',
        employeeId: 'employee-1',
        weekStartDate: '2026-06-01',
        status: 'SUBMITTED',
        entries: [],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await getEmployeeAvailability('employee-1', '2026-06-01');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/employees/employee-1/availability?weekStartDate=2026-06-01',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('updates availability with entries only', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'availability-1',
          employeeId: 'employee-update-test',
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'availability-1',
          employeeId: 'employee-update-test',
          weekStartDate: '2026-06-01',
          status: 'SUBMITTED',
          entries: [
            {
              date: '2026-06-02',
              startTime: '17:00',
              endTime: '23:00',
              available: true,
              preferred: false,
            },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const created = await submitAvailability({
      employeeId: 'employee-update-test',
      weekStartDate: '2026-06-01',
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

    const updated = await updateAvailability(created.id, {
      entries: [
        {
          date: '2026-06-02',
          startTime: '17:00',
          endTime: '23:00',
          available: true,
          preferred: false,
        },
      ],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/availability/availability-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          entries: [
            {
              date: '2026-06-02',
              startTime: '17:00',
              endTime: '23:00',
              available: true,
              preferred: false,
            },
          ],
        }),
      }),
    );
    expect(updated.status).toBe('SUBMITTED');
    expect(updated.entries).toEqual([
      {
        date: '2026-06-02',
        startTime: '17:00',
        endTime: '23:00',
        available: true,
        preferred: false,
      },
    ]);
  });

  it('returns null when an employee availability record does not exist', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        statusCode: 404,
        code: 'AVAILABILITY_NOT_FOUND',
        message: 'Availability not found',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(getEmployeeAvailability('missing-employee', '2026-06-01')).resolves.toBeNull();
  });
});
