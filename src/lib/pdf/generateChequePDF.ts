import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { ChequeViewModel } from "@/lib/cheques/types";
import path from "path";
import { promises as fs } from "fs";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const buildMicr = (cheque: ChequeViewModel) => {
  const normalize = (value: string, length: number) =>
    value.replace(/\D/g, "").padStart(length, "0");
  const number = normalize(cheque.number, 6);
  const routing = normalize(cheque.bank.routingNumber, 9);
  const account = normalize(cheque.bank.accountNumber, 9);
  return `⛓ ${number}     ${routing}     ${account}`;
};

let cachedMicrFontDataUrl: string | null = null;

async function getMicrFontDataUrl(): Promise<string> {
  if (cachedMicrFontDataUrl !== null) {
    return cachedMicrFontDataUrl;
  }
  try {
    const fontPath = path.join(process.cwd(), "public", "micr-encoding.regular.ttf");
    const bytes = await fs.readFile(fontPath);
    cachedMicrFontDataUrl = `data:font/ttf;base64,${bytes.toString("base64")}`;
  } catch (error) {
    console.warn("Unable to load MICR font, falling back to system font:", error);
    cachedMicrFontDataUrl = "";
  }
  return cachedMicrFontDataUrl;
}

const renderChequeHtml = (cheque: ChequeViewModel, micrFontDataUrl: string) => {
  const amount = currency.format(cheque.amount);
  const micr = buildMicr(cheque);
  const signature = cheque.bank.signatureUrl
    ? `<img src="${cheque.bank.signatureUrl}" alt="Signature" />`
    : "";
  const micrFontFace = micrFontDataUrl
    ? `@font-face { font-family: "MICR"; src: url('${micrFontDataUrl}') format("truetype"); font-weight: normal; font-style: normal; }`
    : "";

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        ${micrFontFace}
        @page {
          size: Letter;
          margin: 0.5in;
        }
        body {
          font-family: "Helvetica Neue", Arial, sans-serif;
          background: #f4f5f8;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
        }
        .cheque-wrapper {
          width: 840px;
          padding: 20px;
        }
        .cheque {
          background: #fff;
          border: 1px solid #d6d9e1;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .status {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 16px;
          border-radius: 999px;
          border: 1px solid #d6dae8;
          background: #f6f7fb;
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #475569;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
        }
        .bank-account-line {
          margin: 2px 0;
          font-size: 13px;
          color: #475569;
        }
        .bank-account-name,
        .bank-dba {
          font-weight: 700;
        }
        .bank-center h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        .meta {
          text-align: right;
          font-size: 13px;
          color: #475569;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        .payee-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: #94a3b8;
          font-weight: 700;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        .payee-name {
          font-size: 26px;
          font-weight: 600;
          color: #0f172a;
          margin: 6px 0;
        }
        .payee-rule {
          height: 1px;
          background: #d9dbe3;
        }
        .amount-box {
          border: 1px solid #cbd5f5;
          border-radius: 8px;
          padding: 12px 18px;
          font-size: 24px;
          font-weight: 700;
          min-width: 160px;
          text-align: right;
          color: #0f172a;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        .amount-words {
          font-size: 16px;
          font-weight: 500;
          color: #1f2937;
          border-bottom: 1px solid #d9dbe3;
          padding-bottom: 12px;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .memo {
          font-size: 13px;
          color: #475569;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        .memo span {
          display: inline-block;
          min-width: 200px;
          border-bottom: 1px solid #d9dbe3;
          margin-left: 8px;
        }
        .signature {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .signature img {
          max-height: 60px;
          object-fit: contain;
        }
        .signature-line {
          width: 240px;
          border-bottom: 1px solid #94a3b8;
        }
        .signature-label {
          font-size: 11px;
          letter-spacing: 0.3em;
          color: #94a3b8;
          text-transform: uppercase;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        .meta-bar {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #64748b;
        }
        .micr-text {
          font-family: "MICR", "Courier New", monospace;
          letter-spacing: 0.18em;
        }
        .micr {
          font-family: "MICR", "Courier New", monospace;
          font-size: 18px;
          letter-spacing: 0.2em;
          color: #111827;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="cheque-wrapper">
        <div class="cheque">
          <div class="status">ISSUED</div>
          <div class="row">
            <div class="bank-block">
              ${
                cheque.bank.accountName
                  ? `<p class="bank-account-line bank-account-name">${cheque.bank.accountName}</p>`
                  : ""
              }
              ${
                cheque.bank.dba
                  ? `<p class="bank-account-line bank-dba">${cheque.bank.dba}</p>`
                  : ""
              }
              ${
                cheque.bank.addressLine1
                  ? `<p class="bank-account-line">${cheque.bank.addressLine1}</p>`
                  : ""
              }
              ${
                cheque.bank.cityStateZip
                  ? `<p class="bank-account-line">${cheque.bank.cityStateZip}</p>`
                  : ""
              }
            </div>
            <div class="bank-center">
              <h3>${cheque.bank.name}</h3>
            </div>
            <div class="meta">
              <div>Cheque #${cheque.number || "N/A"}</div>
              <div>${new Date(cheque.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}</div>
            </div>
          </div>

          <div class="row">
            <div class="payee-line">
              <label class="payee-label">Pay to the Order of</label>
              <div class="payee-name">${cheque.payee.name}</div>
              <div class="payee-rule"></div>
            </div>
            <div class="amount-box">${amount}</div>
          </div>

          <div class="amount-words">${cheque.amountWords}</div>

          <div class="footer">
            <div class="memo">
              Memo:<span>${cheque.memo || "&nbsp;"}</span>
            </div>
            <div class="signature">
              ${signature}
              <div class="signature-line"></div>
              <label class="signature-label">Signature</label>
            </div>
          </div>

          <div class="meta-bar">
            <span>Issued by: ${cheque.issuedBy}</span>
            <span>Payee Type: ${cheque.payee.type}</span>
          </div>

          <div class="micr">${micr}</div>
        </div>
      </div>
    </body>
  </html>`;
};

export async function generateChequePDF(cheque: ChequeViewModel): Promise<Buffer> {
  const executablePath = await chromium.executablePath();
  const micrFont = await getMicrFontDataUrl();
  const html = renderChequeHtml(cheque, micrFont);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath || undefined,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
        right: "0.5in",
      },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

