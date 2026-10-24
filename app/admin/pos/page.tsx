"use client";

import { useEffect, useMemo, useState } from "react";
import { computeTotals, formatMoney, TAX_RATE } from "@/lib/pos";

type ApiProduct = {
  id: string;
  name: string;
  label: string | null;
  description: string | null;
  price: string;
  image: string | null;
  category: { id: string; name: string } | null;
};

type CartLine = { product: ApiProduct; quantity: number };
type PaymentMethod = "cash" | "edc";
type Feedback = { type: "success" | "error"; message: string };

const TAX_LABEL = `Tax (PPN ${Math.round(TAX_RATE * 100)}%)`;

export default function PosPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [userId, setUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json?.error ?? "Could not load the menu");
        }
        if (!cancelled) setProducts(json.data ?? []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load the menu"
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const product of products) {
      if (product.category) seen.set(product.category.id, product.category.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "all" || product.category?.id === activeCategory;
      const matchesSearch =
        term === "" ||
        product.name.toLowerCase().includes(term) ||
        (product.label ?? "").toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, activeCategory]);

  const totals = useMemo(
    () =>
      computeTotals(
        cart.reduce(
          (sum, line) => sum + Number(line.product.price) * line.quantity,
          0
        )
      ),
    [cart]
  );

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function addToCart(product: ApiProduct) {
    setFeedback(null);
    setCart((previous) => {
      const existing = previous.find((line) => line.product.id === product.id);
      if (existing) {
        return previous.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [...previous, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((previous) =>
      previous.flatMap((line) => {
        if (line.product.id !== productId) return [line];
        const quantity = line.quantity + delta;
        return quantity <= 0 ? [] : [{ ...line, quantity }];
      })
    );
  }

  function removeLine(productId: string) {
    setCart((previous) => previous.filter((line) => line.product.id !== productId));
  }

  async function handleCheckout() {
    if (cart.length === 0 || isSubmitting) return;

    if (userId.trim() === "") {
      setFeedback({
        type: "error",
        message: "Enter the customer user ID before checkout.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId.trim(),
          payment_method: paymentMethod,
          total: totals.total,
          items: cart.map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error ?? "Checkout failed");
      }

      const invoice = json?.data?.order?.invoice_number ?? "new order";
      setFeedback({
        type: "success",
        message: `Paid ${formatMoney(totals.total)} — ${invoice}`,
      });
      setCart([]);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Checkout failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Point of Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Build the ticket and settle it at the counter.
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
          {itemCount} item{itemCount === 1 ? "" : "s"} in ticket
        </span>
      </header>

      {feedback ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Left: menu picker (65%) — Right: active ticket (35%) */}
      <div className="grid gap-6 lg:grid-cols-[65fr_35fr]">
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the menu..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <FilterChip
                label="All"
                isActive={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
              />
              {categories.map((category) => (
                <FilterChip
                  key={category.id}
                  label={category.name}
                  isActive={activeCategory === category.id}
                  onClick={() => setActiveCategory(category.id)}
                />
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-700">
              {loadError}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
              No menu items match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <div className="flex h-24 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-2xl font-semibold text-slate-400">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-sm font-medium text-slate-900">
                      {product.name}
                    </p>
                    {product.label ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {product.label}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm font-semibold text-emerald-700">
                      {formatMoney(Number(product.price))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Active Ticket
                </h2>
                <p className="text-xs text-slate-500">
                  {cart.length} line{cart.length === 1 ? "" : "s"} · {itemCount}{" "}
                  item{itemCount === 1 ? "" : "s"}
                </p>
              </div>
              {cart.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs font-medium text-slate-500 transition hover:text-rose-600"
                >
                  Clear
                </button>
              ) : null}
            </header>

            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Tap a menu item to start the ticket.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {cart.map((line) => (
                    <li key={line.product.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {line.product.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatMoney(Number(line.product.price))} each
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.product.id)}
                          aria-label={`Remove ${line.product.name}`}
                          className="shrink-0 rounded px-1 text-lg leading-none text-slate-400 transition hover:text-rose-600"
                        >
                          &times;
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.product.id, -1)}
                            aria-label={`Decrease ${line.product.name}`}
                            className="h-7 w-7 text-slate-600 transition hover:bg-slate-50"
                          >
                            &minus;
                          </button>
                          <span className="w-8 text-center text-sm tabular-nums text-slate-900">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.product.id, 1)}
                            aria-label={`Increase ${line.product.name}`}
                            className="h-7 w-7 text-slate-600 transition hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatMoney(
                            Number(line.product.price) * line.quantity
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">
                  Customer ID (user_id)
                </span>
                <input
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 1"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <div className="mt-3">
                <span className="text-xs font-medium text-slate-500">
                  Payment method
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["cash", "edc"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium uppercase transition ${
                        paymentMethod === method
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="tabular-nums text-slate-900">
                    {formatMoney(totals.subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">{TAX_LABEL}</dt>
                  <dd className="tabular-nums text-slate-900">
                    {formatMoney(totals.tax)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                  <dt>Grand Total</dt>
                  <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting
                  ? "Processing..."
                  : `Checkout / Pay ${formatMoney(totals.total)}`}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        isActive
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
