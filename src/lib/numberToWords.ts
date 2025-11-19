import { toWords } from "number-to-words";

/**
 * Converts a numeric amount into cheque-friendly words.
 * Example: 32.5 -> "Thirty two dollars and 50/100"
 */
export function formatAmountInWords(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const [wholePart, centsPart] = safeAmount.toFixed(2).split(".");
  const words = toWords(parseInt(wholePart, 10));
  const capitalized = words.replace(/^\w/, (char) => char.toUpperCase());
  const cents = parseInt(centsPart, 10);

  if (cents === 0) {
    return `${capitalized} dollars`;
  }

  return `${capitalized} dollars and ${centsPart}/100`;
}

