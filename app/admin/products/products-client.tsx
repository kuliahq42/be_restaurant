"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/pos";
import { Modal, ModalActions } from "../_components/modal";
import { createProduct, deleteProduct, updateProduct } from "./actions";

export type ProductRow = {
  id: string;
  name: string;
  label: string | null;
  description: string | null;
  price: string;
  image: string | null;
  categoryId: string;
  categoryName: string;
};

export type CategoryOption = { id: string; name: string };

type FormState = {
  name: string;
  categoryId: string;
  price: string;
  label: string;
  description: string;
  image: string | null;
};

type Feedback = { type: "success" | "error"; message: string };

const MAX_IMAGE_BYTES = 1_500_000;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

function emptyForm(categoryId: string): FormState {
  return {
    name: "",
    categoryId,
    price: "",
    label: "",
    description: "",
    image: null,
  };
}

export default function ProductsClient({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(categories[0]?.id ?? ""));
  const [formError, setFormError] = useState<string | null>(null);

  const [viewTarget, setViewTarget] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === "all" || product.categoryId === categoryFilter;
      const matchesSearch =
        term === "" ||
        product.name.toLowerCase().includes(term) ||
        (product.label ?? "").toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, categoryFilter]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm(categories[0]?.id ?? ""));
    setFormError(null);
  }

  function openEdit(product: ProductRow) {
    setFormMode("edit");
    setEditingId(product.id);
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      price: product.price,
      label: product.label ?? "",
      description: product.description ?? "",
      image: product.image,
    });
    setFormError(null);
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
    setFormError(null);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError("The image is too large. Use a file smaller than about 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormError(null);
      setForm((current) => ({
        ...current,
        image: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.onerror = () => setFormError("Could not read the selected file.");
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    setFormError(null);

    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      price: form.price,
      label: form.label,
      description: form.description,
      image: form.image,
    };

    startTransition(async () => {
      const result = editingId
        ? await updateProduct(editingId, payload)
        : await createProduct(payload);

      if (result.ok) {
        setFeedback({ type: "success", message: result.message });
        closeForm();
        router.refresh();
      } else {
        setFormError(result.error);
      }
    });
  }

  function handleDelete(target: ProductRow) {
    startTransition(async () => {
      const result = await deleteProduct(target.id);
      setFeedback(
        result.ok
          ? { type: "success", message: result.message }
          : { type: "error", message: result.error }
      );
      setDeleteTarget(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Data Master Menu
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Products, categories and selling prices used by the Point of Sale.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={categories.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Product
        </button>
      </header>

      {categories.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No categories exist yet. Add a category before creating products.
        </p>
      ) : null}

      {feedback ? (
        <p
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="relative min-w-[220px] flex-1">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or label…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  No
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Image
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-500">
                    {products.length === 0
                      ? "No products yet. Use “Add Product” to build your menu."
                      : "No products match the current search or filter."}
                  </td>
                </tr>
              ) : (
                visibleProducts.map((product, index) => (
                  <tr key={product.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-3 text-slate-500">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <Thumbnail product={product} />
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      {product.label ? (
                        <p className="text-xs text-slate-500">{product.label}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-500">
                      {product.categoryName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-slate-900">
                      {formatMoney(product.price)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => setViewTarget(product)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
          Showing {visibleProducts.length} of {products.length}{" "}
          {products.length === 1 ? "product" : "products"}
        </footer>
      </section>

      {/* Add / edit form */}
      {formMode ? (
        <Modal
          title={formMode === "create" ? "Add Product" : `Edit · ${form.name}`}
          onClose={closeForm}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="product-name" className="text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="product-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Nasi Goreng Spesial"
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="product-category" className="text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  id="product-category"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="product-price" className="text-sm font-medium text-slate-700">
                  Price
                </label>
                <input
                  id="product-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="e.g. 45000"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="product-label" className="text-sm font-medium text-slate-700">
                Label <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="product-label"
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="e.g. Best Seller, Spicy"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="product-description" className="text-sm font-medium text-slate-700">
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                id="product-description"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Ingredients, portion size, allergens…"
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="product-image" className="text-sm font-medium text-slate-700">
                Image <span className="text-slate-400">(optional)</span>
              </label>
              <div className="mt-1.5 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                  {form.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.image}
                      alt="Selected product"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] uppercase text-slate-400">No image</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Stored as a base64 data URL (local mock uploader).
                    </p>
                    {form.image ? (
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, image: null }))}
                        className="shrink-0 text-xs font-semibold text-red-600 transition hover:text-red-500"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {formError ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                {formError}
              </p>
            ) : null}
          </div>

          <ModalActions
            isPending={isPending}
            confirmLabel={formMode === "create" ? "Create Product" : "Save Changes"}
            onCancel={closeForm}
            onConfirm={handleSubmit}
          />
        </Modal>
      ) : null}

      {/* Detail view */}
      {viewTarget ? (
        <Modal title="Product Detail" onClose={() => setViewTarget(null)}>
          <div className="space-y-4">
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {viewTarget.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewTarget.image}
                  alt={viewTarget.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  No image
                </span>
              )}
            </div>

            <dl className="divide-y divide-slate-100 text-sm">
              <DetailRow label="Name" value={viewTarget.name} />
              <DetailRow label="Category" value={viewTarget.categoryName} />
              <DetailRow label="Price" value={formatMoney(viewTarget.price)} />
              <DetailRow label="Label" value={viewTarget.label ?? "—"} />
              <DetailRow label="Description" value={viewTarget.description ?? "—"} />
            </dl>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewTarget(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                const target = viewTarget;
                setViewTarget(null);
                if (target) openEdit(target);
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Edit
            </button>
          </div>
        </Modal>
      ) : null}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <Modal title="Delete product" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Permanently delete{" "}
            <span className="font-semibold text-slate-900">{deleteTarget.name}</span>?
            This cannot be undone.
          </p>

          <ModalActions
            isPending={isPending}
            confirmLabel="Delete"
            destructive
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => handleDelete(deleteTarget)}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function Thumbnail({ product }: { product: ProductRow }) {
  if (product.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.image}
        alt={product.name}
        className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-400">
      {product.name.slice(0, 2)}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2.5">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-slate-900">{value}</dd>
    </div>
  );
}
