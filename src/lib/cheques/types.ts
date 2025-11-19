export type PayeeType = "vendor" | "employee" | "unknown";

export interface ChequeViewModel {
  id: string;
  number: string;
  amount: number;
  amountWords: string;
  memo: string;
  createdAt: string;
  issuedBy: string;
  bank: {
    name: string;
    accountName?: string | null;
    dba?: string | null;
    addressLine1?: string | null;
    cityStateZip?: string | null;
    routingNumber: string;
    accountNumber: string;
    signatureUrl: string | null;
  };
  payee: {
    id: string | null;
    type: PayeeType;
    name: string;
  };
}

