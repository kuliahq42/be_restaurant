"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/session";
import { PRODUCT_ROLES } from "@/lib/roles";

export type ProductActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type ProductInput = {
  name: string;
  categoryId: string;
  price: string;
  label?: string | null;
  description?: string | null;
  image?: string | null;
};

/** Accepts a base64 data URL from the mock uploader. */
const MAX_IMAGE_CHARS = 2_000_000;

function failure(error: string): ProductActionResult {
  return { ok: false, error };
}

/** Re-checks the role server side: the UI is not a security boundary. */
async function requireProductRole() {
  return getSessionWithRole(PRODUCT_ROLES);
}

function refresh() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/pos");
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function parsePrice(value: string): Parsed<Prisma.Decimal> {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: "Price must be a number with up to 2 decimal places." };
  }
  return { ok: true, value: new Prisma.Decimal(trimmed) };
}

function parseImage(value: string | null | undefined): Parsed<string | null> {
  const trimmed = value?.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!trimmed.startsWith("data:image/")) {
    return { ok: false, error: "The image must be uploaded as a file." };
  }
  if (trimmed.length > MAX_IMAGE_CHARS) {
    return {
      ok: false,
      error: "The image is too large. Use a file smaller than about 1.5 MB.",
    };
  }
  return { ok: true, value: trimmed };
}

/** Shared validation for create and update. */
async function validate(input: ProductInput) {
  const name = input.name.trim();
  if (name.length < 2) return failure("Product name must be at least 2 characters.");

  const price = parsePrice(input.price);
  if (!price.ok) return failure(price.error);

  const image = parseImage(input.image);
  if (!image.ok) return failure(image.error);

  let categoryId: bigint;
  try {
    categoryId = BigInt(input.categoryId);
  } catch {
    return failure("Select a valid category.");
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return failure("Select a valid category.");

  return {
    data: {
      name,
      category_id: categoryId,
      price: price.value,
      label: optionalText(input.label),
      description: optionalText(input.description),
      image: image.value,
    },
  };
}

export async function createProduct(input: ProductInput): Promise<ProductActionResult> {
  const session = await requireProductRole();
  if (!session) return failure("Your role cannot manage the menu.");

  const validated = await validate(input);
  if ("ok" in validated) return validated;

  try {
    const product = await prisma.product.create({ data: validated.data });
    refresh();
    return { ok: true, message: `Product "${product.name}" created.` };
  } catch (error) {
    console.error("[createProduct]", error);
    return failure("Could not save the product. Please try again.");
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ProductActionResult> {
  const session = await requireProductRole();
  if (!session) return failure("Your role cannot manage the menu.");

  let productId: bigint;
  try {
    productId = BigInt(id);
  } catch {
    return failure("Invalid product id.");
  }

  const validated = await validate(input);
  if ("ok" in validated) return validated;

  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) return failure("Product not found.");

    const product = await prisma.product.update({
      where: { id: productId },
      data: validated.data,
    });

    refresh();
    return { ok: true, message: `Product "${product.name}" updated.` };
  } catch (error) {
    console.error("[updateProduct]", error);
    return failure("Could not update the product. Please try again.");
  }
}

export async function deleteProduct(id: string): Promise<ProductActionResult> {
  const session = await requireProductRole();
  if (!session) return failure("Your role cannot manage the menu.");

  let productId: bigint;
  try {
    productId = BigInt(id);
  } catch {
    return failure("Invalid product id.");
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return failure("Product not found.");

    await prisma.product.delete({ where: { id: productId } });

    refresh();
    return { ok: true, message: `Product "${product.name}" deleted.` };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return failure(
        "This product is used by existing orders and cannot be deleted."
      );
    }
    console.error("[deleteProduct]", error);
    return failure("Could not delete the product. Please try again.");
  }
}
