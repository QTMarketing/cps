import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMinimumRole, Role } from '@/lib/rbac';

// GET /api/stores - Get all stores (Manager+ only)
export async function GET(req: NextRequest) {
  const roleCheck = requireMinimumRole(Role.MANAGER);
  const response = await roleCheck(req);

  if (response) {
    return response;
  }

  try {
    const stores = await prisma.store.findMany();
    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

// POST /api/stores - Create a new store (Admin only)
export async function POST(req: NextRequest) {
  const roleCheck = requireMinimumRole(Role.ADMIN);
  const response = await roleCheck(req);

  if (response) {
    return response;
  }

  try {
    const body = await req.json();
    const { name, address, phone } = body;

    const store = await prisma.store.create({
      data: {
        name,
        address,
        phone,
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}
