import { prisma } from "@/lib/prisma";

// Stock levels are read live from the database on every request.
export const dynamic = "force-dynamic";

const stockFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
});

const costFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function InventoryPage() {
  const inventoryItems = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Material stock levels and unit costs used for COGS valuation.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
        >
          Record Stock Movement
        </button>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Material Name
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Unit
                </th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">
                  Current Stock
                </th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">
                  Cost Per Unit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-16 text-center text-sm text-slate-500"
                  >
                    No inventory items yet. Materials will appear here once they
                    are registered.
                  </td>
                </tr>
              ) : (
                inventoryItems.map((item) => (
                  <tr
                    key={item.id.toString()}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-500">
                      {item.unit}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-slate-900">
                      {stockFormatter.format(Number(item.stock))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-slate-900">
                      {costFormatter.format(Number(item.cost_per_unit))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {inventoryItems.length > 0 ? (
          <footer className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            {inventoryItems.length}{" "}
            {inventoryItems.length === 1 ? "material" : "materials"} tracked
          </footer>
        ) : null}
      </section>
    </div>
  );
}
