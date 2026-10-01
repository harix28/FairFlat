import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const hari = await prisma.user.upsert({
    where: { email: 'hari@example.com' },
    update: {},
    create: { name: 'Hari', email: 'hari@example.com', passwordHash },
  });

  const rahul = await prisma.user.upsert({
    where: { email: 'rahul@example.com' },
    update: {},
    create: { name: 'Rahul', email: 'rahul@example.com', passwordHash },
  });

  const aman = await prisma.user.upsert({
    where: { email: 'aman@example.com' },
    update: {},
    create: { name: 'Aman', email: 'aman@example.com', passwordHash },
  });

  const priya = await prisma.user.upsert({
    where: { email: 'priya@example.com' },
    update: {},
    create: { name: 'Priya', email: 'priya@example.com', passwordHash },
  });

  // Create group
  const group = await prisma.group.create({
    data: {
      name: 'Krishna Residency',
      members: {
        create: [
          { userId: hari.id, role: 'owner' },
          { userId: rahul.id },
          { userId: aman.id },
          { userId: priya.id },
        ],
      },
    },
  });

  console.log(`Created group: ${group.name}`);

  // Create demo expenses manually to simulate the engine having run
  // 1. Rent 20000 - everyone
  const rent = await prisma.expense.create({
    data: {
      groupId: group.id,
      payerId: hari.id,
      amount: 20000,
      title: 'Rent',
      category: 'Housing',
      splitType: 'equal',
      participants: {
        create: [
          { userId: hari.id, calculatedAmount: 5000 },
          { userId: rahul.id, calculatedAmount: 5000 },
          { userId: aman.id, calculatedAmount: 5000 },
          { userId: priya.id, calculatedAmount: 5000 },
        ]
      }
    }
  });

  // 2. Wi-Fi 1000 - everyone
  const wifi = await prisma.expense.create({
    data: {
      groupId: group.id,
      payerId: aman.id,
      amount: 1000,
      title: 'Wi-Fi',
      category: 'Utilities',
      splitType: 'equal',
      participants: {
        create: [
          { userId: hari.id, calculatedAmount: 250 },
          { userId: rahul.id, calculatedAmount: 250 },
          { userId: aman.id, calculatedAmount: 250 },
          { userId: priya.id, calculatedAmount: 250 },
        ]
      }
    }
  });

  // 3. Grocery 2000 - Hari/Rahul/Aman
  const grocery = await prisma.expense.create({
    data: {
      groupId: group.id,
      payerId: hari.id,
      amount: 2000,
      title: 'Grocery',
      category: 'Food',
      splitType: 'equal',
      participants: {
        create: [
          { userId: hari.id, calculatedAmount: 666.67 },
          { userId: rahul.id, calculatedAmount: 666.67 },
          { userId: aman.id, calculatedAmount: 666.66 },
        ]
      }
    }
  });

  console.log('Seeded expenses');
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
