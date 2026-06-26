import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityController } from '../availability.controller';
import { AvailabilityService } from '../availability.service';

describe('AvailabilityController', () => {
  const availabilityService = {
    submitAvailability: vi.fn(),
    updateAvailability: vi.fn(),
    listAvailability: vi.fn(),
  } as unknown as AvailabilityService;

  let controller: AvailabilityController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AvailabilityController(availabilityService);
  });

  it('passes auth user through on submit', async () => {
    availabilityService.submitAvailability = vi.fn().mockResolvedValue({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: '2026-04-06',
      status: 'SUBMITTED',
      entries: [],
    });

    const authUser = {
      id: 'user-1',
      email: 'john.doe@restaurant.com',
      systemRole: 'EMPLOYEE' as const,
      employeeId: 'employee-1',
    };

    await controller.submit(
      {
        employeeId: 'employee-1',
        weekStartDate: '2026-04-06',
        entries: [],
      },
      authUser,
    );

    expect(availabilityService.submitAvailability).toHaveBeenCalledWith(
      {
        employeeId: 'employee-1',
        weekStartDate: '2026-04-06',
        entries: [],
      },
      authUser,
    );
  });
});
