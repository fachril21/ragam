const rupiahNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Formats whole-rupiah amounts, e.g. 1250000 -> "Rp1.250.000". */
export function formatRupiah(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`Rupiah amount must be an integer, got ${amount}`);
  }
  if (amount < 0) {
    throw new RangeError(`Rupiah amount must not be negative, got ${amount}`);
  }
  return `Rp${rupiahNumber.format(amount)}`;
}
