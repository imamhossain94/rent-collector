/**
 * Demo data for ভাড়া খাতা / Bhara Khata.
 *
 *   node prisma/seed.mjs
 *
 * Creates a super admin, two house owners, their properties, units, tenants,
 * three months of meter readings, bills, payments and expenses — so the app
 * looks like a real khata the moment you open it.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function monthKey(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayIn(billingMonth, day) {
  const [y, m] = billingMonth.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(day, last), 12, 0, 0);
}

async function reset() {
  // order matters: children first
  await prisma.auditLog.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.meterRecharge.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Seeding ভাড়া খাতা demo data…");
  await reset();

  const hash = (p) => bcrypt.hash(p, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Platform Admin",
      phone: "01700000000",
      email: "admin@bharakhata.app",
      passwordHash: await hash("admin123"),
      role: "SUPER_ADMIN",
      language: "bn",
      businessName: "Bhara Khata HQ",
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Abdur Rahman",
      phone: "01711111111",
      email: "rahman@example.com",
      passwordHash: await hash("123456"),
      role: "OWNER",
      plan: "PRO",
      language: "bn",
      businessName: "রহমান ভিলা",
      address: "House 12, Road 5, Mirpur 10, Dhaka",
      nid: "1990123456789",
    },
  });

  const owner2 = await prisma.user.create({
    data: {
      name: "Shirin Akter",
      phone: "01722222222",
      passwordHash: await hash("123456"),
      role: "OWNER",
      language: "bn",
      businessName: "আক্তার ম্যানশন",
      address: "Agrabad, Chattogram",
    },
  });

  // ---------------------------------------------------------------- properties
  const villa = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name: "রহমান ভিলা",
      type: "BUILDING",
      addressLine: "House 12, Road 5",
      area: "Mirpur 10",
      city: "Dhaka",
      district: "Dhaka",
      division: "Dhaka",
      mainMeterNumber: "DESCO-40251188",
      meterType: "PREPAID",
      electricityRate: 9,
      serviceCharge: 800,
      gasCharge: 1080,
      waterCharge: 300,
      dueDay: 10,
      lateFee: 200,
    },
  });

  const market = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name: "রহমান মার্কেট",
      type: "MARKET",
      addressLine: "Shop complex, Kazipara",
      area: "Kazipara",
      city: "Dhaka",
      district: "Dhaka",
      division: "Dhaka",
      mainMeterNumber: "DESCO-40251190",
      meterType: "PREPAID",
      electricityRate: 9,
      serviceCharge: 500,
      dueDay: 5,
    },
  });

  await prisma.property.create({
    data: {
      ownerId: owner2.id,
      name: "আক্তার ম্যানশন",
      type: "BUILDING",
      area: "Agrabad",
      city: "Chattogram",
      district: "Chattogram",
      division: "Chattogram",
      electricityRate: 9,
      serviceCharge: 600,
      units: {
        create: [
          { name: "1-A", floor: "1st", type: "FLAT", bedrooms: 2, bathrooms: 2, sizeSqft: 850, rentAmount: 11000, status: "VACANT" },
          { name: "1-B", floor: "1st", type: "FLAT", bedrooms: 3, bathrooms: 2, sizeSqft: 1100, rentAmount: 14000, status: "VACANT" },
        ],
      },
    },
  });

  // ------------------------------------------------------------------- units
  const unitSpecs = [
    { propertyId: villa.id, name: "A-1", floor: "1st", type: "FLAT", bedrooms: 2, bathrooms: 2, sizeSqft: 900, rentAmount: 13000, meterNumber: "DESCO-114523" },
    { propertyId: villa.id, name: "A-2", floor: "1st", type: "FLAT", bedrooms: 3, bathrooms: 2, sizeSqft: 1150, rentAmount: 16500, meterNumber: "DESCO-114524" },
    { propertyId: villa.id, name: "B-1", floor: "2nd", type: "FLAT", bedrooms: 2, bathrooms: 1, sizeSqft: 780, rentAmount: 11500, meterNumber: "DESCO-114525" },
    { propertyId: villa.id, name: "B-2", floor: "2nd", type: "FLAT", bedrooms: 3, bathrooms: 2, sizeSqft: 1150, rentAmount: 16500, meterNumber: "DESCO-114526" },
    { propertyId: villa.id, name: "Garage-1", floor: "Ground", type: "GARAGE", rentAmount: 3000 },
    { propertyId: market.id, name: "Shop 1", floor: "Ground", type: "SHOP", sizeSqft: 220, rentAmount: 22000, meterNumber: "DESCO-990011" },
    { propertyId: market.id, name: "Shop 2", floor: "Ground", type: "SHOP", sizeSqft: 180, rentAmount: 18000, meterNumber: "DESCO-990012" },
    { propertyId: market.id, name: "Shop 3", floor: "Ground", type: "SHOP", sizeSqft: 180, rentAmount: 18000, meterNumber: "DESCO-990013" },
  ];

  const units = {};
  for (const spec of unitSpecs) {
    const unit = await prisma.unit.create({ data: { ...spec, status: "VACANT" } });
    units[spec.name] = unit;
  }

  // ----------------------------------------------------------------- tenants
  const tenantSpecs = [
    {
      unit: "A-1",
      name: "রহিম উদ্দিন",
      phone: "01811110001",
      nid: "1985123456701",
      occupation: "Bank officer",
      familyMembers: 4,
      rentAmount: 13000,
      serviceCharge: 800,
      advanceAmount: 13000,
      gasCharge: 1080,
      waterCharge: 300,
      electricityRate: 9,
      startMeter: 12450,
      usage: [92, 88, 105],
      permanentAddress: "Vill: Char Jabbar, Noakhali",
      moveInMonths: 14,
      payFull: true,
    },
    {
      unit: "A-2",
      name: "সালমা বেগম",
      phone: "01811110002",
      nid: "1990123456702",
      occupation: "School teacher",
      familyMembers: 5,
      rentAmount: 16500,
      serviceCharge: 800,
      advanceAmount: 16500,
      gasCharge: 1080,
      waterCharge: 300,
      electricityRate: 9,
      startMeter: 20880,
      usage: [140, 132, 151],
      permanentAddress: "Kushtia Sadar, Kushtia",
      moveInMonths: 26,
      payFull: false,
    },
    {
      unit: "B-1",
      name: "জাহিদ হাসান",
      phone: "01811110003",
      occupation: "Software engineer",
      familyMembers: 2,
      rentAmount: 11500,
      serviceCharge: 800,
      advanceAmount: 11500,
      gasCharge: 1080,
      waterCharge: 300,
      electricityRate: 9,
      startMeter: 8120,
      usage: [76, 81, 70],
      permanentAddress: "Bogura Sadar, Bogura",
      moveInMonths: 7,
      payFull: true,
    },
    {
      unit: "B-2",
      name: "নাসরিন সুলতানা",
      phone: "01811110004",
      occupation: "Doctor",
      familyMembers: 3,
      rentAmount: 16500,
      serviceCharge: 800,
      advanceAmount: 16500,
      gasCharge: 1080,
      waterCharge: 300,
      electricityRate: 9,
      startMeter: 15600,
      usage: [118, 126, 133],
      openingDue: 4200,
      permanentAddress: "Sylhet Sadar, Sylhet",
      moveInMonths: 19,
      payFull: false,
    },
    {
      unit: "Garage-1",
      name: "মোঃ কামাল",
      phone: "01811110005",
      occupation: "Driver",
      familyMembers: 1,
      rentAmount: 3000,
      electricityMode: "NONE",
      moveInMonths: 4,
      payFull: true,
    },
    {
      unit: "Shop 1",
      name: "নিউ ফ্যাশন হাউজ",
      phone: "01811110006",
      occupation: "Clothing shop",
      familyMembers: 1,
      rentAmount: 22000,
      serviceCharge: 500,
      advanceAmount: 44000,
      electricityRate: 9,
      startMeter: 30240,
      usage: [210, 198, 233],
      moveInMonths: 31,
      payFull: true,
    },
    {
      unit: "Shop 2",
      name: "ভাই ভাই স্টোর",
      phone: "01811110007",
      occupation: "Grocery",
      familyMembers: 1,
      rentAmount: 18000,
      serviceCharge: 500,
      advanceAmount: 36000,
      electricityMode: "FIXED",
      fixedElectricity: 1500,
      moveInMonths: 11,
      payFull: false,
    },
  ];

  const months = [monthKey(-2), monthKey(-1), monthKey(0)];
  let billSeq = {};
  let receiptSeq = {};

  for (const spec of tenantSpecs) {
    const unit = units[spec.unit];
    const moveIn = new Date();
    moveIn.setMonth(moveIn.getMonth() - (spec.moveInMonths ?? 6));

    const tenant = await prisma.tenant.create({
      data: {
        ownerId: owner.id,
        unitId: unit.id,
        name: spec.name,
        phone: spec.phone,
        nid: spec.nid ?? null,
        occupation: spec.occupation ?? null,
        familyMembers: spec.familyMembers ?? 1,
        permanentAddress: spec.permanentAddress ?? null,
        emergencyName: spec.emergencyName ?? null,
        emergencyPhone: spec.emergencyPhone ?? null,
        moveInDate: moveIn,
        agreementStart: moveIn,
        rentAmount: spec.rentAmount,
        serviceCharge: spec.serviceCharge ?? 0,
        advanceAmount: spec.advanceAmount ?? 0,
        openingDue: spec.openingDue ?? 0,
        electricityMode: spec.electricityMode ?? "SUBMETER",
        electricityRate: spec.electricityRate ?? 9,
        fixedElectricity: spec.fixedElectricity ?? 0,
        gasCharge: spec.gasCharge ?? 0,
        waterCharge: spec.waterCharge ?? 0,
        status: "ACTIVE",
      },
    });
    await prisma.unit.update({ where: { id: unit.id }, data: { status: "OCCUPIED" } });

    let balance = spec.openingDue ?? 0;
    let meter = spec.startMeter ?? 0;
    const property = unit.propertyId === villa.id ? villa : market;

    for (let i = 0; i < months.length; i++) {
      const billingMonth = months[i];
      const isCurrent = i === months.length - 1;

      const items = [
        { type: "RENT", label: "House rent", qty: 1, rate: spec.rentAmount, amount: spec.rentAmount },
      ];
      if (spec.serviceCharge) {
        items.push({ type: "SERVICE", label: "Service charge", qty: 1, rate: spec.serviceCharge, amount: spec.serviceCharge });
      }

      let readingRow = null;
      const mode = spec.electricityMode ?? "SUBMETER";
      if (mode === "SUBMETER" && spec.usage) {
        const usedUnits = spec.usage[i];
        const previous = meter;
        const current = meter + usedUnits;
        meter = current;
        const rate = spec.electricityRate ?? 9;
        const amount = round2(usedUnits * rate);
        readingRow = { previous, current, units: usedUnits, rate, amount };
        items.push({
          type: "ELECTRICITY",
          label: "Electricity (sub-meter)",
          qty: usedUnits,
          rate,
          amount,
          meta: `${previous} → ${current} = ${usedUnits} unit × ${rate}`,
        });
      } else if (mode === "FIXED" && spec.fixedElectricity) {
        items.push({
          type: "ELECTRICITY",
          label: "Electricity (fixed)",
          qty: 1,
          rate: spec.fixedElectricity,
          amount: spec.fixedElectricity,
        });
      }

      if (spec.gasCharge) items.push({ type: "GAS", label: "Gas bill", qty: 1, rate: spec.gasCharge, amount: spec.gasCharge });
      if (spec.waterCharge) items.push({ type: "WATER", label: "Water bill", qty: 1, rate: spec.waterCharge, amount: spec.waterCharge });

      const subtotal = round2(items.reduce((sum, it) => sum + it.amount, 0));
      const total = subtotal;
      const previousDue = round2(balance);

      billSeq[billingMonth] = (billSeq[billingMonth] ?? 0) + 1;
      const bill = await prisma.bill.create({
        data: {
          ownerId: owner.id,
          tenantId: tenant.id,
          unitId: unit.id,
          propertyId: property.id,
          billNo: `BK-${billingMonth.replace("-", "")}-${String(billSeq[billingMonth]).padStart(4, "0")}`,
          billingMonth,
          issueDate: dayIn(billingMonth, 1),
          dueDate: dayIn(billingMonth, property.dueDay),
          previousDue,
          subtotal,
          total,
          status: "UNPAID",
          items: { create: items },
        },
      });

      if (readingRow) {
        await prisma.meterReading.create({
          data: {
            tenantId: tenant.id,
            billId: bill.id,
            billingMonth,
            type: "ELECTRICITY",
            ...readingRow,
            readingDate: dayIn(billingMonth, 1),
          },
        });
      }

      balance = round2(balance + total);

      // payments: older months settle, the current month is a mixed bag
      let payAmount = 0;
      if (!isCurrent) payAmount = total;
      else if (spec.payFull) payAmount = total;
      else if (spec.name === "সালমা বেগম") payAmount = round2(total * 0.6);
      else payAmount = 0;

      if (payAmount > 0) {
        const methods = ["CASH", "BKASH", "NAGAD", "BANK", "ROCKET"];
        const method = methods[(billSeq[billingMonth] + i) % methods.length];
        const paidAt = dayIn(billingMonth, Math.min(property.dueDay + (i % 3), 27));
        const key = billingMonth;
        receiptSeq[key] = (receiptSeq[key] ?? 0) + 1;

        await prisma.payment.create({
          data: {
            ownerId: owner.id,
            tenantId: tenant.id,
            billId: bill.id,
            receiptNo: `RC-${billingMonth.replace("-", "")}-${String(receiptSeq[key]).padStart(4, "0")}`,
            amount: payAmount,
            method,
            txnRef: method === "CASH" ? null : `TRX${Math.floor(Math.random() * 900000 + 100000)}`,
            paidAt,
            createdAt: paidAt,
          },
        });

        balance = round2(balance - payAmount);
        await prisma.bill.update({
          where: { id: bill.id },
          data: { paidAmount: payAmount, status: payAmount + 0.009 >= total ? "PAID" : "PARTIAL" },
        });
      }
    }
  }

  // a tenant who has already left, so the history looks lived-in
  const leftMoveIn = new Date();
  leftMoveIn.setMonth(leftMoveIn.getMonth() - 20);
  const leftMoveOut = new Date();
  leftMoveOut.setMonth(leftMoveOut.getMonth() - 3);
  await prisma.tenant.create({
    data: {
      ownerId: owner.id,
      unitId: units["Shop 3"].id,
      name: "পুরাতন ভাড়াটিয়া (মুদি দোকান)",
      phone: "01811110008",
      rentAmount: 17000,
      serviceCharge: 500,
      advanceAmount: 34000,
      moveInDate: leftMoveIn,
      moveOutDate: leftMoveOut,
      status: "LEFT",
      electricityMode: "NONE",
      notes: "Shop handed over after 20 months.",
    },
  });

  // ------------------------------------------------- prepaid meter recharges
  // A real owner tops the DESCO prepaid meter up several times a month.
  const rechargePlan = [
    { month: -2, day: 3, amount: 5000, method: "BKASH" },
    { month: -2, day: 17, amount: 4000, method: "CASH" },
    { month: -2, day: 27, amount: 3000, method: "BKASH" },
    { month: -1, day: 4, amount: 6000, method: "NAGAD" },
    { month: -1, day: 19, amount: 4000, method: "BKASH" },
    { month: 0, day: 2, amount: 5000, method: "BKASH" },
    { month: 0, day: 14, amount: 4500, method: "ROCKET" },
  ];

  for (const r of rechargePlan) {
    const month = monthKey(r.month);
    await prisma.meterRecharge.create({
      data: {
        ownerId: owner.id,
        propertyId: villa.id,
        billingMonth: month,
        amount: r.amount,
        method: r.method,
        meterNumber: "DESCO-40251188",
        tokenRef: `${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(
          Math.random() * 9000 + 1000,
        )}`,
        rechargedAt: dayIn(month, r.day),
        createdAt: dayIn(month, r.day),
      },
    });
  }

  // ---------------------------------------------------------------- expenses
  const expenseSpecs = [
    { month: -2, propertyId: villa.id, category: "REPAIR", title: "ছাদের পানির ট্যাংক মেরামত", amount: 6500, vendor: "মিস্ত্রি করিম" },
    { month: -2, propertyId: villa.id, category: "SALARY", title: "দারোয়ানের বেতন", amount: 9000, vendor: "মোঃ আলাউদ্দিন" },
    { month: -1, propertyId: villa.id, category: "SALARY", title: "দারোয়ানের বেতন", amount: 9000, vendor: "মোঃ আলাউদ্দিন" },
    { month: -1, propertyId: market.id, category: "MAINTENANCE", title: "মার্কেটের সাইনবোর্ড ও লাইট", amount: 4200 },
    { month: -1, propertyId: villa.id, category: "TAX", title: "হোল্ডিং ট্যাক্স (সিটি কর্পোরেশন)", amount: 12000 },
    { month: 0, propertyId: villa.id, category: "SALARY", title: "দারোয়ানের বেতন", amount: 9000, vendor: "মোঃ আলাউদ্দিন" },
    { month: 0, propertyId: villa.id, category: "CLEANING", title: "সেপটিক ট্যাংক পরিষ্কার", amount: 3500 },
    { month: 0, propertyId: market.id, category: "REPAIR", title: "শাটার মেরামত (দোকান ২)", amount: 2800 },
  ];

  for (const e of expenseSpecs) {
    const month = monthKey(e.month);
    await prisma.expense.create({
      data: {
        ownerId: owner.id,
        propertyId: e.propertyId,
        category: e.category,
        title: e.title,
        amount: e.amount,
        vendor: e.vendor ?? null,
        spentAt: dayIn(month, 12),
      },
    });
  }

  // ----------------------------------------------------------------- sms log
  const dueTenants = await prisma.tenant.findMany({
    where: { ownerId: owner.id, status: "ACTIVE" },
    take: 2,
  });
  for (const tenant of dueTenants) {
    await prisma.smsLog.create({
      data: {
        ownerId: owner.id,
        tenantId: tenant.id,
        phone: tenant.phone,
        type: "RENT_REMINDER",
        status: "SIMULATED",
        provider: "simulation",
        message: `প্রিয় ${tenant.name}, চলতি মাসের ভাড়া পরিশোধের অনুরোধ করা হলো। ধন্যবাদ — রহমান ভিলা`,
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: "SEED", entity: "System", summary: "Demo data generated" },
      { userId: owner.id, action: "GENERATE", entity: "Bill", summary: `${months.join(", ")} bills created` },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    properties: await prisma.property.count(),
    units: await prisma.unit.count(),
    tenants: await prisma.tenant.count(),
    bills: await prisma.bill.count(),
    payments: await prisma.payment.count(),
    expenses: await prisma.expense.count(),
    recharges: await prisma.meterRecharge.count(),
  };

  console.log("Done:", counts);
  console.log("\nLogins:");
  console.log("  Owner       01711111111 / 123456");
  console.log("  Owner 2     01722222222 / 123456");
  console.log("  Super admin 01700000000 / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
