const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WEEK_START = '2026-07-20'; // next Monday

// Must match ROLE_SHIFT_SLOTS in frontend AvailabilityPage.tsx and shiftTemplates
// in backend schedules.service.ts exactly.
const SHIFTS_BY_ROLE = {
  WAITER: [
    { startTime: '10:00', endTime: '17:00' },
    { startTime: '17:00', endTime: '23:00' },
  ],
  RUNNER: [
    { startTime: '12:00', endTime: '16:00' },
    { startTime: '18:00', endTime: '20:00' },
  ],
  BARTENDER: [
    { startTime: '10:00', endTime: '17:00' },
    { startTime: '16:30', endTime: '23:00' },
  ],
};

function dateStr(weekStart, dayOffset) {
  const d = new Date(weekStart + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

// Deterministic pseudo-random per employee so results are reproducible but varied
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

async function main() {
  const employees = await prisma.employee.findMany({ where: { active: true } });
  console.log(`Seeding availability for ${employees.length} employees, week ${WEEK_START}`);

  const summary = [];

  for (const emp of employees) {
    const rand = seededRandom(emp.id.split('-').reduce((a, c) => a + c.charCodeAt(0), 0));
    const shiftOptions = SHIFTS_BY_ROLE[emp.employeeRole];

    const daysToWork =
      emp.employmentType === 'FULL_TIME' ? 5 + Math.round(rand())
      : emp.employmentType === 'PART_TIME' ? 3 + Math.round(rand())
      : 2;

    const dayIndices = Array.from({ length: 7 }, (_, i) => i);
    dayIndices.sort(() => rand() - 0.5);
    const chosenDays = dayIndices.slice(0, daysToWork).sort((a, b) => a - b);

    const entries = [];
    const daySummaries = [];

    for (const dayOffset of chosenDays) {
      const takeBoth = rand() > 0.7;
      const slots = takeBoth ? shiftOptions : [shiftOptions[Math.round(rand())]];

      for (const slot of slots) {
        const preferred = rand() > 0.6;
        entries.push({
          date: new Date(dateStr(WEEK_START, dayOffset) + 'T00:00:00Z'),
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: true,
          preferred,
        });
        daySummaries.push(
          `${dateStr(WEEK_START, dayOffset)} ${slot.startTime}-${slot.endTime}${preferred ? ' (preferred)' : ''}`,
        );
      }
    }

    const availability = await prisma.availability.upsert({
      where: { employeeId_weekStartDate: { employeeId: emp.id, weekStartDate: new Date(WEEK_START + 'T00:00:00Z') } },
      update: {
        status: 'SUBMITTED',
        entries: { deleteMany: {}, create: entries },
      },
      create: {
        employeeId: emp.id,
        weekStartDate: new Date(WEEK_START + 'T00:00:00Z'),
        status: 'SUBMITTED',
        entries: { create: entries },
      },
    });

    summary.push({
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      email: emp.email,
      role: emp.employeeRole,
      employmentType: emp.employmentType,
      weeklyHourLimit: emp.weeklyHourLimit,
      availabilityId: availability.id,
      slots: daySummaries,
    });
  }

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nDone. Submitted availability for ${summary.length} employees for week starting ${WEEK_START}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
