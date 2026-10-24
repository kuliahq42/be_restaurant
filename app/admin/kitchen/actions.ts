"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Marks every line item of an order as READY and refreshes the KDS board. */
export async function markOrderReady(formData: FormData) {
  const orderId = formData.get("order_id");
  if (typeof orderId !== "string" || orderId.trim() === "") return;

  try {
    await prisma.orderItem.updateMany({
      where: { order_id: BigInt(orderId) },
      data: { kitchen_status: "READY" },
    });
  } catch (error) {
    console.error("markOrderReady failed:", error);
    return;
  }

  revalidatePath("/admin/kitchen");
}
