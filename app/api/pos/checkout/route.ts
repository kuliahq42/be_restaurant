import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { computeTotals, generateInvoiceNumber } from "@/lib/pos";
import {
  deductInventoryForOrder,
  InsufficientStockError,
} from "@/lib/inventory";

/** Raised for business-rule violations so they map to HTTP 400. */
class CheckoutError extends Error {}

const PAYMENT_METHODS = new Set(["cash", "edc"]);

/**
 * POST /api/pos/checkout
 * Settles a cashier cart: creates a completed Order, its OrderItems and the
 * matching Payment, then deducts inventory through the product recipes.
 * Everything runs inside one transaction so a stock shortfall rolls back the
 * whole ticket.
 *
 * Body: { user_id, payment_method: 'cash' | 'edc', items: [{ product_id, quantity }], total? }
 * NOTE: `total` is accepted for traceability but never trusted — the server
 * recomputes subtotal, PPN and grand total from the database prices.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const userId = body?.user_id;
    const tableNumber =
      typeof body?.table_number === "string" ? body.table_number : null;
    const paymentMethod =
      typeof body?.payment_method === "string"
        ? body.payment_method.toLowerCase()
        : "cash";
    const rawItems: { product_id?: unknown; quantity?: unknown }[] =
      Array.isArray(body?.items) ? body.items : [];

    if (userId === undefined || userId === null) {
      throw new CheckoutError("user_id is required");
    }
    if (rawItems.length === 0) {
      throw new CheckoutError("At least one cart item is required");
    }
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      throw new CheckoutError("payment_method must be 'cash' or 'edc'");
    }

    const parsedItems = rawItems.map((raw) => {
      const productId = raw?.product_id;
      if (
        typeof productId !== "string" &&
        typeof productId !== "number" &&
        typeof productId !== "bigint"
      ) {
        throw new CheckoutError("Each item requires a product_id");
      }
      const quantity = Number(raw?.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new CheckoutError(
          "Each item requires a positive integer quantity"
        );
      }
      return { product_id: BigInt(productId), quantity };
    });

    const result = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(parsedItems.map((i) => i.product_id))];

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productById = new Map(products.map((p) => [p.id.toString(), p]));

      // 1. Price the ticket from database values, never from the client.
      let subtotal = new Prisma.Decimal(0);
      const orderItems = parsedItems.map((item) => {
        const product = productById.get(item.product_id.toString());
        if (!product) {
          throw new CheckoutError(`Product ${item.product_id} not found`);
        }

        const price = new Prisma.Decimal(product.price);
        const itemTotal = price.mul(item.quantity);
        subtotal = subtotal.add(itemTotal);

        return {
          product_id: product.id,
          quantity: item.quantity,
          price,
          item_total: itemTotal,
          notes: null,
        };
      });

      const totals = computeTotals(Number(subtotal));
      const grandTotal = new Prisma.Decimal(totals.total.toFixed(2));

      // 2. The settled order.
      const order = await tx.order.create({
        data: {
          user_id: BigInt(userId),
          invoice_number: generateInvoiceNumber(),
          table_number: tableNumber,
          total: grandTotal,
          status: "completed",
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // 3. The payment record (payment_method lives on Payment, not Order).
      const payment = await tx.payment.create({
        data: {
          order_id: order.id,
          payment_method: paymentMethod,
          amount: grandTotal,
          status: "PAID",
        },
      });

      // 4. Deduct inventory via the product recipes (accounting audit trail).
      await deductInventoryForOrder(tx, {
        items: parsedItems.map((i) => ({
          productId: i.product_id,
          quantity: i.quantity,
        })),
        invoiceNumber: order.invoice_number,
      });

      return { order, payment, totals };
    });

    return NextResponse.json(
      serialize({
        success: true,
        data: {
          order: result.order,
          payment: result.payment,
          totals: result.totals,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("POST /api/pos/checkout failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
