"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/session";
import { isRole } from "@/lib/roles";

export type AdminActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/i;
const MIN_PASSWORD_LENGTH = 6;

/** Every action is re-checked server side: the UI is not a security boundary. */
async function requireMaster() {
  const session = await getSessionWithRole(["MASTER"]);
  return session;
}

function failure(error: string): AdminActionResult {
  return { ok: false, error };
}

function refresh() {
  revalidatePath("/admin/users");
}

function validateCredentials(username: string, password: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3-32 characters (letters, numbers, dot, dash or underscore).";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export async function createAdmin(input: {
  username: string;
  password: string;
  role: string;
}): Promise<AdminActionResult> {
  const session = await requireMaster();
  if (!session) return failure("Only a Master account can create admins.");

  const username = input.username.trim();
  const password = input.password;

  const invalid = validateCredentials(username, password);
  if (invalid) return failure(invalid);
  if (!isRole(input.role)) return failure("Select a valid role.");

  try {
    const admin = await prisma.admin.create({
      data: {
        username,
        password: await bcrypt.hash(password, 10),
        role: input.role,
      },
    });

    refresh();
    return { ok: true, message: `Admin "${admin.username}" created.` };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure(`Username "${username}" is already taken.`);
    }
    console.error("[createAdmin]", error);
    return failure("Could not create the admin. Please try again.");
  }
}

export async function updateAdminRole(input: {
  id: string;
  role: string;
}): Promise<AdminActionResult> {
  const session = await requireMaster();
  if (!session) return failure("Only a Master account can change roles.");

  if (!isRole(input.role)) return failure("Select a valid role.");

  let id: bigint;
  try {
    id = BigInt(input.id);
  } catch {
    return failure("Invalid admin id.");
  }

  if (id.toString() === session.id && input.role !== "MASTER") {
    return failure("You cannot remove your own Master role.");
  }

  try {
    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) return failure("Admin not found.");

    if (target.role === "MASTER" && input.role !== "MASTER") {
      const masterCount = await prisma.admin.count({
        where: { role: "MASTER" },
      });
      if (masterCount <= 1) {
        return failure("At least one Master account must remain.");
      }
    }

    await prisma.admin.update({ where: { id }, data: { role: input.role } });
    refresh();
    return { ok: true, message: `Role updated to ${input.role}.` };
  } catch (error) {
    console.error("[updateAdminRole]", error);
    return failure("Could not update the role. Please try again.");
  }
}

export async function changeAdminPassword(input: {
  id: string;
  password: string;
}): Promise<AdminActionResult> {
  const session = await requireMaster();
  if (!session) return failure("Only a Master account can reset passwords.");

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return failure(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  let id: bigint;
  try {
    id = BigInt(input.id);
  } catch {
    return failure("Invalid admin id.");
  }

  try {
    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) return failure("Admin not found.");

    await prisma.admin.update({
      where: { id },
      data: { password: await bcrypt.hash(input.password, 10) },
    });

    refresh();
    return { ok: true, message: `Password updated for "${target.username}".` };
  } catch (error) {
    console.error("[changeAdminPassword]", error);
    return failure("Could not update the password. Please try again.");
  }
}

export async function deleteAdmin(id: string): Promise<AdminActionResult> {
  const session = await requireMaster();
  if (!session) return failure("Only a Master account can delete admins.");

  let adminId: bigint;
  try {
    adminId = BigInt(id);
  } catch {
    return failure("Invalid admin id.");
  }

  if (adminId.toString() === session.id) {
    return failure("You cannot delete your own account.");
  }

  try {
    const target = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!target) return failure("Admin not found.");

    if (target.role === "MASTER") {
      const masterCount = await prisma.admin.count({ where: { role: "MASTER" } });
      if (masterCount <= 1) {
        return failure("At least one Master account must remain.");
      }
    }

    await prisma.admin.delete({ where: { id: adminId } });
    refresh();
    return { ok: true, message: `Admin "${target.username}" deleted.` };
  } catch (error) {
    console.error("[deleteAdmin]", error);
    return failure("Could not delete the admin. Please try again.");
  }
}
