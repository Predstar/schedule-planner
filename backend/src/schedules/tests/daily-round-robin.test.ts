import { describe, expect, it } from 'vitest';
import { solveSchedule, type SolverEmployee, type SolverSlot } from '../schedules.service';

type Avail = 'no' | 'morning' | 'evening' | 'both';

const MORNING = { startTime: '12:00', endTime: '16:00' };
const EVENING = { startTime: '18:00', endTime: '22:00' };

const days = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26'];

function e(id: string, weekAvail: Avail[], opts: { employmentType?: 'FULL_TIME' | 'PART_TIME'; weeklyHourLimit?: number; historicalMinutes?: number } = {}): SolverEmployee {
  const availability: SolverEmployee['availability'] = [];
  weekAvail.forEach((a, i) => {
    const date = days[i];
    if (a === 'morning' || a === 'both') availability.push({ date, ...MORNING, available: true, preferred: false });
    if (a === 'evening' || a === 'both') availability.push({ date, ...EVENING, available: true, preferred: false });
  });
  return {
    id,
    employeeRole: 'RUNNER',
    weeklyHourLimit: opts.weeklyHourLimit ?? 20,
    employmentType: opts.employmentType ?? 'PART_TIME',
    historicalMinutes: opts.historicalMinutes ?? 0,
    availability,
  };
}

describe('solveSchedule: daily round-robin (real-world reported scenario)', () => {
  it('does not give a part-timer a same-day double shift while another eligible-that-day part-timer has none, except on the last day when only they are available', () => {
    // Availability grid from the user's spreadsheet (Mon..Sun).
    const employees: SolverEmployee[] = [
      e('bhawana', ['no', 'both', 'both', 'both', 'both', 'both', 'no'], { employmentType: 'FULL_TIME', weeklyHourLimit: 40, historicalMinutes: 20 * 60 }),
      e('sanket', ['both', 'both', 'both', 'both', 'both', 'both', 'both']),
      e('varun', ['both', 'both', 'both', 'both', 'morning', 'no', 'no']),
      e('mayur', ['no', 'evening', 'no', 'evening', 'morning', 'no', 'no']),
      e('vamsi', ['evening', 'both', 'both', 'both', 'morning', 'both', 'no']),
      e('bhargav', ['evening', 'both', 'morning', 'both', 'morning', 'both', 'no']),
      e('premit', ['no', 'no', 'morning', 'morning', 'morning', 'no', 'no']),
      e('furkan', ['both', 'both', 'both', 'both', 'both', 'both', 'both']),
      e('vishakha', ['both', 'both', 'both', 'no', 'no', 'both', 'no']),
      e('bharath', ['morning', 'evening', 'both', 'both', 'both', 'both', 'no']),
    ];

    const slots: SolverSlot[] = [];
    for (const date of days) {
      for (let seat = 0; seat < 3; seat++) slots.push({ date, role: 'RUNNER', startTime: MORNING.startTime, endTime: MORNING.endTime, seat });
      const eveningCount = (date === '2026-07-24' || date === '2026-07-25') ? 5 : 4;
      for (let seat = 0; seat < eveningCount; seat++) slots.push({ date, role: 'RUNNER', startTime: EVENING.startTime, endTime: EVENING.endTime, seat });
    }

    const { assignments } = solveSchedule(employees, slots);

    const slotsPerDay: Record<string, Record<string, number>> = {};
    for (const a of assignments) {
      (slotsPerDay[a.slot.date] ??= {})[a.employeeId] = (slotsPerDay[a.slot.date]?.[a.employeeId] ?? 0) + 1;
    }

    // On every day except the last (Sunday, where only Sanket and Furkan are
    // available at all), no part-timer should get both shifts of the day —
    // that's the same-day double-shift bug being guarded against.
    for (const date of days.slice(0, -1)) {
      for (const [employeeId, count] of Object.entries(slotsPerDay[date] ?? {})) {
        if (employeeId === 'bhawana') continue; // full-time is exempt by design
        expect(count, `${employeeId} got a same-day double shift on ${date}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
