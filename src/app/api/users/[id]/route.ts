/**
 * Individual User API Routes
 * 
 * This file handles operations on specific users by ID.
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

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
  storeId: z.string().optional(),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8),
});

// =============================================================================
// GET /api/users/[id] - Get specific user details
// =============================================================================

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (await params).id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: {
            name: true,
            address: true,
            phone: true,
          },
        },
        _count: {
          select: {
            checks: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/users/[id] - Update user details
// =============================================================================

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: (await params).id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for username conflicts (if username is being updated)
    if (validatedData.username && validatedData.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: validatedData.username },
      });

      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    // Check for email conflicts (if email is being updated)
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.username) {
      updateData.username = validatedData.username;
    }
    
    if (validatedData.email) {
      updateData.email = validatedData.email;
    }
    
    if (validatedData.role) {
      updateData.role = validatedData.role;
    }
    
    if (validatedData.storeId) {
      updateData.storeId = validatedData.storeId;
    }
    
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: (await params).id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      user: updatedUser,
      message: 'User updated successfully',
      updatedFields: Object.keys(validatedData),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/users/[id] - Delete user
// =============================================================================

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: (await params).id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has any associated checks
    const userChecks = await prisma.check.count({
      where: { issuedBy: (await params).id },
    });

    if (userChecks > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with associated checks',
          details: `User has ${userChecks} checks associated with their account`,
          suggestion: 'Consider transferring checks to another user or voiding them first'
        },
        { status: 400 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}