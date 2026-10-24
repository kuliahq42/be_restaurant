import AdminShell from "./_components/admin-shell";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Restaurant Admin",
  description: "Kitchen display, inventory control and master data.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return <AdminShell session={session}>{children}</AdminShell>;
}
