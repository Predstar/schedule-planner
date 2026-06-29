import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Manager123!', 10);

  for (const email of ['desaipremit1998@gmail.com', 'premit1998@gmail.com', 'premit.desai@tuhh.de']) {
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash: hash, active: true, systemRole: 'MANAGER' },
    });
    console.log(`✓ ${user.email} → MANAGER, active, password: Manager123!`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
