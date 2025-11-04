"use server";

import { typedSupabaseAdmin } from "@/lib/supabase";
import type { CheckRecord, PaymentMethod } from "./types";

type ListChecksParams = {
  q?: string;
  status?: 'All' | 'PENDING' | 'CLEARED' | 'VOIDED';
  page?: number;
  pageSize?: number;
  storeId?: string;
  vendorId?: string;
};

const mapStatusToDb = (s?: 'PENDING' | 'CLEARED' | 'VOIDED') => {
  if (!s) return undefined;
  if (s === 'PENDING') return 'ISSUED' as const;
  if (s === 'CLEARED') return 'CLEARED' as const;
  if (s === 'VOIDED') return 'VOIDED' as const;
  return undefined;
};

const mapDbStatusToUi = (s: string): CheckRecord['status'] => {
  switch (s) {
    case 'ISSUED':
      return 'PENDING';
    case 'CLEARED':
      return 'CLEARED';
    case 'VOIDED':
      return 'VOIDED';
    default:
      return 'PENDING';
  }
};

const mapPaymentToDb = (m: PaymentMethod): 'Check' | 'EDI' | 'MO' | 'Cash' => {
  switch (m) {
    case 'CHECK': return 'Check';
    case 'EDI': return 'EDI';
    case 'MO': return 'MO';
    case 'CASH': return 'Cash';
  }
};

export async function listChecks(params: ListChecksParams): Promise<{ rows: CheckRecord[]; total: number; }> {
  const page = Math.max(0, params.page ?? 0);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Base query with nested relations
  let query = typedSupabaseAdmin
    .from('checks')
    .select(`
      id,
      created_at,
      check_number,
      amount,
      memo,
      status,
      invoice_url,
      vendor:vendors(id, vendor_name, store:stores(id, name)),
      user:users!checks_issued_by_fkey(id, username)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  // Status filter
  const dbStatus = params.status && params.status !== 'All' ? mapStatusToDb(params.status) : undefined;
  if (dbStatus) {
    query = query.eq('status', dbStatus);
  }

  // Vendor filter
  if (params.vendorId) {
    query = query.eq('vendor_id', params.vendorId);
  }

  // Store filter (through vendor.store_id)
  if (params.storeId) {
    query = query.eq('vendors.store_id', params.storeId);
  }

  // Simple search across fields
  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    // ilike on check_number or memo; for nested names, rely on PostgREST text search via or
    query = query.or(`check_number.ilike.%${q}%,memo.ilike.%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    return { rows: [], total: 0 };
  }

  const rows: CheckRecord[] = (data || []).map((row: any) => {
    const vendor = row.vendor || {};
    const store = vendor.store || {};
    const user = row.user || {};
    return {
      id: row.id,
      createdAt: row.created_at,
      checkNumber: String(row.check_number || ''),
      vendorId: vendor.id,
      vendorName: vendor.vendor_name || 'Unknown Vendor',
      storeId: store.id || '',
      storeName: store.name || 'Unknown Store',
      amount: Number(row.amount || 0),
      memo: row.memo || undefined,
      userId: user.id || '',
      userName: user.username || 'Unknown',
      invoiceUrl: row.invoice_url || undefined,
      status: mapDbStatusToUi(row.status || 'ISSUED'),
    } as CheckRecord;
  });

  return { rows, total: count || 0 };
}

export async function listVendors(): Promise<{ id: string; name: string; }[]> {
  const { data, error } = await typedSupabaseAdmin
    .from('vendors')
    .select('id, vendor_name')
    .order('vendor_name');
  if (error) return [];
  return (data || []).map((v: any) => ({ id: v.id, name: v.vendor_name }));
}

export async function listStores(): Promise<{ id: string; name: string; }[]> {
  const { data, error } = await typedSupabaseAdmin
    .from('stores')
    .select('id, name')
    .order('name');
  if (error) return [];
  return (data || []).map((s: any) => ({ id: s.id, name: s.name }));
}

export async function listBanks(): Promise<{ id: string; name: string; storeId: string; }[]> {
  // Fetch from our Prisma API to reflect banks added via the app
  try {
    const token = typeof document !== 'undefined'
      ? (document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1] || '')
      : '';

    const res = await fetch('/api/banks', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Avoid caching stale lists when adding a bank
      cache: 'no-store',
    } as RequestInit);

    if (!res.ok) return [];
    const banks = await res.json();
    return (banks || []).map((b: any) => ({
      id: b.id,
      name: b.bankName || b.bank_name || 'Unnamed Bank',
      storeId: b.storeId || b.store_id || '',
    }));
  } catch {
    return [];
  }
}

export async function getNextCheckNumber(bankId: string): Promise<number> {
  const { data, error } = await typedSupabaseAdmin
    .from('checks')
    .select('check_number')
    .eq('bank_id', bankId)
    .order('check_number', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 1;
  }

  const maxNum = Number((data[0] as any).check_number) || 0;
  return maxNum + 1;
}

export async function createCheck(input: { paymentMethod: PaymentMethod; bankId: string; checkNumber?: string; vendorId: string; storeId: string; amount: number; memo?: string; invoiceUrl?: string }): Promise<{ ok: boolean; id?: string; checkNumber?: number; error?: string; }> {
  // Basic validation
  if (!input.bankId) {
    return { ok: false, error: 'bankId is required' };
  }
  if (!input.vendorId) {
    return { ok: false, error: 'vendorId is required' };
  }
  if (!input.storeId) {
    return { ok: false, error: 'storeId is required' };
  }
  if (!(input.amount > 0)) {
    return { ok: false, error: 'amount must be > 0' };
  }

  const pmDb = mapPaymentToDb(input.paymentMethod);

  // Auto-generate checkNumber if not provided
  let checkNumber: number;
  if (input.checkNumber) {
    checkNumber = parseInt(input.checkNumber, 10);
    if (isNaN(checkNumber) || checkNumber <= 0) {
      return { ok: false, error: 'checkNumber must be a positive integer' };
    }
  } else {
    checkNumber = await getNextCheckNumber(input.bankId);
  }

  const { data, error } = await (typedSupabaseAdmin
    .from('checks') as any)
    .insert({
      check_number: checkNumber,
      payment_method: pmDb,
      bank_id: input.bankId,
      vendor_id: input.vendorId,
      store_id: input.storeId,
      amount: input.amount,
      memo: input.memo || null,
      status: 'ISSUED',
      invoice_url: input.invoiceUrl || null,
    })
    .select('id, check_number')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id, checkNumber: data?.check_number };
}

export async function updateCheckInvoiceUrl(checkId: string, invoiceUrl: string): Promise<{ ok: boolean; error?: string; }> {
  const { error } = await (typedSupabaseAdmin
    .from('checks') as any)
    .update({ invoice_url: invoiceUrl })
    .eq('id', checkId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}


