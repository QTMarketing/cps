import { formatAmountInWords } from "@/lib/numberToWords";
import { ChequeViewModel } from "./types";

export const chequeSelect = {
  id: true,
  check_number: true,
  amount: true,
  memo: true,
  created_at: true,
  issued_by_username: true,
  payee_name: true,
  Vendor: {
    select: {
      id: true,
      vendor_name: true,
      vendor_type: true,
    },
  },
  Bank: {
    select: {
      bank_name: true,
      dba: true,
      account_name: true,
      return_address: true,
      return_city: true,
      return_state: true,
      return_zip: true,
      routing_number: true,
      account_number: true,
      signature_url: true,
      Corporation: {
        select: {
          id: true,
          name: true,
          owner: true,
          ein: true,
        },
      },
      BankSigner: {
        where: { is_default: true },
        select: {
          Signer: {
            select: {
              Signature: {
                where: { is_active: true },
                orderBy: { uploaded_at: "desc" },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

type BankSignatureRecord = {
  Signer: {
    Signature: Array<{
      url: string | null;
    }>;
  };
};

type ChequeRecord = {
  id: number;
  check_number: bigint | number | null;
  amount: any;
  memo: string | null;
  created_at: Date;
  issued_by_username: string | null;
  payee_name: string | null;
  store_name?: string | null;
  Vendor: {
    id: number;
    vendor_name: string;
    vendor_type: string;
  } | null;
  Bank: {
    bank_name: string;
    routing_number: bigint | number | null;
    account_number: bigint | number | null;
    signature_url: string | null;
    BankSigner: BankSignatureRecord[] | null;
    account_name?: string | null;
    dba?: string | null;
    return_address?: string | null;
    return_city?: string | null;
    return_state?: string | null;
    return_zip?: string | number | null;
    Corporation?: {
      id: number;
      name: string;
      owner: string | null;
      ein: string | null;
    } | null;
  };
};

// Helper function to extract store number from DBA (e.g., "QT 120" -> "120")
function getStoreNumberFromDBA(dba: string | null | undefined): string | null {
  if (!dba) return null;
  const match = dba.match(/\d+/);
  return match ? match[0] : null;
}

// Helper function to format check number with store prefix
function formatCheckNumber(checkNumber: bigint | number | null, dba: string | null | undefined): string {
  if (!checkNumber) return "";
  
  const checkNumStr = checkNumber.toString();
  const storeNum = getStoreNumberFromDBA(dba);
  
  // If check number already starts with store number, return as is
  if (storeNum && checkNumStr.startsWith(storeNum)) {
    return checkNumStr;
  }
  
  // Otherwise, format as store number + check number
  // If check number is like 12000001, it's already formatted
  // If it's just a number like 15, we need to format it
  if (storeNum) {
    // Check if it's a simple sequential number (less than 1000)
    // If so, format as storeNumber + 5-digit padded number
    const num = Number(checkNumber);
    if (num < 1000) {
      return `${storeNum}${String(num).padStart(5, '0')}`;
    }
    // Otherwise, it might already be formatted
    return checkNumStr;
  }
  
  return checkNumStr;
}

export function mapChequeRecord(record: ChequeRecord): ChequeViewModel {
  const amountValue = record.amount ? Number(record.amount) : 0;
  const amountWords = formatAmountInWords(amountValue);

  const vendorPayee: ChequeViewModel["payee"] | null =
    record.Vendor != null
      ? {
          id: record.Vendor.id.toString(),
          type: record.Vendor.vendor_type === "EMPLOYEE" ? "employee" : "vendor",
          name: record.Vendor.vendor_name,
        }
      : null;

  const payee: ChequeViewModel["payee"] =
    vendorPayee ??
    (record.payee_name
      ? {
          id: null,
          type: "unknown",
          name: record.payee_name,
        }
      : {
          id: null,
          type: "unknown",
          name: "Unknown Payee",
        });

  const bankRecord = record.Bank as any;
  
  // Get signature URL - prefer bank signature_url, then fallback to signer signature
  let signatureUrl = bankRecord.signature_url || null;
  if (!signatureUrl) {
    signatureUrl = bankRecord.BankSigner?.[0]?.Signer?.Signature?.[0]?.url || null;
  }
  
  // Normalize signature URL to ensure it's accessible
  if (signatureUrl) {
    // If it's already a full URL, check if it needs API route conversion for .tif files
    if (signatureUrl.startsWith('http://') || signatureUrl.startsWith('https://')) {
      // For .tif files, convert to API route
      if (signatureUrl.includes('/uploads/signatures/') && (signatureUrl.endsWith('.tif') || signatureUrl.endsWith('.tiff'))) {
        const fileName = signatureUrl.split('/uploads/signatures/')[1];
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        signatureUrl = `${baseUrl}/api/uploads/signatures/${fileName}`;
      }
    }
    // If it starts with /, convert .tif files to API route
    else if (signatureUrl.startsWith('/')) {
      if (signatureUrl.includes('/uploads/signatures/') && (signatureUrl.endsWith('.tif') || signatureUrl.endsWith('.tiff'))) {
        const fileName = signatureUrl.replace('/uploads/signatures/', '');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        signatureUrl = `${baseUrl}/api/uploads/signatures/${fileName}`;
      }
    }
    // If it contains "uploads" or "signatures", ensure it starts with / and convert .tif files
    else if (signatureUrl.includes('uploads') || signatureUrl.includes('signatures')) {
      if (!signatureUrl.startsWith('/')) {
        signatureUrl = `/${signatureUrl}`;
      }
      // Convert .tif files to API route
      if (signatureUrl.includes('/uploads/signatures/') && (signatureUrl.endsWith('.tif') || signatureUrl.endsWith('.tiff'))) {
        const fileName = signatureUrl.replace('/uploads/signatures/', '');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        signatureUrl = `${baseUrl}/api/uploads/signatures/${fileName}`;
      }
    }
    // If it's just a filename (has extension but no path), assume it's in /uploads/signatures/
    else if (signatureUrl.includes('.') && !signatureUrl.includes('/')) {
      // Convert .tif files to API route
      if (signatureUrl.endsWith('.tif') || signatureUrl.endsWith('.tiff')) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        signatureUrl = `${baseUrl}/api/uploads/signatures/${signatureUrl}`;
      } else {
        signatureUrl = `/uploads/signatures/${signatureUrl}`;
      }
    }
    // Otherwise, prepend /uploads/signatures/ and convert .tif files
    else if (!signatureUrl.startsWith('/')) {
      if (signatureUrl.endsWith('.tif') || signatureUrl.endsWith('.tiff')) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        signatureUrl = `${baseUrl}/api/uploads/signatures/${signatureUrl}`;
      } else {
        signatureUrl = `/uploads/signatures/${signatureUrl}`;
      }
    }
  }

  // Format check number with store prefix
  const formattedCheckNumber = formatCheckNumber(record.check_number, bankRecord.dba);
  
  // Get store name from DBA if not provided
  const storeName = record.store_name || (bankRecord.dba ? bankRecord.dba : null);

  return {
    id: record.id.toString(),
    number: formattedCheckNumber,
    amount: amountValue,
    amountWords,
    memo: record.memo ?? "",
    createdAt: record.created_at.toISOString(),
    issuedBy: record.issued_by_username ?? "Unknown",
    storeName: storeName,
    bank: {
      name: bankRecord.bank_name,
      accountName: bankRecord.account_name ?? null,
      dba: bankRecord.dba ?? null,
      addressLine1: bankRecord.return_address ?? null,
      cityStateZip:
        bankRecord.return_city ||
        bankRecord.return_state ||
        bankRecord.return_zip
          ? `${bankRecord.return_city || ""}${
              bankRecord.return_state ? `, ${bankRecord.return_state}` : ""
            }${bankRecord.return_zip ? ` ${bankRecord.return_zip}` : ""}`.trim()
          : null,
      routingNumber: bankRecord.routing_number?.toString() || "",
      accountNumber: bankRecord.account_number?.toString() || "",
      signatureUrl: signatureUrl,
      corporation: bankRecord.Corporation
        ? {
            name: bankRecord.Corporation.name,
            owner: bankRecord.Corporation.owner,
            ein: bankRecord.Corporation.ein,
          }
        : null,
    },
    payee,
  };
}

