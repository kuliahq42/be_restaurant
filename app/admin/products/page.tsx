import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PRODUCT_ROLES, isProductManager } from "@/lib/roles";
import Unauthorized from "../_components/unauthorized";
import ProductsClient, {
  type CategoryOption,
  type ProductRow,
} from "./products-client";

export const metadata = { title: "Data Master Menu · Restaurant Admin" };

// Menu data is read live from the database on every request.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await requireSession();

  if (!isProductManager(session.role)) {
    return (
      <Unauthorized
        title="Unauthorized"
        description="The Data Master Menu is limited to Master, Cashier and Admin Kitchen roles."
        allowedRoles={PRODUCT_ROLES}
      />
    );
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: [{ category_id: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: ProductRow[] = products.map((product) => ({
    id: product.id.toString(),
    name: product.name,
    label: product.label,
    description: product.description,
    price: product.price.toString(),
    image: product.image,
    categoryId: product.category_id.toString(),
    categoryName: product.category?.name ?? "Uncategorized",
  }));

  const options: CategoryOption[] = categories.map((category) => ({
    id: category.id.toString(),
    name: category.name,
  }));

  return <ProductsClient products={rows} categories={options} />;
}
