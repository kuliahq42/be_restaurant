/**
 * Shared POS / order domain helpers.
 *
 * The POS UI and the checkout API both import these so the tax rate and the
 * money math can never drift apart between what the cashier sees and what the
 * server stores.
 */

/** Indonesian PPN rate applied to every POS ticket. */
export const TAX_RATE = 0.11;

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Computes subtotal / tax / grand total from a subtotal amount.
 * Works in integer cents and rounds half-up, so it matches the exact
 * decimal arithmetic used server-side.
 */
export function computeTotals(subtotal: number): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotalCents = toCents(subtotal);
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  return {
    subtotal: subtotalCents / 100,
    tax: taxCents / 100,
    total: (subtotalCents + taxCents) / 100,
  };
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | string): string {
  return moneyFormatter.format(Number(value));
}

/** Invoice number format: INV-YYYYMMDD-NNNN */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

  return `INV-${date}-${suffix}`;
}
