import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding AdmissionDeck CRM...");

  // Firm
  const firm = await prisma.organization.upsert({
    where: { orgPath: "org.chs" },
    update: {
      identifier: "chs",
      displayName: "Center for Higher Studies",
    },
    create: {
      name: "Center for Higher Studies",
      identifier: "chs",
      displayName: "Center for Higher Studies",
      kind: "FIRM",
      orgPath: "org.chs",
      currency: "BDT",
      timezone: "Asia/Dhaka",
      seatsBilled: 30,
    },
  });

  // Agencies
  const agencySpecs = [
    { name: "Dhaka Central", path: "org.chs.dhaka", identifier: "dhaka-central", city: "Dhaka" },
    { name: "Chattogram Branch", path: "org.chs.ctg", identifier: "chattogram-branch", city: "Chattogram" },
    { name: "Sylhet Desk", path: "org.chs.sylhet", identifier: "sylhet-desk", city: "Sylhet" },
  ];

  const agencies = [];
  for (const a of agencySpecs) {
    const agency = await prisma.organization.upsert({
      where: { orgPath: a.path },
      update: {
        identifier: a.identifier,
        displayName: a.name,
      },
      create: {
        name: a.name,
        identifier: a.identifier,
        displayName: a.name,
        kind: "AGENCY",
        orgPath: a.path,
        parentId: firm.id,
        city: a.city,
        country: "Bangladesh",
        currency: "BDT",
        timezone: "Asia/Dhaka",
        seatsBilled: 10,
      },
    });
    agencies.push(agency);
  }

  const passwordHash = await hashPassword("Passw0rd!234");

  // Admin / firm manager
  await prisma.user.upsert({
    where: { email: "rezaul@chs.edu.bd" },
    update: {},
    create: {
      email: "rezaul@chs.edu.bd",
      name: "Rezaul Karim",
      role: "FIRM_MANAGER",
      orgId: firm.id,
      passwordHash,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  // Agency managers
  const managerSpecs = [
    { email: "tanvir@chs.edu.bd", name: "Tanvir Ahmed", orgId: agencies[0].id },
    { email: "farhana@chs.edu.bd", name: "Farhana Akter", orgId: agencies[1].id },
    { email: "kamrul@sylhetstudylink.com", name: "Kamrul Islam", orgId: agencies[2].id },
  ];

  for (const m of managerSpecs) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        name: m.name,
        role: m.email.includes("kamrul") ? "AGENT" : "AGENCY_MANAGER",
        orgId: m.orgId,
        passwordHash,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });
  }

  // Counsellors
  const counsellorSpecs = [
    { email: "nusrat@chs.edu.bd", name: "Nusrat Jahan", orgId: agencies[0].id },
    { email: "sabbir@chs.edu.bd", name: "Sabbir Khan", orgId: agencies[0].id },
    { email: "mehedi@chs.edu.bd", name: "Mehedi Hasan", orgId: agencies[1].id },
  ];

  for (const c of counsellorSpecs) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        name: c.name,
        role: "COUNSELLOR",
        orgId: c.orgId,
        passwordHash,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });
  }

  // Platform admin
  await prisma.user.upsert({
    where: { email: "admin@admissiondeck.com" },
    update: {},
    create: {
      email: "admin@admissiondeck.com",
      name: "Platform Ops",
      role: "PLATFORM_ADMIN",
      passwordHash,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  // Pipeline templates
  const templates = [
    {
      country: "Cyprus",
      name: "Cyprus",
      stages: [
        "Counselling session",
        "Documents collected",
        "Application submitted",
        "Offer letter received",
        "Tuition deposit paid",
        "Visa file prepared",
        "Visa interview",
        "Visa decision",
        "Pre-departure briefing",
        "Arrived",
      ],
      docs: [
        "Academic documents",
        "English certificate",
        "Passport copy",
        "Police clearance",
        "Bank statement",
        "Sponsor letter",
        "SWIFT copy",
      ],
    },
    {
      country: "United Kingdom",
      name: "United Kingdom",
      stages: [
        "Counselling session",
        "Documents collected",
        "English test",
        "Application submitted",
        "Conditional offer",
        "Unconditional offer and deposit",
        "CAS issued",
        "Biometrics",
        "Visa decision",
        "Arrived",
      ],
      docs: [
        "Academic documents",
        "IELTS UKVI result",
        "Passport copy",
        "Statement of purpose",
        "TB test certificate",
        "Bank statement",
        "SWIFT copy",
      ],
    },
    {
      country: "Malaysia",
      name: "Malaysia",
      stages: [
        "Counselling session",
        "Documents collected",
        "Application submitted",
        "Offer letter received",
        "EMGS approval",
        "VAL issued",
        "Flight booked",
        "Arrived",
      ],
      docs: [
        "Academic documents",
        "English certificate",
        "Passport copy",
        "Medical screening",
        "SWIFT copy",
      ],
    },
    {
      country: "Canada",
      name: "Canada",
      stages: [
        "Counselling session",
        "IELTS submitted",
        "Application submitted",
        "Letter of acceptance",
        "GIC account",
        "Study permit applied",
        "Biometrics",
        "Permit decision",
        "Arrived",
      ],
      docs: [
        "Academic documents",
        "IELTS result",
        "Passport copy",
        "Statement of purpose",
        "GIC certificate",
        "Medical exam",
        "SWIFT copy",
      ],
    },
  ];

  for (const t of templates) {
    await prisma.pipelineTemplate.upsert({
      where: { country: t.country },
      update: {},
      create: {
        country: t.country,
        name: t.name,
        stages: t.stages,
        docs: t.docs,
        isActive: true,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Firm Login: rezaul@chs.edu.bd / Passw0rd!234 (Org: chs)");
  console.log("Agency Login: tanvir@chs.edu.bd / Passw0rd!234 (Org: dhaka-central)");
  console.log("Platform Admin: admin@admissiondeck.com / Passw0rd!234 (Org: chs)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
