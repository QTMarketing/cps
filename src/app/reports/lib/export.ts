"use client";

import type { ReportCheck } from "./types";

function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(rows: ReportCheck[]): string {
  const headers = [
    "Created Date",
    "Check Number",
    "Vendors",
    "Store",
    "Amount",
    "Memo",
    "User",
    "Invoice",
    "Status",
  ];

  const lines = [headers.join(",")];
  for (const r of rows) {
    const created = new Date(r.createdAt);
    const createdStr = isNaN(created.getTime()) ? r.createdAt : created.toISOString();
    const line = [
      createdStr,
      r.checkNumber,
      r.vendorName,
      r.storeName,
      r.amount,
      r.memo ?? "",
      r.userName,
      r.invoiceUrl ?? "",
      r.status,
    ]
      .map(escapeCsv)
      .join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

export async function downloadCSV(filename: string, rows: ReportCheck[]) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadXLSX(_filename: string, _rows: ReportCheck[]) {
  // For MVP, prefer CSV (widely supported). Implement XLSX later if needed.
  console.warn("downloadXLSX not implemented. Use downloadCSV instead.");
}


