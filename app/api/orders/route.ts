import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { generateInvoiceNumber } from "@/lib/pos";
import {
  deductInventoryForOrder,
  InsufficientStockError,
} from "@/lib/inventory";

/** Raised for business-rule violations so they map to HTTP 400. */
class OrderValidationError extends Error {}

type IncomingItem = {
  product_id: string | number;
  quantity: number;
  notes?: string | null;
};

/**
 * POST /api/orders
 * Creates an Order together with its OrderItems inside a single transaction.
 * The product "recipe" (Bill of Materials) is then exploded to deduct
 * inventory and record `out` StockMovements (the accounting audit trail).
 *
 * Body: { user_id, table_number?, created_by?, items: [{ product_id, quantity, notes? }] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const userId = body?.user_id;
    const tableNumber =
      typeof body?.table_number === "string" ? body.table_number : null;
    const createdBy = body?.created_by ?? null;
    const rawItems: IncomingItem[] = Array.isArray(body?.items)
      ? body.items
      : [];

    if (userId === undefined || userId === null) {
      throw new OrderValidationError("user_id is required");
    }
    if (rawItems.length === 0) {
      throw new OrderValidationError("At least one order item is required");
    }

    const parsedItems = rawItems.map((raw) => {
      if (raw?.product_id === undefined || raw?.product_id === null) {
        throw new OrderValidationError("Each item requires a product_id");
      }
      const quantity = Number(raw?.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new OrderValidationError(
          "Each item requires a positive integer quantity"
        );
      }
      return {
        product_id: BigInt(raw.product_id),
        quantity,
        notes: raw.notes ?? null,
      };
    });

    const order = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(parsedItems.map((i) => i.product_id))];

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productById = new Map(products.map((p) => [p.id.toString(), p]));

      // 1. Build the order lines and total from database prices.
      let orderTotal = new Prisma.Decimal(0);

      const orderItems = parsedItems.map((item) => {
        const product = productById.get(item.product_id.toString());
        if (!product) {
          throw new OrderValidationError(
            `Product ${item.product_id} not found`
          );
        }

        const price = new Prisma.Decimal(product.price);
        const itemTotal = price.mul(item.quantity);
        orderTotal = orderTotal.add(itemTotal);

        return {
          product_id: product.id,
          quantity: item.quantity,
          price,
          item_total: itemTotal,
          notes: item.notes,
        };
      });

      // 2. Persist the order and its line items.
      const createdOrder = await tx.order.create({
        data: {
          user_id: BigInt(userId),
          invoice_number: generateInvoiceNumber(),
          table_number: tableNumber,
          total: orderTotal,
          status: "PENDING",
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // 3. Deduct inventory from the product recipes and write the audit trail.
      await deductInventoryForOrder(tx, {
        items: parsedItems.map((i) => ({
          productId: i.product_id,
          quantity: i.quantity,
        })),
        invoiceNumber: createdOrder.invoice_number,
        createdBy:
          createdBy === null || createdBy === undefined
            ? null
            : BigInt(createdBy),
      });

      return createdOrder;
    });

    return NextResponse.json(
      serialize({ success: true, data: order }),
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof OrderValidationError ||
      error instanceof InsufficientStockError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/orders failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
