import { describe, expect, it } from 'vitest';
import {
  getEmployeeAvailability,
  submitAvailability,
  updateAvailability,
} from './availability.service';

describe('availability.service', () => {
  it('updates availability with entries only and keeps SUBMITTED status', async () => {
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
      employeeId: created.employeeId,
      weekStartDate: created.weekStartDate,
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

    expect(updated.status).toBe('SUBMITTED');
    expect(updated.employeeId).toBe('employee-update-test');
    expect(updated.weekStartDate).toBe('2026-06-01');
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

  it('throws AVAILABILITY_NOT_FOUND when an employee availability record does not exist', async () => {
    await expect(
      getEmployeeAvailability('missing-employee', '2026-06-01'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'AVAILABILITY_NOT_FOUND',
    });
  });
});
