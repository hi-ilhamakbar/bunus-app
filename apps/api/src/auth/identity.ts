/** The platform launches in Indonesia first. Local numbers starting with 0 are read as +62. */
export const DEFAULT_COUNTRY_CODE = '62';

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Returns E.164 digits without '+', or null when the input cannot be a phone number.
 *   "0812-3456-7890"   -> "6281234567890"
 *   "+62 812 3456 7890" -> "6281234567890"
 *   "0062812..."        -> "62812..."
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }
  // "620812..." is a common slip: country code followed by the local leading zero.
  if (digits.startsWith(`${DEFAULT_COUNTRY_CODE}0`)) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(DEFAULT_COUNTRY_CODE.length + 1);
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

export function maskPhone(digits: string): string {
  const visibleTail = digits.slice(-3);
  const head = digits.slice(0, 2);
  return `+${head}${'•'.repeat(Math.max(digits.length - 5, 3))}${visibleTail}`;
}
