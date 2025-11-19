import { cn } from "@/lib/utils";
import { ChequeViewModel } from "@/lib/cheques/types";

interface Props {
  cheque: ChequeViewModel;
  className?: string;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatDate = (input: string) =>
  new Date(input).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const normalizeDigits = (value: string, length: number) =>
  value.replace(/\D/g, "").padStart(length, "0");

export const buildMicrFromCheque = (cheque: ChequeViewModel) => {
  const number = normalizeDigits(cheque.number, 6);
  const routing = normalizeDigits(cheque.bank.routingNumber, 9);
  const account = normalizeDigits(cheque.bank.accountNumber, 9);
  return `⛓ ${number}     ${routing}     ${account}`;
};

export function ChequeLayout({ cheque, className }: Props) {
  return (
    <div className={cn("cheque-container", className)}>
      <span className="cheque-status">ISSUED</span>

      <div className="cheque-section items-start">
        <div className="bank-block space-y-1">
          {cheque.bank.accountName && (
            <p className="bank-account-line bank-account-name">{cheque.bank.accountName}</p>
          )}
          {cheque.bank.dba && <p className="bank-account-line bank-dba">{cheque.bank.dba}</p>}
          {cheque.bank.addressLine1 && (
            <p className="bank-account-line">{cheque.bank.addressLine1}</p>
          )}
          {cheque.bank.cityStateZip && (
            <p className="bank-account-line">{cheque.bank.cityStateZip}</p>
          )}
        </div>
        <div className="flex-1 text-center">
          <h3 className="bank-center-name">{cheque.bank.name}</h3>
        </div>
        <div className="cheque-meta text-right">
          <div>Cheque #{cheque.number || "N/A"}</div>
          <div>{formatDate(cheque.createdAt)}</div>
        </div>
      </div>

      <div className="cheque-section">
        <div className="payee-line">
          <label className="payee-label">Pay to the Order of</label>
          <div className="payee-name">{cheque.payee.name}</div>
          <div className="payee-rule" />
        </div>
        <div className="amount-box">{currency.format(cheque.amount)}</div>
      </div>

      <div className="amount-words">{cheque.amountWords}</div>

      <div className="cheque-footer">
        <div className="cheque-memo">
          Memo:
          <span>{cheque.memo || "\u00A0"}</span>
        </div>
        <div className="signature-container">
          {cheque.bank.signatureUrl && (
            <img src={cheque.bank.signatureUrl} alt="Authorized signature" />
          )}
          <div className="signature-line" />
          <div className="signature-label">Signature</div>
        </div>
      </div>

      <div className="micr-line">{buildMicrFromCheque(cheque)}</div>
    </div>
  );
}

