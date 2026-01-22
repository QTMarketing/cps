import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMinimumRole, Role } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const roleCheck = requireMinimumRole(Role.ADMIN);
  const response = await roleCheck(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const q = (searchParams.get('q') || '').trim();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Get all users that have assigned_bank_id set
    const usersWithBanks = await prisma.user.findMany({
      where: {
        assigned_bank_id: { not: null },
      },
      select: {
        assigned_bank_id: true,
      },
    });

    const assignedBankIds = usersWithBanks
      .map((u) => u.assigned_bank_id)
      .filter((id): id is number => id !== null);

    // Build where clause for unassigned banks
    const where: any = {};
    if (assignedBankIds.length > 0) {
      where.id = { notIn: assignedBankIds };
    }

    // Add search filter
    if (q) {
      where.OR = [
        { bank_name: { contains: q, mode: 'insensitive' } },
        { dba: { contains: q, mode: 'insensitive' } },
        { account_name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const banks = await prisma.bank.findMany({
      where,
      orderBy: { bank_name: 'asc' },
      select: {
        id: true,
        bank_name: true,
        dba: true,
        account_name: true,
      },
    });

    // Format response to match expected structure
    const accounts = banks.map((bank) => ({
      id: bank.id.toString(),
      name: bank.dba || bank.account_name || bank.bank_name, // DBA Name
      bankName: bank.bank_name, // Bank Name
      accountType: 'CHECKING', // Default account type (not in schema, using placeholder)
    }));

    return NextResponse.json({ accounts });
  } catch (e: any) {
    console.error('Error fetching unassigned accounts:', e);
    return NextResponse.json(
      { error: 'Failed to load unassigned accounts', details: e?.message },
      { status: 500 }
    );
  }
}
