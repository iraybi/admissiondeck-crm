import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

//

async function main() {
  console.log("Seeding AdmissionDeck CRM...");

  // Firm
  const firm = await prisma.organization.upsert({
    where: { orgPath: "org.chs" },
    update: {
      identifier: "org.chs",
      displayName: "Center for Higher Studies",
    },
    create: {
      name: "Center for Higher Studies",
      identifier: "org.chs",
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
    { name: "Dhaka Central", path: "org.chs.dhaka", identifier: "org.chs.dhaka", city: "Dhaka" },
    { name: "Chattogram Branch", path: "org.chs.ctg", identifier: "org.chs.ctg", city: "Chattogram" },
    { name: "Sylhet Desk", path: "org.chs.sylhet", identifier: "org.chs.sylhet", city: "Sylhet" },
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
  const rezaul = await prisma.user.upsert({
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

  await prisma.orgMembership.upsert({
    where: { userId_orgId: { userId: rezaul.id, orgId: firm.id } },
    update: { role: "FIRM_MANAGER" },
    create: { userId: rezaul.id, orgId: firm.id, role: "FIRM_MANAGER", isActive: true },
  });

  // Agency managers & agents
  const managerSpecs = [
    { email: "tanvir@chs.edu.bd", name: "Tanvir Ahmed", orgId: agencies[0].id },
    { email: "farhana@chs.edu.bd", name: "Farhana Akter", orgId: agencies[1].id },
    { email: "kamrul@sylhetstudylink.com", name: "Kamrul Islam", orgId: agencies[2].id },
  ];

  for (const m of managerSpecs) {
    const role = m.email.includes("kamrul") ? "AGENT" : "AGENCY_MANAGER";
    const u = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        name: m.name,
        role,
        orgId: m.orgId,
        passwordHash,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });

    await prisma.orgMembership.upsert({
      where: { userId_orgId: { userId: u.id, orgId: m.orgId } },
      update: { role },
      create: { userId: u.id, orgId: m.orgId, role, isActive: true },
    });

    // Demonstrate multi-org: Kamrul (agent) is also affiliated with Dhaka Central
    if (m.email.includes("kamrul")) {
      await prisma.orgMembership.upsert({
        where: { userId_orgId: { userId: u.id, orgId: agencies[0].id } },
        update: { role: "AGENT" },
        create: { userId: u.id, orgId: agencies[0].id, role: "AGENT", isActive: true },
      });
    }
  }

  // Counsellors
  const counsellorSpecs = [
    { email: "nusrat@chs.edu.bd", name: "Nusrat Jahan", orgId: agencies[0].id },
    { email: "sabbir@chs.edu.bd", name: "Sabbir Khan", orgId: agencies[0].id },
    { email: "mehedi@chs.edu.bd", name: "Mehedi Hasan", orgId: agencies[1].id },
  ];

  for (const c of counsellorSpecs) {
    const u = await prisma.user.upsert({
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

    await prisma.orgMembership.upsert({
      where: { userId_orgId: { userId: u.id, orgId: c.orgId } },
      update: { role: "COUNSELLOR" },
      create: { userId: u.id, orgId: c.orgId, role: "COUNSELLOR", isActive: true },
    });

    // Demonstrate multi-org: Nusrat also counsels for Chattogram Branch
    if (c.email.includes("nusrat")) {
      await prisma.orgMembership.upsert({
        where: { userId_orgId: { userId: u.id, orgId: agencies[1].id } },
        update: { role: "COUNSELLOR" },
        create: { userId: u.id, orgId: agencies[1].id, role: "COUNSELLOR", isActive: true },
      });
    }
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

  // Student demo user & linked student profile
  const studentUser = await prisma.user.upsert({
    where: { email: "student@chs.edu.bd" },
    update: {
      orgId: agencies[0].id,
      role: "STUDENT",
      isActive: true,
    },
    create: {
      email: "student@chs.edu.bd",
      name: "Ayesha Siddiqua",
      role: "STUDENT",
      orgId: agencies[0].id,
      passwordHash,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  await prisma.orgMembership.upsert({
    where: { userId_orgId: { userId: studentUser.id, orgId: agencies[0].id } },
    update: { role: "STUDENT", isActive: true },
    create: { userId: studentUser.id, orgId: agencies[0].id, role: "STUDENT", isActive: true },
  });

  const nusratUser = await prisma.user.findUnique({ where: { email: "nusrat@chs.edu.bd" } });
  const kamrulUser = await prisma.user.findUnique({ where: { email: "kamrul@sylhetstudylink.com" } });
  const ukTemplate = await prisma.pipelineTemplate.findUnique({ where: { country: "United Kingdom" } });

  const studentRecord = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {
      counsellorId: nusratUser?.id,
      agentId: kamrulUser?.id,
      orgPath: agencies[0].orgPath,
      status: "ACTIVE",
    },
    create: {
      userId: studentUser.id,
      email: "student@chs.edu.bd",
      name: "Ayesha Siddiqua",
      phone: "+880 1711-204518",
      passportNumber: "A02948123",
      nationality: "Bangladeshi",
      orgId: agencies[0].id,
      orgPath: agencies[0].orgPath,
      targetCountry: "United Kingdom",
      targetUniversity: "University of Greenwich",
      targetProgram: "MSc Data Science",
      targetIntake: "Sept 2026",
      status: "ACTIVE",
      counsellorId: nusratUser?.id,
      agentId: kamrulUser?.id,
      pipelineTemplateId: ukTemplate?.id,
    },
  });

  // Sample student documents
  const sampleDocs = [
    { type: "Passport copy", fileName: "passport_ayesha.pdf", status: "AVAILABLE" as const, bucket: "PRODUCTION" as const },
    { type: "IELTS UKVI result", fileName: "ielts_trf_ayesha.pdf", status: "AVAILABLE" as const, bucket: "PRODUCTION" as const },
    { type: "Academic transcripts", fileName: "bsc_transcripts.pdf", status: "UPLOADED" as const, bucket: "QUARANTINE" as const },
  ];

  for (const doc of sampleDocs) {
    const existingDoc = await prisma.document.findFirst({
      where: { studentId: studentRecord.id, type: doc.type },
    });
    if (!existingDoc) {
      await prisma.document.create({
        data: {
          studentId: studentRecord.id,
          orgPath: agencies[0].orgPath,
          type: doc.type,
          fileName: doc.fileName,
          storageKey: `students/${studentRecord.id}/${doc.fileName}`,
          bucket: doc.bucket,
          scanStatus: "CLEAN",
          status: doc.status,
          uploadedById: studentUser.id,
          sizeBytes: 1024 * 350,
          mimeType: "application/pdf",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
      });
    }
  }

  // Sample verified tuition deposit payment
  const existingPayment = await prisma.payment.findFirst({
    where: { studentId: studentRecord.id, title: "Tuition Deposit" },
  });
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        studentId: studentRecord.id,
        orgPath: agencies[0].orgPath,
        title: "Tuition Deposit",
        amount: 250000,
        currency: "BDT",
        method: "BANK_TRANSFER",
        state: "VERIFIED",
        milestone: "Offer Acceptance",
        reference: "TXN-2026-GREENWICH-01",
        verifiedById: nusratUser?.id,
        verifiedAt: new Date(),
      },
    });
  }

  // Sample counsellor consultation note
  const existingNote = await prisma.note.findFirst({
    where: { studentId: studentRecord.id },
  });
  if (!existingNote && nusratUser) {
    await prisma.note.create({
      data: {
        studentId: studentRecord.id,
        authorId: nusratUser.id,
        body: "Initial consultation completed. IELTS score (7.0) verified. Application submitted to University of Greenwich.",
        isPinned: true,
      },
    });
  }

  console.log("Seed complete.\n");
  console.log("Firm Login: rezaul@chs.edu.bd / Passw0rd!234 (Org: org.chs, Domain: dash.crm.admissiondeck.com)");
  console.log("Agency Login: tanvir@chs.edu.bd / Passw0rd!234 (Org: org.chs.dhaka, Domain: agency.crm.admissiondeck.com or dash.crm.admissiondeck.com)");
  console.log("Multi-Org Agent: kamrul@sylhetstudylink.com / Passw0rd!234 (Can sign in to org.chs.sylhet OR org.chs.dhaka, Domain: agent.crm.admissiondeck.com or dash.crm.admissiondeck.com)");
  console.log("Multi-Org Counsellor: nusrat@chs.edu.bd / Passw0rd!234 (Can sign in to org.chs.dhaka OR org.chs.ctg, Domain: counsellor.crm.admissiondeck.com or dash.crm.admissiondeck.com)");
  console.log("Student Login: student@chs.edu.bd / Passw0rd!234 (Org: org.chs.dhaka, Domain: student.crm.admissiondeck.com)");
  console.log("Platform Admin: admin@admissiondeck.com / Passw0rd!234 (No org identifier needed, Domain: manage.crm.admissiondeck.com)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
