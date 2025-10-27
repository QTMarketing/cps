/**
 * User Password Management API Routes
 * 
 * This file handles password-specific operations for users.
 * All routes are protected with RBAC middleware requiring ADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, Role } from '@/lib/rbac';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// =============================================================================
// PATCH /api/users/[id]/password - Update user password
// =============================================================================

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    const body = await req.json();
    const { password } = updatePasswordSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: (await params).id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await prisma.user.update({
      where: { id: (await params).id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ 
      message: 'Password updated successfully',
      user: {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/users/[id]/reset-password - Reset user password with confirmation
// =============================================================================

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    const body = await req.json();
    const { newPassword } = resetPasswordSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: (await params).id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: (await params).id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ 
      message: 'Password reset successfully',
      user: {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
      },
      resetAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/users/[id]/password-status - Check password status
// =============================================================================

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: (await params).id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      user: {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
      },
      lastUpdated: existingUser.updatedAt,
      passwordStatus: 'active', // Password is active (we don't store password status separately)
    });
  } catch (error) {
    console.error('Error checking password status:', error);
    return NextResponse.json(
      { error: 'Failed to check password status' },
      { status: 500 }
    );
  }
}
