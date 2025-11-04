"use server";

import { typedSupabaseAdmin } from "@/lib/supabase";
import type { ReportCheck } from "./types";

type Status = 'PENDING' | 'CLEARED' | 'VOIDED';

function mapStatus(dbStatus: string | null | undefined): Status {
  switch (String(dbStatus || '').toUpperCase()) {
    case 'CLEARED':
      return 'CLEARED';
    case 'VOIDED':
      return 'VOIDED';
    case 'PENDING':
    case 'ISSUED':
    default:
      return 'PENDING';
  }
}

function toReportRow(r: any): ReportCheck {
  return {
    id: r.id,
    createdAt: r.created_at,
    checkNumber: Number(r.check_number) || 0,
    vendorName: r.vendors?.vendor_name || r.vendor?.name || r.vendor_name || 'Unknown Vendor',
    storeName: r.stores?.name || r.store?.name || 'Unknown Store',
    amount: Number(r.amount) || 0,
    memo: r.memo || undefined,
    userName: r.users?.username || r.user?.full_name || 'Unknown',
    invoiceUrl: r.invoice_url || undefined,
    status: mapStatus(r.status),
  };
}

export async function listReportChecks(params: {
  q?: string;
  status?: Status;
  vendorId?: string;
  storeId?: string;
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'checkNumber' | 'amount';
  sortDir?: 'asc' | 'desc';
}): Promise<{ rows: ReportCheck[]; total: number; }> {
  const {
    q,
    status,
    vendorId,
    storeId,
    dateFrom,
    dateTo,
    page = 0,
    pageSize = 20,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = params || {};

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
      vendors:vendor_id ( vendor_name ),
      stores:store_id ( name ),
      users:issued_by ( username )
    `, { count: 'exact' }) as any;

  if (status) {
    query = query.eq('status', status);
  }
  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }
  if (storeId) {
    query = query.eq('store_id', storeId);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }
  if (q && q.trim()) {
    const qTrim = q.trim();
    const isNum = /^\d+$/.test(qTrim);
    if (isNum) {
      query = query.or(`check_number.eq.${qTrim},memo.ilike.%${qTrim}%,vendors.vendor_name.ilike.%${qTrim}%,stores.name.ilike.%${qTrim}%,users.username.ilike.%${qTrim}%`);
    } else {
      query = query.or(`memo.ilike.%${qTrim}%,vendors.vendor_name.ilike.%${qTrim}%,stores.name.ilike.%${qTrim}%,users.username.ilike.%${qTrim}%`);
    }
  }

  // Sorting
  const sortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy === 'checkNumber' ? 'check_number' : 'amount';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  // Pagination
  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    return { rows: [], total: 0 };
  }
  const rows: ReportCheck[] = (data || []).map(toReportRow);
  return { rows, total: count || 0 };
}

export async function getCheckById(id: string): Promise<ReportCheck | null> {
  const { data, error } = await (typedSupabaseAdmin
    .from('checks')
    .select(`
      id,
      created_at,
      check_number,
      amount,
      memo,
      status,
      invoice_url,
      vendors:vendor_id ( vendor_name ),
      stores:store_id ( name ),
      users:issued_by ( username )
    `)
    .eq('id', id)
    .single() as any);

  if (error || !data) return null;
  return toReportRow(data);
}


