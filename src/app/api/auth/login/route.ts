import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/rbac";
import { signJwt } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/auth/login - User login
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Login request - failed to parse JSON:", parseError);
      return NextResponse.json(
        { error: "Invalid request format. Expected JSON." },
        { status: 400 }
      );
    }

    const { username, password, email } = body;

    // Support login with either username or email
    const loginIdentifier = username || email;
    console.log("Login attempt for:", loginIdentifier);

    if (!loginIdentifier || !password) {
      console.log("Login failed: Missing username/email or password");
      return NextResponse.json(
        { error: "Username/email and password are required" },
        { status: 400 }
      );
    }

    let user;
    try {
      // Try to find user by username first, then by email
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: loginIdentifier },
            { email: loginIdentifier },
          ],
        },
      select: {
        id: true,
        username: true,
          email: true,
        password_hash: true,
        role: true,
        assigned_bank_id: true,
        created_at: true,
      },
    });
    } catch (dbError) {
      console.error("Database error during login:", dbError);
      return NextResponse.json(
        { error: "Database connection error. Please try again." },
        { status: 500 }
      );
    }

    if (!user) {
      console.log("Login failed: User not found for username:", username);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log("User found:", user.username, "Role:", user.role);

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error("Password comparison error:", bcryptError);
      return NextResponse.json(
        { error: "Authentication error. Please try again." },
        { status: 500 }
      );
    }

    if (!isValidPassword) {
      console.log("Login failed: Invalid password for username:", username);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log("Login successful for username:", username);

    const superAdminUsername =
      process.env.SUPER_ADMIN_USERNAME?.toLowerCase().trim() || "admin@quicktrackinc.com";
    const superAdminEmail = "admin@quicktrackinc.com";

    let role = user.role as Role | undefined;

    if (!role) {
      const isSuperAdmin = 
        user.username.toLowerCase() === superAdminUsername ||
        user.email?.toLowerCase() === superAdminEmail;
      role = isSuperAdmin ? Role.SUPER_ADMIN : Role.USER;
    }

    // Ensure the special super admin account always has SUPER_ADMIN role
    const isSuperAdmin = 
      user.username.toLowerCase() === superAdminUsername ||
      user.email?.toLowerCase() === superAdminEmail;
    if (isSuperAdmin && role !== Role.SUPER_ADMIN) {
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
    
    // Ensure we always return a valid JSON response
    try {
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: errorMessage,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    );
    } catch (responseError) {
      // Fallback if JSON serialization fails
      console.error("Failed to create error response:", responseError);
      return new NextResponse(
        JSON.stringify({ error: "Internal server error", message: errorMessage }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}
