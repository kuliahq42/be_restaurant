import { redirect } from "next/navigation";

/** /admin has no dashboard of its own yet — land on the Point of Sale. */
export default function AdminIndexPage() {
  redirect("/admin/pos");
}
