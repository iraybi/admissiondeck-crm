import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";

export default async function SettingsOrgPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.orgId) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>Organization</h2>
        </div>
        <p className="text-sm muted">
          You are not assigned to an organization.
        </p>
      </section>
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
  });

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Organization</h2>
          <div className="card-head-aside">
            <code className="text-xs muted">{org?.orgPath}</code>
          </div>
        </div>
        <OrgSettingsForm
          initial={{
            name: org?.name ?? "",
            website: org?.website ?? "",
            supportEmail: org?.supportEmail ?? "",
            phone: org?.phone ?? "",
            addressLine1: org?.addressLine1 ?? "",
            city: org?.city ?? "",
            country: org?.country ?? "",
            timezone: org?.timezone ?? "UTC",
            currency: org?.currency ?? "BDT",
            brandColor: org?.brandColor ?? "",
            logoUrl: org?.logoUrl ?? "",
          }}
        />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Branding</h2>
        </div>
        <div className="status-row is-brand">
          <div>
            <div className="font-medium text-sm">Logo</div>
            <div className="text-sm muted">
              {org?.logoUrl
                ? "Set. Appears in the top bar and outbound email."
                : "Not set. Using the default monogram."}
            </div>
          </div>
        </div>
        <div className="status-row is-brand" style={{ marginTop: 8 }}>
          <div>
            <div className="font-medium text-sm">Accent color</div>
            <div className="text-sm muted">
              {org?.brandColor ?? "Using the default AdmissionDeck coral."}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
