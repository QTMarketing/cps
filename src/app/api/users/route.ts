/**
 * User Management API Routes
 * 
 * This file provides comprehensive user management functionality for admins
 * to modify user details including ID, username, email, and password.
 * All routes are protected with RBAC middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  requirePermission, 
  requireRole, 
  Permission, 
  Role,
  getUserFromRequest 
} from '@/lib/rbac';
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

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).default('USER'),
  storeId: z.string(),
});

// =============================================================================
// GET /api/users - List all users (Admin only)
// =============================================================================

export async function GET(req: NextRequest) {
  // Require ADMIN role to view all users
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/users - Create new user (Admin only)
// =============================================================================

export async function POST(req: NextRequest) {
  // Require ADMIN role to create users
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  
  if (response) {
    return response;
  }

  try {
    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    // Check if username already exists
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        passwordHash: hashedPassword,
        role: validatedData.role,
        storeId: validatedData.storeId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}


