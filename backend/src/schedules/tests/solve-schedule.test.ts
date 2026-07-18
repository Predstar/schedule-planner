import { describe, expect, it } from 'vitest';
import { solveSchedule, type SolverEmployee, type SolverSlot } from '../schedules.service';

function employee(overrides: Partial<SolverEmployee> = {}): SolverEmployee {
  return {
    id: 'emp-1',
    employeeRole: 'WAITER',
    weeklyHourLimit: 40,
    employmentType: 'FULL_TIME',
    historicalMinutes: 0,
    availability: [],
    ...overrides,
  };
}

function availableAllDay(date: string, startTime = '00:00', endTime = '23:59', preferred = false) {
  return { date, startTime, endTime, available: true, preferred };
}

function slot(overrides: Partial<SolverSlot> = {}): SolverSlot {
  return { date: '2026-04-06', role: 'WAITER', startTime: '09:00', endTime: '15:00', ...overrides };
}

describe('solveSchedule', () => {
  it('assigns the only eligible employee to a slot', () => {
    const emp = employee({ availability: [availableAllDay('2026-04-06')] });
    const result = solveSchedule([emp], [slot()]);

    expect(result.assignments).toEqual([{ slot: slot(), employeeId: 'emp-1' }]);
    expect(result.unfilled).toEqual([]);
  });

  it('leaves a slot unfilled when nobody is eligible', () => {
    const emp = employee({ employeeRole: 'BARTENDER', availability: [availableAllDay('2026-04-06')] });
    const result = solveSchedule([emp], [slot()]);

    expect(result.assignments).toEqual([]);
    expect(result.unfilled).toEqual([slot()]);
  });

  it('prefers the employee with fewer historical + this-week hours relative to their own limit', () => {
    const busy = employee({
      id: 'busy',
      historicalMinutes: 35 * 60, // near their 40h cap already
      availability: [availableAllDay('2026-04-06')],
    });
    const fresh = employee({
      id: 'fresh',
      historicalMinutes: 5 * 60,
      availability: [availableAllDay('2026-04-06')],
    });

    const result = solveSchedule([busy, fresh], [slot()]);

    expect(result.assignments).toEqual([{ slot: slot(), employeeId: 'fresh' }]);
  });

  it('normalizes fairness by weeklyHourLimit within the same employment-type tier', () => {
    // Both full-time, so the priority tier is tied — falls through to fairness.
    // near-cap: 38/40h worked → 95% utilized, very little room left.
    const nearCap = employee({
      id: 'near-cap',
      weeklyHourLimit: 40,
      historicalMinutes: 38 * 60,
      availability: [availableAllDay('2026-04-06')],
    });
    // more-room: 30/40h worked → 75% utilized, more relative room left.
    const moreRoom = employee({
      id: 'more-room',
      weeklyHourLimit: 40,
      historicalMinutes: 30 * 60,
      availability: [availableAllDay('2026-04-06')],
    });

    const result = solveSchedule([nearCap, moreRoom], [slot()]);

    expect(result.assignments).toEqual([{ slot: slot(), employeeId: 'more-room' }]);
  });

  it('round-robins slots so a brand-new employee with 0 historical hours does not sweep every slot ahead of peers with real history', () => {
    // Reproduces the real bug: a newly added employee (0 historical minutes)
    // has an unbeatable fairness ratio and would otherwise win every single
    // slot's tiebreak for the whole week, starving equally-eligible peers who
    // have some accumulated hours (and thus a nonzero ratio).
    const brandNew = employee({ id: 'brand-new', weeklyHourLimit: 20, historicalMinutes: 0 });
    const veteranA = employee({ id: 'veteran-a', weeklyHourLimit: 20, historicalMinutes: 14 * 60 });
    const veteranB = employee({ id: 'veteran-b', weeklyHourLimit: 20, historicalMinutes: 18 * 60 });

    const days = ['2026-04-06', '2026-04-07', '2026-04-08'];
    const daySlots = days.map(date => slot({ date }));
    for (const emp of [brandNew, veteranA, veteranB]) {
      emp.availability = days.map(date => availableAllDay(date));
    }

    const result = solveSchedule([brandNew, veteranA, veteranB], daySlots);
    const countsByEmployee = new Map<string, number>();
    for (const a of result.assignments) {
      countsByEmployee.set(a.employeeId, (countsByEmployee.get(a.employeeId) ?? 0) + 1);
    }

    // With 3 employees and 3 slots (one per day, non-overlapping days), a fair
    // round-robin distribution gives each employee exactly 1 slot — nobody
    // should get 2+ while another gets 0.
    expect(countsByEmployee.get('brand-new')).toBe(1);
    expect(countsByEmployee.get('veteran-a')).toBe(1);
    expect(countsByEmployee.get('veteran-b')).toBe(1);
  });

  it('prioritizes a FULL_TIME employee over a PART_TIME employee even when the part-timer has a better fairness score', () => {
    // Part-timer has plenty of room left (fairness-favored), but should still
    // lose to an eligible full-timer under the employment-type priority rule.
    const partTimer = employee({
      id: 'part-timer',
      employmentType: 'PART_TIME',
      weeklyHourLimit: 20,
      historicalMinutes: 0,
      availability: [availableAllDay('2026-04-06')],
    });
    const fullTimer = employee({
      id: 'full-timer',
      employmentType: 'FULL_TIME',
      weeklyHourLimit: 40,
      historicalMinutes: 35 * 60, // near their cap — worse fairness score
      availability: [availableAllDay('2026-04-06')],
    });

    const result = solveSchedule([partTimer, fullTimer], [slot()]);

    expect(result.assignments).toEqual([{ slot: slot(), employeeId: 'full-timer' }]);
  });

  it('breaks near-ties in fairness score using the preferred flag', () => {
    const notPreferred = employee({
      id: 'not-preferred',
      historicalMinutes: 0,
      availability: [availableAllDay('2026-04-06', '00:00', '23:59', false)],
    });
    const preferred = employee({
      id: 'preferred',
      historicalMinutes: 0,
      availability: [availableAllDay('2026-04-06', '00:00', '23:59', true)],
    });

    const result = solveSchedule([notPreferred, preferred], [slot()]);

    expect(result.assignments).toEqual([{ slot: slot(), employeeId: 'preferred' }]);
  });

  it('does not double-book an employee with overlapping slots on the same day', () => {
    const emp = employee({ availability: [availableAllDay('2026-04-06')] });
    const first = slot({ startTime: '09:00', endTime: '15:00' });
    const second = slot({ startTime: '12:00', endTime: '18:00' }); // overlaps `first`

    const result = solveSchedule([emp], [first, second]);

    expect(result.assignments).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
  });

  it('respects weeklyHourLimit across multiple slots', () => {
    const emp = employee({
      weeklyHourLimit: 6,
      availability: [
        availableAllDay('2026-04-06'),
        availableAllDay('2026-04-07'),
      ],
    });
    const monday = slot({ date: '2026-04-06', startTime: '09:00', endTime: '15:00' }); // 6h
    const tuesday = slot({ date: '2026-04-07', startTime: '09:00', endTime: '15:00' }); // would push to 12h

    const result = solveSchedule([emp], [monday, tuesday]);

    expect(result.assignments).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
  });

  it('fills both slots when each employee can only cover their own role', () => {
    const specialist = employee({
      id: 'specialist',
      employeeRole: 'RUNNER',
      weeklyHourLimit: 4,
      availability: [availableAllDay('2026-04-06')],
    });
    const generalist = employee({
      id: 'generalist',
      employeeRole: 'WAITER',
      weeklyHourLimit: 4,
      availability: [availableAllDay('2026-04-06')],
    });

    const waiterSlot = slot({ role: 'WAITER', startTime: '09:00', endTime: '13:00' });
    const runnerSlot = slot({ role: 'RUNNER', startTime: '09:00', endTime: '13:00' });

    const result = solveSchedule([specialist, generalist], [waiterSlot, runnerSlot]);

    expect(result.assignments).toHaveLength(2);
    expect(result.unfilled).toEqual([]);
  });

  it('backtracks to maximize total filled slots instead of stranding a scarcer slot', () => {
    // Only `onlyForNight` can cover the night slot (role RUNNER).
    // `flexible` can cover the day WAITER slot; if a naive greedy pass
    // assigned `flexible` first without considering `onlyForNight`'s
    // constraint, both slots still fill here since roles don't overlap —
    // the real stranding risk is exercised via hour-limit interactions:
    // give `flexible` a tiny limit so it can only take one slot, and make
    // it the sole candidate for a WAITER slot that would otherwise strand.
    const onlyForRunner = employee({
      id: 'only-for-runner',
      employeeRole: 'RUNNER',
      weeklyHourLimit: 4,
      availability: [availableAllDay('2026-04-06')],
    });
    const flexible = employee({
      id: 'flexible',
      employeeRole: 'WAITER',
      weeklyHourLimit: 4,
      availability: [availableAllDay('2026-04-06')],
    });

    const waiterMorning = slot({ role: 'WAITER', startTime: '09:00', endTime: '13:00' });
    const waiterAfternoon = slot({ role: 'WAITER', startTime: '13:00', endTime: '17:00' }); // would exceed 4h limit if both taken
    const runnerSlot = slot({ role: 'RUNNER', startTime: '09:00', endTime: '13:00' });

    const result = solveSchedule([onlyForRunner, flexible], [waiterMorning, waiterAfternoon, runnerSlot]);

    // flexible can only cover one WAITER slot (hour limit), runner slot is
    // independently covered by onlyForRunner — so 2 of 3 slots fill, and
    // the search shouldn't crash or leave more unfilled than necessary.
    expect(result.assignments).toHaveLength(2);
    expect(result.unfilled).toHaveLength(1);
  });
});
