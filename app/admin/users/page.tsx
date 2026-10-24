import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { normalizeRole } from "@/lib/roles";
import Unauthorized from "../_components/unauthorized";
import UsersClient, { type AdminRow } from "./users-client";

export const metadata = { title: "User Management · Restaurant Admin" };

// Admin accounts are read live from the database on every request.
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireSession();

  if (session.role !== "MASTER") {
    return (
      <Unauthorized
        description="User Management is limited to the Master role."
        allowedRoles={["MASTER"]}
      />
    );
  }

  const admins = await prisma.admin.findMany({ orderBy: { id: "asc" } });

  const rows: AdminRow[] = admins.map((admin) => ({
    id: admin.id.toString(),
    username: admin.username,
    role: normalizeRole(admin.role),
    createdAt: admin.created_at.toISOString().slice(0, 10),
  }));

  return <UsersClient admins={rows} currentAdminId={session.id} />;
}
