import LoginForm from "./login-form";

export const metadata = {
  title: "Sign in · Restaurant OS",
  description: "Admin access for the restaurant operations dashboard.",
};

const HIGHLIGHTS = [
  {
    title: "Point of Sale",
    description: "Ring up orders with live tax, BOM stock deduction and receipts.",
  },
  {
    title: "Kitchen Display",
    description: "Track every ticket from confirmed to ready in real time.",
  },
  {
    title: "Inventory & Accounting",
    description: "Material stock levels, COGS valuation and a full movement ledger.",
  },
];

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const requested = searchParams?.next;
  const nextPath =
    typeof requested === "string" && requested.startsWith("/admin") && !requested.startsWith("/admin/login")
      ? requested
      : "/admin";

  return (
    <div className="grid min-h-screen bg-slate-100 lg:grid-cols-[1.1fr_1fr]">
      {/* Branding panel */}
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-14 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-base font-bold text-slate-950">
              R
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Restaurant OS</p>
              <p className="text-xs text-slate-400">Back Office</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
            Run the dining room,
            <span className="block text-emerald-400">the kitchen and the books.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
            One workspace for orders, inventory and cost accounting — with role
            based access for every member of the team.
          </p>

          <ul className="mt-12 max-w-md space-y-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} Restaurant OS. All rights reserved.
        </p>
      </section>

      {/* Login form panel */}
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-base font-bold text-slate-950">
              R
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Restaurant OS</p>
              <p className="text-xs text-slate-500">Back Office</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <header className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Sign in to the admin panel
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Use the credentials issued by your Master account.
              </p>
            </header>

            <LoginForm nextPath={nextPath} />
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Access is restricted to authorised restaurant staff. All sessions
            expire after 8 hours.
          </p>
        </div>
      </section>
    </div>
  );
}
