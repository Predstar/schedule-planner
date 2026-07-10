const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const RUNNER_TEMP_PASSWORD = 'Runner@2025';

const people = [
  { firstName: 'Janine', email: 'janine@authentikka.de', password: 'qwer1234', weeklyHourLimit: 40, employeeRole: 'WAITER' },
  { firstName: 'Bharath', email: 'bharath@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Chinmay', email: 'chinmay@authentikka.de', password: 'asdf1234', weeklyHourLimit: 20, employeeRole: 'BARTENDER' },
  { firstName: 'Khaled', email: 'khaled@authentikka.de', password: 'qwer1234', weeklyHourLimit: 40, employeeRole: 'WAITER' },
  { firstName: 'Bhawana', email: 'bhawana@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Pato', email: 'pato@authentikka.de', password: 'asdf1234', weeklyHourLimit: 40, employeeRole: 'BARTENDER' },
  { firstName: 'Mahdi', email: 'mahdi@authentikka.de', password: 'qwer1234', weeklyHourLimit: 40, employeeRole: 'WAITER' },
  { firstName: 'Sanket', email: 'sanket@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Emanauel', email: 'emanauel@authentikka.de', password: 'asdf1234', weeklyHourLimit: 40, employeeRole: 'BARTENDER' },
  { firstName: 'Noah', email: 'naoh@authentikka.de', password: 'qwer1234', weeklyHourLimit: 12, employeeRole: 'WAITER' },
  { firstName: 'Varun', email: 'varun@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Diago', email: 'diago@authentikka.de', password: 'asdf1234', weeklyHourLimit: 40, employeeRole: 'BARTENDER' },
  { firstName: 'Ramisch', email: 'ramisch@authentikk.de', password: 'qwer1234', weeklyHourLimit: 40, employeeRole: 'WAITER' },
  { firstName: 'Mayur', email: 'mayur@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Renu', email: 'renu@authentikk.de', password: 'qwer1234', weeklyHourLimit: 40, employeeRole: 'WAITER' },
  { firstName: 'Vamsi', email: 'vamsi@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Clara', email: 'clara@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Bhargav', email: 'bhargav@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Dave', email: 'dave@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Premit', email: 'premit@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Doni', email: 'doni@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Furkan', email: 'furkan@authentikka.de', password: RUNNER_TEMP_PASSWORD, weeklyHourLimit: 20, employeeRole: 'RUNNER' },
  { firstName: 'Elina', email: 'elina@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Evelin', email: 'evelin@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Jule', email: 'jule@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Marina', email: 'marina@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Philippa', email: 'philippa@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Samay', email: 'samay@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Suzata', email: 'suzata@authentikk.de', password: 'qwer1234', weeklyHourLimit: 20, employeeRole: 'WAITER' },
  { firstName: 'Tariq', email: 'tariq@authentikk.de', password: 'qwer1234', weeklyHourLimit: 40, employeeRole: 'WAITER' },
];

function employmentTypeFor(hours) {
  if (hours >= 40) return 'FULL_TIME';
  if (hours <= 12) return 'MINI_JOB';
  return 'PART_TIME';
}

async function main() {
  const beforeUsers = await prisma.user.count();
  const beforeEmployees = await prisma.employee.count();
  console.log(`Existing rows -> users: ${beforeUsers}, employees: ${beforeEmployees}`);

  await prisma.user.deleteMany({});
  await prisma.scheduleAssignment.deleteMany({});
  await prisma.availabilityEntry.deleteMany({});
  await prisma.availability.deleteMany({});
  await prisma.employee.deleteMany({});

  for (const p of people) {
    const passwordHash = await bcrypt.hash(p.password, 10);
    const employee = await prisma.employee.create({
      data: {
        firstName: p.firstName,
        lastName: '',
        email: p.email,
        employmentType: employmentTypeFor(p.weeklyHourLimit),
        employeeRole: p.employeeRole,
        weeklyHourLimit: p.weeklyHourLimit,
      },
    });
    await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        firstName: p.firstName,
        lastName: '',
        systemRole: 'EMPLOYEE',
        employeeId: employee.id,
      },
    });
  }

  const afterUsers = await prisma.user.count();
  const afterEmployees = await prisma.employee.count();
  console.log(`Inserted -> users: ${afterUsers}, employees: ${afterEmployees}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
