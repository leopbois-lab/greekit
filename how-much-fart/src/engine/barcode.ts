/** Clé de contrôle GTIN (EAN-8, UPC-A, EAN-13) : pondération 3-1 depuis la droite. */
export function hasValidCheckDigit(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length - 1; i++) {
    const fromRight = digits.length - 1 - i;
    sum += Number(digits[i]) * (fromRight % 2 === 1 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

/**
 * Nettoie un code lu ou saisi. Accepte EAN-13, EAN-8 et UPC-A (12 chiffres, complété en EAN-13).
 * Renvoie `null` si la longueur ou la clé de contrôle ne colle pas : on évite les faux scans.
 */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (![8, 12, 13].includes(digits.length)) return null;
  if (!hasValidCheckDigit(digits)) return null;
  return digits.length === 12 ? `0${digits}` : digits;
}
