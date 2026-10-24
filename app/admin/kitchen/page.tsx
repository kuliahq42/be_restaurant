import { prisma } from "@/lib/prisma";
import { markOrderReady } from "./actions";

// Orders change constantly, so this board is rendered on every request.
export const dynamic = "force-dynamic";

const KITCHEN_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COOKING: "bg-blue-100 text-blue-700",
  READY: "bg-emerald-100 text-emerald-700",
  SERVED: "bg-slate-100 text-slate-600",
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function KitchenPage() {
  const orders = await prisma.order.findMany({
    where: { status: "confirmed" },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { created_at: "asc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Kitchen Display
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Active tickets awaiting preparation.
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
          {orders.length} active {orders.length === 1 ? "order" : "orders"}
        </span>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">
            No confirmed orders right now
          </p>
          <p className="mt-1 text-sm text-slate-500">
            New tickets will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <article
              key={order.id.toString()}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Table
                  </p>
                  <p className="text-lg font-semibold leading-tight text-slate-900">
                    {order.table_number ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Invoice
                  </p>
                  <p className="font-mono text-xs text-slate-700">
                    {order.invoice_number}
                  </p>
                </div>
              </header>

              <div className="flex items-center justify-between px-4 py-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-amber-700">
                  {order.status}
                </span>
                <span className="text-xs text-slate-400">
                  {formatTime(order.created_at)}
                </span>
              </div>

              <ul className="flex-1 divide-y divide-slate-100 border-t border-slate-100">
                {order.items.map((item) => (
                  <li key={item.id.toString()} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="mr-2 inline-flex min-w-[2rem] justify-center rounded bg-slate-900 px-1.5 py-0.5 text-xs font-semibold text-white">
                            {item.quantity}x
                          </span>
                          <span className="font-medium">
                            {item.product.name}
                          </span>
                        </p>
                        {item.notes ? (
                          <p className="mt-1.5 text-xs italic text-slate-500">
                            Note: {item.notes}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          KITCHEN_STATUS_STYLES[item.kitchen_status] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.kitchen_status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <form action={markOrderReady} className="border-t border-slate-100 p-3">
                <input
                  type="hidden"
                  name="order_id"
                  value={order.id.toString()}
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Mark as Ready
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
