import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/rbac";
import { signJwt } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/auth/login - User login
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password_hash: true,
        role: true,
        assigned_bank_id: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const superAdminUsername =
      process.env.SUPER_ADMIN_USERNAME?.toLowerCase().trim() || "admin@quicktrackinc.com";

    let role = user.role as Role | undefined;

    if (!role) {
      role =
        user.username.toLowerCase() === superAdminUsername ? Role.SUPER_ADMIN : Role.USER;
    }

    // Ensure the special super admin account always has SUPER_ADMIN role
    if (user.username.toLowerCase() === superAdminUsername && role !== Role.SUPER_ADMIN) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.SUPER_ADMIN },
      });
      role = Role.SUPER_ADMIN;
    }

    const token = signJwt({
      userId: user.id,
      username: user.username,
      role,
    });

    const userPayload = {
      id: user.id,
      username: user.username,
      role,
      assignedBankId: user.assigned_bank_id ?? null,
      createdAt: user.created_at,
    };

    return NextResponse.json({
      success: true,
      user: userPayload,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined;
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: errorMessage,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}
