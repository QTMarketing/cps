// Client-safe data helpers for Make Payment

import type { PaymentMethod } from "./types";

function getTokenFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1];
}

export async function listBanks(): Promise<{ id: string; name: string; storeId: string; }[]> {
  const token = getTokenFromCookie();
  let res = await fetch('/api/banks/my', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  } as RequestInit);

  if (res.status === 401 && token) {
    res = await fetch('/api/banks/my', {
      method: 'GET',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    } as RequestInit);
  }

  if (!res.ok) {
    console.warn('Failed to load banks for user:', res.status);
    return [];
  }

  const data = await res.json();
  const list = Array.isArray(data?.banks) ? data.banks : data;

  return (list || []).map((b: any) => ({
    id: String(b.id ?? b.bankId ?? ''),
    name: b.bankName || b.bank_name || 'Unnamed Bank',
    storeId: b.storeId || b.store_id || '',
  }));
}

export async function listVendors(): Promise<{ id: string; name: string; }[]> {
  let res = await fetch('/api/vendors', { method: 'GET', cache: 'no-store', credentials: 'include' } as RequestInit);
  if (res.status === 401) {
    const token = getTokenFromCookie();
    if (token) {
      res = await fetch('/api/vendors', { method: 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${token}` } } as RequestInit);
    }
  }
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data?.vendors) ? data.vendors : data;
  return (list || []).map((v: any) => ({ id: String(v.id ?? ''), name: v.vendorName || v.vendor_name }));
}

export async function listStores(): Promise<{ id: string; name: string; }[]> {
  let res = await fetch('/api/stores', { method: 'GET', cache: 'no-store', credentials: 'include' } as RequestInit);
  if (res.status === 401) {
    const token = getTokenFromCookie();
    if (token) {
      res = await fetch('/api/stores', { method: 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${token}` } } as RequestInit);
    }
  }
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data?.stores) ? data.stores : data;
  return (list || []).map((s: any) => ({ id: s.id, name: s.name }));
}

export async function getNextCheckNumber(bankId?: string): Promise<number> {
  const token = getTokenFromCookie();
  const url = bankId && bankId.length > 0
    ? `/api/banks/next-check-number?bankId=${encodeURIComponent(bankId)}`
    : `/api/checks/next-number`;
  let res = await fetch(url, { cache: 'no-store', credentials: 'include' } as RequestInit);
  if (res.status === 401 && token) {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } } as RequestInit);
  }
  if (!res.ok) return 1;
  const json = await res.json();
  return Number(json?.next || 1);
}

export async function createCheck(input: { paymentMethod: PaymentMethod; bankId: string; vendorId: string; storeId?: string; amount: number; memo?: string; payeeName?: string; }): Promise<{ ok: boolean; id?: string; checkNumber?: number; error?: string; }> {
  const token = getTokenFromCookie();
  const payload = {
    paymentMethod: input.paymentMethod === 'CHECK' ? 'Cheque' : input.paymentMethod === 'CASH' ? 'Cash' : input.paymentMethod,
    bankId: input.bankId,
    vendorId: input.vendorId,
    amount: input.amount,
    memo: input.memo,
    payeeName: input.payeeName,
  } as any;
  if (input.storeId) {
    payload.storeId = input.storeId;
  }
  const res = await fetch('/api/checks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  } as RequestInit);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: text || `HTTP ${res.status}` };
  }
  const json = await res.json();
  return {
    ok: true,
    id: json?.id,
    checkNumber: Number(json?.checkNumber || json?.referenceNumber || 0),
  };
}

export async function updateCheckInvoiceUrl(checkId: string, invoiceUrl: string): Promise<{ ok: boolean; error?: string; }> {
  const token = getTokenFromCookie();
  const res = await fetch(`/api/checks/${encodeURIComponent(checkId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ invoiceUrl }),
  } as RequestInit);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: text || `HTTP ${res.status}` };
  }
  return { ok: true };
}


