import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ProfileForm } from "@/components/settings/ProfileForm";

export default async function SettingsProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true, avatarUrl: true },
  });

  return (
    <section className="card">
      <div className="card-head">
        <h2>Profile</h2>
      </div>
      <ProfileForm
        initial={{
          name: record?.name ?? user.name,
          email: record?.email ?? user.email,
          phone: record?.phone ?? "",
          avatarUrl: record?.avatarUrl ?? "",
        }}
      />
    </section>
  );
}
