import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, Role } from '@/lib/rbac';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().min(1),
  accountIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  if (response) return response;

  try {
    const body = await req.json();
    const { userId, accountIds } = schema.parse(body);

    // In the current schema, a user can only have one assigned_bank_id
    // So we'll assign the first accountId to the user
    const bankId = parseInt(accountIds[0], 10);
    if (isNaN(bankId)) {
      return NextResponse.json({ error: 'Invalid bank ID' }, { status: 400 });
    }

    // Verify the bank exists
    const bank = await prisma.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }

    // Update user's assigned_bank_id
    await prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: { assigned_bank_id: bankId },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Error assigning account:', e);
    return NextResponse.json(
      { error: 'Failed to assign accounts', details: e?.message },
      { status: 400 }
    );
  }
}
