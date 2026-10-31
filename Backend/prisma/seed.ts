import 'dotenv/config';
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

  const staff = await database.user.upsert({
    where: { email: 'staff@brightloop.test' },
    update: { isActive: true },
    create: {
      email: 'staff@brightloop.test',
      name: 'Brightloop Staff',
      passwordHash: await argon2.hash('Staff@1234'),
      role: 'STAFF'
    }
  });

  const customer = await database.user.upsert({
    where: { email: 'customer@brightloop.test' },
    update: { isActive: true },
    create: {
      email: 'customer@brightloop.test',
      name: 'Small Shop Owner',
      passwordHash: await argon2.hash('Customer@1234'),
      role: 'CUSTOMER'
    }
  });

  const agencyCustomer = await database.user.upsert({
    where: { email: 'agency@brightloop.test' },
    update: { isActive: true },
    create: {
      email: 'agency@brightloop.test',
      name: 'Northstar Agency',
      passwordHash: await argon2.hash('Customer@1234'),
      role: 'CUSTOMER'
    }
  });

  const startupCustomer = await database.user.upsert({
    where: { email: 'startup@brightloop.test' },
    update: { isActive: true },
    create: {
      email: 'startup@brightloop.test',
      name: 'Cedar Labs',
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

  const yearly = await database.plan.upsert({
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

  const onboarding = await database.product.upsert({
    where: { id: '00000000-0000-4000-8000-000000000103' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000103',
      name: 'Onboarding Workshop',
      type: 'SERVICE',
      salesPrice: 750,
      costPrice: 200,
      notes: 'Implementation and onboarding package',
      createdById: admin.id
    }
  });

  const suiteVariant = await database.productVariant.findUniqueOrThrow({
    where: {
      productId_attribute_value: {
        productId: suite.id,
        attribute: 'Brand',
        value: 'Odoo'
      }
    }
  });
  const priority = await database.product.findUniqueOrThrow({
    where: { id: '00000000-0000-4000-8000-000000000102' }
  });

  const net15 = await database.paymentTerm.findUniqueOrThrow({ where: { name: 'Net 15' } });
  const net30 = await database.paymentTerm.findUniqueOrThrow({ where: { name: 'Net 30' } });

  const template = await database.quotationTemplate.upsert({
    where: { id: '00000000-0000-4000-8000-000000000201' },
    update: {
      name: 'Business Suite Launch',
      description: 'A practical starting package for growing teams.',
      validityDays: 30,
      planId: monthly.id,
      isActive: true,
      createdById: admin.id
    },
    create: {
      id: '00000000-0000-4000-8000-000000000201',
      name: 'Business Suite Launch',
      description: 'A practical starting package for growing teams.',
      validityDays: 30,
      planId: monthly.id,
      isActive: true,
      createdById: admin.id
    }
  });
  await database.quotationTemplateLine.deleteMany({ where: { templateId: template.id } });
  await database.quotationTemplateLine.createMany({
    data: [
      {
        templateId: template.id,
        productId: suite.id,
        variantId: suiteVariant.id,
        quantity: 1,
        unitPrice: 2060,
        taxRate: 10,
        sortOrder: 0
      },
      {
        templateId: template.id,
        productId: priority.id,
        quantity: 1,
        unitPrice: 350,
        taxRate: 10,
        sortOrder: 1
      }
    ]
  });

  const subscriptionData = [
    {
      id: '00000000-0000-4000-8000-000000000301',
      number: 'DEMO-SUB-2026-000001',
      customerId: customer.id,
      planId: monthly.id,
      status: 'ACTIVE' as const,
      startDate: new Date('2026-08-01T12:00:00.000Z'),
      expiryDate: null,
      paymentTermId: net15.id,
      quotationTemplateId: template.id,
      quotationValidUntil: new Date('2026-09-01T12:00:00.000Z'),
      subtotal: 2410,
      taxTotal: 241,
      total: 2651,
      notes: 'Core workspace subscription with priority support.'
    },
    {
      id: '00000000-0000-4000-8000-000000000302',
      number: 'DEMO-SUB-2026-000002',
      customerId: agencyCustomer.id,
      planId: yearly.id,
      status: 'CONFIRMED' as const,
      startDate: new Date('2026-10-15T12:00:00.000Z'),
      expiryDate: new Date('2027-10-14T12:00:00.000Z'),
      paymentTermId: net30.id,
      quotationTemplateId: null,
      quotationValidUntil: null,
      subtotal: 15000,
      taxTotal: 1500,
      total: 16500,
      notes: 'Annual subscription for the agency operations team.'
    },
    {
      id: '00000000-0000-4000-8000-000000000303',
      number: 'DEMO-SUB-2026-000003',
      customerId: startupCustomer.id,
      planId: monthly.id,
      status: 'PAUSED' as const,
      startDate: new Date('2026-06-01T12:00:00.000Z'),
      expiryDate: null,
      paymentTermId: net30.id,
      quotationTemplateId: null,
      quotationValidUntil: null,
      subtotal: 1500,
      taxTotal: 150,
      total: 1650,
      notes: 'Paused while the customer completes an internal rollout.'
    },
    {
      id: '00000000-0000-4000-8000-000000000304',
      number: 'DEMO-SUB-2026-000004',
      customerId: customer.id,
      planId: monthly.id,
      status: 'QUOTATION' as const,
      startDate: new Date('2026-11-15T12:00:00.000Z'),
      expiryDate: new Date('2027-11-14T12:00:00.000Z'),
      paymentTermId: net15.id,
      quotationTemplateId: template.id,
      quotationValidUntil: new Date('2026-12-15T12:00:00.000Z'),
      subtotal: 2060,
      taxTotal: 206,
      total: 2266,
      notes: 'Expansion quotation awaiting customer confirmation.'
    }
  ];

  for (const subscription of subscriptionData) {
    await database.subscription.upsert({
      where: { id: subscription.id },
      update: {
        ...subscription,
        createdById: admin.id
      },
      create: {
        ...subscription,
        createdById: admin.id
      }
    });
  }

  const subscriptionLines = [
    {
      subscriptionId: subscriptionData[0].id,
      productId: suite.id,
      variantId: suiteVariant.id,
      description: 'Business Suite with Odoo brand variant',
      quantity: 1,
      unitPrice: 2060,
      taxRate: 10,
      taxAmount: 206,
      lineAmount: 2060,
      sortOrder: 0
    },
    {
      subscriptionId: subscriptionData[0].id,
      productId: priority.id,
      description: 'Priority Support',
      quantity: 1,
      unitPrice: 350,
      taxRate: 10,
      taxAmount: 35,
      lineAmount: 350,
      sortOrder: 1
    },
    {
      subscriptionId: subscriptionData[1].id,
      productId: suite.id,
      description: 'Business Suite annual license',
      quantity: 1,
      unitPrice: 15000,
      taxRate: 10,
      taxAmount: 1500,
      lineAmount: 15000,
      sortOrder: 0
    },
    {
      subscriptionId: subscriptionData[2].id,
      productId: suite.id,
      description: 'Business Suite monthly license',
      quantity: 1,
      unitPrice: 1500,
      taxRate: 10,
      taxAmount: 150,
      lineAmount: 1500,
      sortOrder: 0
    },
    {
      subscriptionId: subscriptionData[3].id,
      productId: suite.id,
      description: 'Business Suite expansion',
      quantity: 1,
      unitPrice: 2060,
      taxRate: 10,
      taxAmount: 206,
      lineAmount: 2060,
      sortOrder: 0
    }
  ];

  for (const subscription of subscriptionData) {
    await database.subscriptionLine.deleteMany({ where: { subscriptionId: subscription.id } });
  }
  await database.subscriptionLine.createMany({ data: subscriptionLines });

  const percentageDiscount = await database.discountRule.upsert({
    where: { id: '00000000-0000-4000-8000-000000000401' },
    update: {
      name: 'Growing team welcome',
      description: 'Ten percent off the first subscription invoice.',
      type: 'PERCENTAGE',
      scope: 'SUBSCRIPTION',
      value: 10,
      minPurchase: 0,
      minQuantity: 1,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2027-12-31T23:59:59.000Z'),
      maxUsageCount: 100,
      usageCount: 1,
      isActive: true,
      productId: null,
      createdById: admin.id
    },
    create: {
      id: '00000000-0000-4000-8000-000000000401',
      name: 'Growing team welcome',
      description: 'Ten percent off the first subscription invoice.',
      type: 'PERCENTAGE',
      scope: 'SUBSCRIPTION',
      value: 10,
      minPurchase: 0,
      minQuantity: 1,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2027-12-31T23:59:59.000Z'),
      maxUsageCount: 100,
      usageCount: 1,
      isActive: true,
      createdById: admin.id
    }
  });

  const productDiscount = await database.discountRule.upsert({
    where: { id: '00000000-0000-4000-8000-000000000402' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000402',
      name: 'Support add-on credit',
      description: 'A fixed credit for priority support purchases.',
      type: 'FIXED',
      scope: 'PRODUCT',
      value: 50,
      minPurchase: 300,
      minQuantity: 1,
      maxUsageCount: 25,
      productId: priority.id,
      createdById: admin.id
    }
  });

  const inactiveDiscount = await database.discountRule.upsert({
    where: { id: '00000000-0000-4000-8000-000000000403' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000403',
      name: 'Expired launch offer',
      description: 'Historical offer retained for reporting.',
      type: 'FIXED',
      scope: 'SUBSCRIPTION',
      value: 100,
      minPurchase: 0,
      minQuantity: 0,
      endsAt: new Date('2026-06-30T23:59:59.000Z'),
      isActive: false,
      createdById: admin.id
    }
  });

  const invoiceData = [
    {
      id: '00000000-0000-4000-8000-000000000501',
      number: 'DEMO-INV-2026-000001',
      billingKey: 'seed-sub-301-2026-08',
      subscriptionId: subscriptionData[0].id,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      periodStart: new Date('2026-08-01T12:00:00.000Z'),
      periodEnd: new Date('2026-08-31T12:00:00.000Z'),
      issueDate: new Date('2026-08-01T12:00:00.000Z'),
      dueDate: new Date('2026-08-16T12:00:00.000Z'),
      status: 'CONFIRMED' as const,
      subtotal: 2410,
      taxTotal: 241,
      total: 2385.9,
      discountTotal: 265.1,
      amountPaid: 500,
      confirmedAt: new Date('2026-08-01T12:00:00.000Z'),
      sentAt: new Date('2026-08-01T12:00:00.000Z')
    },
    {
      id: '00000000-0000-4000-8000-000000000502',
      number: 'DEMO-INV-2026-000002',
      billingKey: 'seed-sub-301-2026-09',
      subscriptionId: subscriptionData[0].id,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      periodStart: new Date('2026-09-01T12:00:00.000Z'),
      periodEnd: new Date('2026-09-30T12:00:00.000Z'),
      issueDate: new Date('2026-09-01T12:00:00.000Z'),
      dueDate: new Date('2026-09-16T12:00:00.000Z'),
      status: 'PAID' as const,
      subtotal: 2410,
      taxTotal: 241,
      total: 2601,
      discountTotal: 50,
      amountPaid: 2601,
      confirmedAt: new Date('2026-09-01T12:00:00.000Z'),
      paidAt: new Date('2026-09-10T12:00:00.000Z'),
      sentAt: new Date('2026-09-01T12:00:00.000Z')
    },
    {
      id: '00000000-0000-4000-8000-000000000503',
      number: 'DEMO-INV-2026-000003',
      billingKey: 'seed-sub-302-2026-10',
      subscriptionId: subscriptionData[1].id,
      customerId: agencyCustomer.id,
      customerName: agencyCustomer.name,
      customerEmail: agencyCustomer.email,
      periodStart: new Date('2026-10-15T12:00:00.000Z'),
      periodEnd: new Date('2027-10-14T12:00:00.000Z'),
      issueDate: new Date('2026-10-15T12:00:00.000Z'),
      dueDate: new Date('2026-11-14T12:00:00.000Z'),
      status: 'CONFIRMED' as const,
      subtotal: 15000,
      taxTotal: 1500,
      total: 16500,
      discountTotal: 0,
      amountPaid: 0,
      confirmedAt: new Date('2026-10-15T12:00:00.000Z'),
      sentAt: new Date('2026-10-15T12:00:00.000Z')
    },
    {
      id: '00000000-0000-4000-8000-000000000504',
      number: 'DEMO-INV-2026-000004',
      billingKey: 'seed-sub-304-2026-11',
      subscriptionId: subscriptionData[3].id,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      periodStart: new Date('2026-11-15T12:00:00.000Z'),
      periodEnd: new Date('2026-12-14T12:00:00.000Z'),
      issueDate: new Date('2026-10-31T12:00:00.000Z'),
      dueDate: new Date('2026-11-15T12:00:00.000Z'),
      status: 'DRAFT' as const,
      subtotal: 2060,
      taxTotal: 206,
      total: 2266,
      discountTotal: 0,
      amountPaid: 0
    },
    {
      id: '00000000-0000-4000-8000-000000000505',
      number: 'DEMO-INV-2026-000005',
      billingKey: 'seed-sub-303-2026-06',
      subscriptionId: subscriptionData[2].id,
      customerId: startupCustomer.id,
      customerName: startupCustomer.name,
      customerEmail: startupCustomer.email,
      periodStart: new Date('2026-06-01T12:00:00.000Z'),
      periodEnd: new Date('2026-06-30T12:00:00.000Z'),
      issueDate: new Date('2026-06-01T12:00:00.000Z'),
      dueDate: new Date('2026-06-16T12:00:00.000Z'),
      status: 'CANCELLED' as const,
      subtotal: 1500,
      taxTotal: 150,
      total: 1650,
      discountTotal: 0,
      amountPaid: 0,
      cancelledAt: new Date('2026-06-20T12:00:00.000Z'),
      cancellationReason: 'Customer requested a billing correction.'
    }
  ];

  for (const invoice of invoiceData) {
    await database.invoice.upsert({
      where: { id: invoice.id },
      update: { ...invoice, createdById: admin.id },
      create: { ...invoice, createdById: admin.id }
    });
  }

  const invoiceLines = [
    {
      invoiceId: invoiceData[0].id,
      productId: suite.id,
      variantId: suiteVariant.id,
      description: 'Business Suite with Odoo brand variant',
      quantity: 1,
      unitPrice: 2060,
      taxRate: 10,
      taxAmount: 206,
      lineAmount: 2060,
      sortOrder: 0
    },
    {
      invoiceId: invoiceData[0].id,
      productId: priority.id,
      description: 'Priority Support',
      quantity: 1,
      unitPrice: 350,
      taxRate: 10,
      taxAmount: 35,
      lineAmount: 350,
      sortOrder: 1
    },
    {
      invoiceId: invoiceData[1].id,
      productId: suite.id,
      description: 'Business Suite monthly license',
      quantity: 1,
      unitPrice: 2410,
      taxRate: 10,
      taxAmount: 241,
      lineAmount: 2410,
      sortOrder: 0
    },
    {
      invoiceId: invoiceData[2].id,
      productId: suite.id,
      description: 'Business Suite annual license',
      quantity: 1,
      unitPrice: 15000,
      taxRate: 10,
      taxAmount: 1500,
      lineAmount: 15000,
      sortOrder: 0
    },
    {
      invoiceId: invoiceData[3].id,
      productId: suite.id,
      description: 'Business Suite expansion',
      quantity: 1,
      unitPrice: 2060,
      taxRate: 10,
      taxAmount: 206,
      lineAmount: 2060,
      sortOrder: 0
    },
    {
      invoiceId: invoiceData[4].id,
      productId: suite.id,
      description: 'Business Suite monthly license',
      quantity: 1,
      unitPrice: 1500,
      taxRate: 10,
      taxAmount: 150,
      lineAmount: 1500,
      sortOrder: 0
    }
  ];

  for (const invoice of invoiceData) {
    await database.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
    await database.invoiceDiscount.deleteMany({ where: { invoiceId: invoice.id } });
    await database.payment.deleteMany({ where: { invoiceId: invoice.id } });
  }
  await database.invoiceLine.createMany({ data: invoiceLines });
  await database.invoiceDiscount.create({
    data: {
      invoiceId: invoiceData[0].id,
      discountRuleId: percentageDiscount.id,
      name: percentageDiscount.name,
      type: percentageDiscount.type,
      scope: percentageDiscount.scope,
      value: percentageDiscount.value,
      amount: 265.1
    }
  });
  await database.invoiceDiscount.create({
    data: {
      invoiceId: invoiceData[1].id,
      discountRuleId: productDiscount.id,
      name: productDiscount.name,
      type: productDiscount.type,
      scope: productDiscount.scope,
      value: productDiscount.value,
      amount: 50
    }
  });
  await database.payment.createMany({
    data: [
      {
        invoiceId: invoiceData[0].id,
        amount: 500,
        method: 'BANK_TRANSFER',
        paidAt: new Date('2026-08-12T12:00:00.000Z'),
        note: 'Part payment received',
        reference: 'BANK-2026-0812-001',
        createdById: staff.id
      },
      {
        invoiceId: invoiceData[1].id,
        amount: 2651,
        method: 'CARD',
        paidAt: new Date('2026-09-10T12:00:00.000Z'),
        note: 'Paid in full',
        reference: 'CARD-2026-0910-004',
        createdById: admin.id
      }
    ]
  });

  console.info(
    `Seeded demo workspace: ${admin.email}, ${staff.email}, ${customer.email}, ` +
      `${invoiceData.length} invoices, ${subscriptionData.length} subscriptions`
  );
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => database.$disconnect());
