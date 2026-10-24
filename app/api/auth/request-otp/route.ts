import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

const OTP_TTL_MINUTES = 5;

/**
 * POST /api/auth/request-otp
 * Generates a 6-digit OTP for a phone number and stores it in `otp_requests`.
 * Any previously issued, still-usable code for the same phone is invalidated.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!phone) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const otpRequest = await prisma.$transaction(async (tx) => {
      await tx.otpRequest.updateMany({
        where: { phone, is_used: false, expires_at: { gt: new Date() } },
        data: { is_used: true },
      });

      return tx.otpRequest.create({
        data: { phone, otp_code: otpCode, expires_at: expiresAt },
      });
    });

    // TODO: deliver `otpCode` to the user through an SMS/WhatsApp gateway.
    return NextResponse.json(
      serialize({
        success: true,
        otp_request_id: otpRequest.id,
        expires_at: otpRequest.expires_at,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/request-otp failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
