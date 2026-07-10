const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { SchedulesService } = require('../dist/src/schedules/schedules.service');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const svc = app.get(SchedulesService);
    const result = await svc.autoGenerateSchedule('2026-07-20');
    console.log('Status:', result.status);
    console.log('Total assignments:', result.assignments.length);

    const byDayRoleSlot = {};
    for (const a of result.assignments) {
      const key = `${a.date}|${a.employeeRole}|${a.startTime}-${a.endTime}`;
      byDayRoleSlot[key] = (byDayRoleSlot[key] || 0) + 1;
    }
    console.log(JSON.stringify(byDayRoleSlot, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
