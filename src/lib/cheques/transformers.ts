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
  };
};

export function mapChequeRecord(record: ChequeRecord): ChequeViewModel {
  const amountValue = record.amount ? Number(record.amount) : 0;
  const amountWords = formatAmountInWords(amountValue);

  const vendor =
    record.Vendor != null
      ? {
          id: record.Vendor.id.toString(),
          type: record.Vendor.vendor_type === "EMPLOYEE" ? "employee" : "vendor",
          name: record.Vendor.vendor_name,
        }
      : null;

  const payee =
    vendor ??
    (record.payee_name
      ? {
          id: null,
          type: "unknown" as const,
          name: record.payee_name,
        }
      : {
          id: null,
          type: "unknown" as const,
          name: "Unknown Payee",
        });

  const fallbackSignature =
    record.Bank.BankSigner?.[0]?.Signer.Signature?.[0]?.url || null;

  return {
    id: record.id.toString(),
    number: record.check_number?.toString() || "",
    amount: amountValue,
    amountWords,
    memo: record.memo ?? "",
    createdAt: record.created_at.toISOString(),
    issuedBy: record.issued_by_username ?? "Unknown",
  bank: {
    name: record.Bank.bank_name,
    accountName: record.Bank.account_name,
    dba: record.Bank.dba,
    addressLine1: record.Bank.return_address,
    cityStateZip:
      record.Bank.return_city || record.Bank.return_state || record.Bank.return_zip
        ? `${record.Bank.return_city || ""}${
            record.Bank.return_state ? `, ${record.Bank.return_state}` : ""
          }${record.Bank.return_zip ? ` ${record.Bank.return_zip}` : ""}`.trim()
        : null,
    routingNumber: record.Bank.routing_number?.toString() || "",
    accountNumber: record.Bank.account_number?.toString() || "",
    signatureUrl: record.Bank.signature_url || fallbackSignature,
  },
    payee,
  };
}

