export function formatEuro(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`Cannot format amount: ${amount}`);
  }

  const cents = Math.round(amount * 100);
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  const grouped = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${grouped}.${rest} €`;
}

export function formatCents(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError(`Cannot format cents: ${cents}`);
  }
  return formatEuro(cents / 100);
}
