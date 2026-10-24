"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCT_ROLES, type Role } from "@/lib/roles";

type NavItem = { href: string; label: string; roles?: Role[] };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { href: "/admin/pos", label: "Point of Sale" },
      { href: "/admin/kitchen", label: "Kitchen Display" },
      { href: "/admin/inventory", label: "Inventory Management" },
    ],
  },
  {
    title: "Master Data",
    items: [
      { href: "/admin/products", label: "Data Master Menu", roles: PRODUCT_ROLES },
      { href: "/admin/users", label: "User Management", roles: ["MASTER"] },
    ],
  },
];

export default function SidebarNav({ role }: { role: Role | null }) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.roles || (role !== null && item.roles.includes(role))
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {group.title}
          </p>
          <ul className="grid gap-1">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
