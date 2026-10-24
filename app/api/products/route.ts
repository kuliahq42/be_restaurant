import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

// Always hit the database instead of being statically prerendered at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Returns the product catalog grouped with its category.
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: [{ category_id: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(serialize({ success: true, data: products }));
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
