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

function mapPayment(pm: any): 'Check' | 'EDI' | 'MO' | 'Cash' | undefined {
  const v = String(pm || '').toUpperCase();
  if (v === 'CHECK') return 'Check';
  if (v === 'EDI') return 'EDI';
  if (v === 'MO') return 'MO';
  if (v === 'CASH') return 'Cash';
  return undefined;
}

function toReportRow(r: any): ReportCheck {
  return {
    id: r.id,
    createdAt: r.createdAt || r.created_at,
    checkNumber: Number(r.checkNumber || r.check_number || r.referenceNumber || 0),
    vendorName: r.vendor?.vendorName || r.vendor?.vendor_name || 'Unknown Vendor',
    storeName: r.vendor?.store?.name || r.store?.name || 'Unknown Store',
    amount: Number(r.amount || 0),
    memo: r.memo || undefined,
    userName: r.issuedByUser?.username || 'Unknown',
    invoiceUrl: r.invoiceUrl || r.invoice_url || undefined,
    status: mapStatus(r.status),
    paymentMethod: mapPayment(r.paymentMethod || r.payment_method),
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
  // Fetch from Prisma API (Lightsail DB) instead of Supabase
  try {
    const {
      q,
      status,
      vendorId,
      storeId,
      dateFrom,
      dateTo,
      page = 0,
      pageSize = 20,
    } = params || {};

    const token = typeof document !== 'undefined'
      ? (document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1] || '')
      : '';

    let url = `/api/checks?page=${page}&limit=${pageSize}`;
    if (status) {
      const dbStatus = status === 'PENDING' ? 'ISSUED' : status;
      url += `&status=${encodeURIComponent(dbStatus)}`;
    }
    if (q && q.trim()) {
      url += `&search=${encodeURIComponent(q.trim())}`;
    }
    if (vendorId) {
      url += `&vendorId=${encodeURIComponent(vendorId)}`;
    }
    if (storeId) {
      url += `&storeId=${encodeURIComponent(storeId)}`;
    }
    // Note: dateFrom/dateTo and sortBy/sortDir not yet supported by API, but basic filtering works

    let res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
    } as RequestInit);

    if (res.status === 401 && token) {
      res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      } as RequestInit);
    }

    if (!res.ok) {
      console.error('Failed to fetch report checks:', res.status);
      return { rows: [], total: 0 };
    }

    const data = await res.json();
    const checks = Array.isArray(data) ? data : (data?.checks || []);
    const total = data?.total ?? checks.length;

    // Client-side filtering for date range (until API supports it)
    let filtered = checks;
    if (dateFrom || dateTo) {
      filtered = checks.filter((r: any) => {
        const created = new Date(r.createdAt || r.created_at);
        if (dateFrom && created < new Date(dateFrom)) return false;
        if (dateTo && created > new Date(dateTo)) return false;
        return true;
      });
    }

    // Client-side sorting (until API supports it)
    if (params.sortBy) {
      const sortColumn = params.sortBy === 'createdAt' ? 'createdAt' : params.sortBy === 'checkNumber' ? 'checkNumber' : 'amount';
      filtered.sort((a: any, b: any) => {
        const aVal = a[sortColumn] || 0;
        const bVal = b[sortColumn] || 0;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return params.sortDir === 'asc' ? cmp : -cmp;
      });
    }

    const rows: ReportCheck[] = filtered.map(toReportRow);
    return { rows, total };
  } catch (error) {
    console.error('Error fetching report checks:', error);
    return { rows: [], total: 0 };
  }
}

export async function getCheckById(id: string): Promise<ReportCheck | null> {
  try {
    const token = typeof document !== 'undefined'
      ? (document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1] || '')
      : '';

    let res = await fetch(`/api/checks/${encodeURIComponent(id)}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
    } as RequestInit);

    if (res.status === 401 && token) {
      res = await fetch(`/api/checks/${encodeURIComponent(id)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      } as RequestInit);
    }

    if (!res.ok) return null;
    const check = await res.json();
    return toReportRow(check);
  } catch {
    return null;
  }
}


