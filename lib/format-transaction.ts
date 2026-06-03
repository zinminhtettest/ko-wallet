/**
 * Display helpers for transaction rows.
 *
 * Bank-name shortening: "Transfer to own Bangkok Bank account" → "Transfer to own — BBL".
 * Detection is intentionally loose so it catches Krungthai email language plus the
 * common phrasings Thai banks use in their notifications.
 */

const BANK_SHORT: { match: RegExp; code: string }[] = [
  { match: /\b(bangkok\s*bank|bbl)\b/i, code: "BBL" },
  { match: /\b(krungthai|ktb)\b/i, code: "KTB" },
  { match: /\b(kasikorn|kbank|k[\s-]?bank|กสิกร)\b/i, code: "KBANK" },
  { match: /\b(siam\s*commercial|scb|ไทยพาณิชย์)\b/i, code: "SCB" },
  { match: /\b(krungsri|bay|กรุงศรี)\b/i, code: "BAY" },
  { match: /\b(tmb\s*thanachart|ttb|tmb)\b/i, code: "TTB" },
  { match: /\buob\b/i, code: "UOB" },
  { match: /\bcimb\b/i, code: "CIMB" },
  { match: /\b(government\s*savings|gsb)\b/i, code: "GSB" },
  { match: /\bbaac\b/i, code: "BAAC" },
  // Myanmar banks (in case wallets are MMK)
  { match: /\b(kbz|kanbawza)\b/i, code: "KBZ" },
  { match: /\baya\b/i, code: "AYA" },
  { match: /\b(cb\s*bank|cb)\b/i, code: "CB" },
  { match: /\byoma\b/i, code: "YOMA" },
  { match: /\buab\b/i, code: "UAB" },
];

/**
 * If the text looks like an own-account transfer, replace the verbose bank name
 * with a "Transfer to own — XXX" form. Otherwise return the text unchanged.
 */
export function shortenTransferLabel(text: string | null | undefined): string {
  if (!text) return "";
  // Only touch own-account transfers; leave normal merchant strings alone.
  const isOwnTransfer = /transfer\s+to\s+own/i.test(text) ||
    /own\s+account/i.test(text);
  if (!isOwnTransfer) return text;
  for (const { match, code } of BANK_SHORT) {
    if (match.test(text)) {
      return `Transfer to own — ${code}`;
    }
  }
  // Fallback: keep the original transfer wording.
  return text;
}

/** Extract the part of an email before the @. Returns null if invalid. */
export function emailUsername(email: string | null | undefined): string | null {
  if (!email) return null;
  const idx = email.indexOf("@");
  if (idx <= 0) return null;
  return email.slice(0, idx);
}
