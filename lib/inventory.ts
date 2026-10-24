import { Prisma } from "@prisma/client";

/** Raised when a product's recipe needs more stock than is on hand. */
export class InsufficientStockError extends Error {}

export type InventoryDeductionItem = {
  productId: bigint;
  quantity: number;
};

/**
 * Explodes each product's "recipe" (Bill of Materials) into an aggregated
 * ingredient requirement, verifies the stock is available, then deducts it and
 * records one `out` StockMovement per material as the accounting audit trail.
 *
 * Must be called inside a Prisma transaction so the whole order rolls back if
 * any material is short.
 */
export async function deductInventoryForOrder(
  tx: Prisma.TransactionClient,
  params: {
    items: InventoryDeductionItem[];
    invoiceNumber: string;
    createdBy?: bigint | null;
  }
): Promise<void> {
  const { items, invoiceNumber, createdBy = null } = params;
  if (items.length === 0) return;

  // Sum quantities per product (the same product may appear on several lines).
  const quantityByProduct = new Map<string, number>();
  for (const item of items) {
    const key = item.productId.toString();
    quantityByProduct.set(key, (quantityByProduct.get(key) ?? 0) + item.quantity);
  }

  const recipes = await tx.productRecipe.findMany({
    where: { product_id: { in: [...quantityByProduct.keys()].map(BigInt) } },
  });
  if (recipes.length === 0) return;

  const usage = new Map<
    string,
    { inventoryItemId: bigint; quantity: Prisma.Decimal }
  >();

  for (const recipe of recipes) {
    const orderedQuantity =
      quantityByProduct.get(recipe.product_id.toString()) ?? 0;
    if (orderedQuantity <= 0) continue;

    const key = recipe.inventory_item_id.toString();
    const needed = new Prisma.Decimal(recipe.quantity_needed).mul(
      orderedQuantity
    );
    const existing = usage.get(key);

    usage.set(key, {
      inventoryItemId: recipe.inventory_item_id,
      quantity: existing ? existing.quantity.add(needed) : needed,
    });
  }

  if (usage.size === 0) return;

  const inventoryItems = await tx.inventoryItem.findMany({
    where: { id: { in: [...usage.values()].map((u) => u.inventoryItemId) } },
  });
  const stockById = new Map(inventoryItems.map((i) => [i.id.toString(), i]));

  for (const entry of usage.values()) {
    const inventoryItem = stockById.get(entry.inventoryItemId.toString());
    if (!inventoryItem) {
      throw new InsufficientStockError(
        `Inventory item ${entry.inventoryItemId} not found`
      );
    }
    if (new Prisma.Decimal(inventoryItem.stock).lessThan(entry.quantity)) {
      throw new InsufficientStockError(
        `Insufficient stock for "${inventoryItem.name}"`
      );
    }
  }

  for (const entry of usage.values()) {
    await tx.inventoryItem.update({
      where: { id: entry.inventoryItemId },
      data: { stock: { decrement: entry.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        inventory_item_id: entry.inventoryItemId,
        movement_type: "out",
        quantity: entry.quantity,
        description: `Auto-deducted for order ${invoiceNumber}`,
        created_by: createdBy,
      },
    });
  }
}
