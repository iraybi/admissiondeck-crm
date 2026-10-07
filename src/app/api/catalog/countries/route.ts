import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listCountries, addCountryToOrg, removeCountryFromOrg } from "@/lib/catalog/management";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const countries = await listCountries();
  return NextResponse.json({ countries });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { countryId, orgId, notes } = body;

    if (!countryId || !orgId) {
      return NextResponse.json(
        { error: "countryId and orgId are required" },
        { status: 400 },
      );
    }

    await addCountryToOrg(countryId, orgId, notes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Add country error:", e);
    return NextResponse.json(
      { error: "Failed to add country" },
      { status: 500 },
    );
  }
}
