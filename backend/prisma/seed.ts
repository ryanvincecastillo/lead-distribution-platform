import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

/**
 * Seeds the admin account only.
 *
 * Brokers, the form and the distribution are deliberately NOT seeded: the reviewer
 * is expected to create those through the UI, and pre-creating the singleton form
 * would make the "cannot create a second form" check impossible to exercise.
 * Pass SEED_DEMO=1 to additionally create a few brokers across timezones.
 */
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: 'Administrator' },
  });

  console.log(`✓ admin ready: ${admin.email}`);
}

const DEMO_BROKERS = [
  {
    name: 'Manila Desk',
    email: 'manila@example.com',
    timezone: 'Asia/Manila',
    openingTime: '09:00',
    closingTime: '18:00',
    workingDays: '1,2,3,4,5',
    dailyCap: 10,
  },
  {
    name: 'London Desk',
    email: 'london@example.com',
    timezone: 'Europe/London',
    openingTime: '08:30',
    closingTime: '17:30',
    workingDays: '1,2,3,4,5',
    dailyCap: 6,
  },
  {
    name: 'New York Desk',
    email: 'ny@example.com',
    timezone: 'America/New_York',
    openingTime: '00:00',
    closingTime: '23:59',
    workingDays: '1,2,3,4,5,6,7',
    dailyCap: 4,
  },
];

async function seedDemoBrokers() {
  for (const broker of DEMO_BROKERS) {
    const existing = await prisma.broker.findFirst({ where: { name: broker.name } });
    if (existing) continue;
    await prisma.broker.create({ data: broker });
  }
  console.log(`✓ demo brokers ready (${DEMO_BROKERS.length})`);
}

async function main() {
  await seedAdmin();
  if (process.env.SEED_DEMO === '1') await seedDemoBrokers();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
