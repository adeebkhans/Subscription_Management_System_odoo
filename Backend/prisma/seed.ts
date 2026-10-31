import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const database = new PrismaClient();

async function seed() {
  const admin = await database.user.upsert({
    where: { email: 'admin@brightloop.test' },
    update: {},
    create: {
      email: 'admin@brightloop.test',
      name: 'Brightloop Admin',
      passwordHash: await argon2.hash('Admin@1234'),
      role: 'ADMIN'
    }
  });

  await database.user.upsert({
    where: { email: 'staff@brightloop.test' },
    update: {},
    create: {
      email: 'staff@brightloop.test',
      name: 'Brightloop Staff',
      passwordHash: await argon2.hash('Staff@1234'),
      role: 'STAFF'
    }
  });

  await database.user.upsert({
    where: { email: 'customer@brightloop.test' },
    update: {},
    create: {
      email: 'customer@brightloop.test',
      name: 'Small Shop Owner',
      passwordHash: await argon2.hash('Customer@1234'),
      role: 'CUSTOMER'
    }
  });

  for (const term of [
    { name: 'Due on receipt', dueDays: 0 },
    { name: 'Net 15', dueDays: 15 },
    { name: 'Net 30', dueDays: 30 }
  ]) {
    await database.paymentTerm.upsert({
      where: { name: term.name },
      update: {},
      create: term
    });
  }

  const monthly = await database.plan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Business Monthly',
      price: 1500,
      frequency: 'MONTHLY',
      minimumQuantity: 1,
      createdById: admin.id
    }
  });

  await database.plan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Business Yearly',
      price: 15000,
      frequency: 'YEARLY',
      minimumQuantity: 1,
      autoClose: true,
      createdById: admin.id
    }
  });

  const suite = await database.product.upsert({
    where: { id: '00000000-0000-4000-8000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000101',
      name: 'Business Suite',
      type: 'SERVICE',
      salesPrice: 1500,
      costPrice: 400,
      notes: 'Core subscription bundle',
      createdById: admin.id
    }
  });

  await database.productVariant.upsert({
    where: {
      productId_attribute_value: {
        productId: suite.id,
        attribute: 'Brand',
        value: 'Odoo'
      }
    },
    update: {},
    create: {
      productId: suite.id,
      attribute: 'Brand',
      value: 'Odoo',
      extraPrice: 560
    }
  });

  await database.product.upsert({
    where: { id: '00000000-0000-4000-8000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000102',
      name: 'Priority Support',
      type: 'SERVICE',
      salesPrice: 350,
      costPrice: 120,
      createdById: admin.id
    }
  });

  console.info(`Seeded admin ${admin.email} and plan ${monthly.name}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => database.$disconnect());
