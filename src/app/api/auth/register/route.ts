import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, identifier } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    let orgId: string | null = null;
    if (identifier) {
      const org = await prisma.organization.findFirst({
        where: { identifier: identifier.toLowerCase().trim() },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json(
          { error: "Organization not found. Check your identifier." },
          { status: 400 },
        );
      }
      orgId = org.id;
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        passwordHash,
        role: "STUDENT",
        orgId,
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Registration error:", e);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    );
  }
}
