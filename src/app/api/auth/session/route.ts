import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonGuardError } from "@/lib/guards";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        username: true,
        role: true,
        assigned_bank_id: true,
        created_at: true,
      },
    });

    if (!user) {
      throw { status: 404, message: "User not found" };
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        username: user.username,
        role: user.role,
        email: null,
        assignedBankId: user.assigned_bank_id
          ? String(user.assigned_bank_id)
          : null,
        createdAt: user.created_at,
        store: null,
      },
    });
  } catch (error) {
    return jsonGuardError(error);
  }
}

