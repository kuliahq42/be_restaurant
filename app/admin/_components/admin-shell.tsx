"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS, type AdminSession } from "@/lib/roles";
import SidebarNav from "./sidebar-nav";

export default function AdminShell({
  session,
  children,
}: {
  session: AdminSession | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // The login screen is rendered without the dashboard chrome.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {/* Persistent sidebar: full-width bar on mobile, fixed column from lg up. */}
      <aside className="w-full shrink-0 bg-slate-900 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:overflow-y-auto">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-slate-900">
            R
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Restaurant OS</p>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 p-3">
          <SidebarNav role={session?.role ?? null} />
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-300">
              {session?.username?.slice(0, 2) ?? "--"}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-white">
                {session?.username ?? "Unknown"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {session ? ROLE_LABELS[session.role] : "No session"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="px-4 pb-6 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          <Link href="/admin" className="transition hover:text-slate-600">
            Restaurant OS · Back Office
          </Link>
        </footer>
      </div>
    </div>
  );
}
