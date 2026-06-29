import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const managers = [
  { firstName: 'Pred', lastName: 'Desai', email: 'premit.desai@tuhh.de',   password: 'Arkhamnights20@' },
  { firstName: 'Poojan', lastName: 'Desai', email: 'premit1998@gmail.com', password: 'Arkhamnights98@' },
];

async function main() {
  for (const m of managers) {
    const existing = await prisma.user.findUnique({ where: { email: m.email } });
    if (existing) {
      console.log(`User ${m.email} already exists — skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(m.password, 10);
    const user = await prisma.user.create({
      data: {
        email: m.email,
        passwordHash,
        systemRole: 'MANAGER',
        employeeId: null,
        active: true,
      },
    });

    console.log(`✓ Manager created: ${user.email} (id: ${user.id})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
