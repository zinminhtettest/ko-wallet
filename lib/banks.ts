// Thai bank email senders. Each entry lists the from-addresses that bank
// uses for transaction notifications. Add new banks here.

export interface BankDef {
  key: string;        // stable identifier
  label: string;      // friendly display name
  emoji: string;      // small icon for picker
  senders: string[];  // gmail from-addresses to filter
}

export const THAI_BANKS: BankDef[] = [
  {
    key: "KRUNGTHAI",
    label: "Krungthai (KTB)",
    emoji: "🏦",
    senders: [
      "noreply@krungthai.com",
      "ktbalert@ktb.co.th",
      "kma@ktbnetbank.com",
      "no-reply@ktb.co.th",
      "alert@ktb.co.th",
    ],
  },
  {
    key: "BANGKOK_BANK",
    label: "Bangkok Bank (BBL)",
    emoji: "🔵",
    senders: [
      "ibanking@bangkokbank.com",
      "ibankalert@bangkokbank.com",
      "alert@bangkokbank.com",
      "no-reply@bangkokbank.com",
    ],
  },
  {
    key: "KBANK",
    label: "Kasikorn Bank (KBank)",
    emoji: "🟢",
    senders: [
      "kbank-info@kasikornbank.com",
      "k-cyber@kbankgroup.com",
      "no-reply@kasikornbank.com",
      "k-plus@kasikornbank.com",
      "ebank.alert@kasikornbank.com",
    ],
  },
  {
    key: "SCB",
    label: "SCB",
    emoji: "🟣",
    senders: [
      "ealert@scb.co.th",
      "alert@scb.co.th",
      "ibank@scb.co.th",
      "noreply@scb.co.th",
      "no-reply@scb.co.th",
    ],
  },
  {
    key: "KRUNGSRI",
    label: "Krungsri (BAY)",
    emoji: "🟡",
    senders: [
      "krungsrionline@krungsri.com",
      "alert@krungsri.com",
      "noreply@krungsri.com",
    ],
  },
  {
    key: "TTB",
    label: "TMBThanachart (TTB)",
    emoji: "🟠",
    senders: [
      "noreply@ttbbank.com",
      "alert@ttbbank.com",
      "no-reply@ttbbank.com",
    ],
  },
  {
    key: "UOB",
    label: "UOB",
    emoji: "🔷",
    senders: [
      "uob.iconnect@uob.co.th",
      "ibankalert@uob.co.th",
      "no-reply@uob.co.th",
    ],
  },
  {
    key: "CIMB",
    label: "CIMB Thai",
    emoji: "🔴",
    senders: [
      "noreply@cimbthai.com",
      "alert@cimbthai.com",
    ],
  },
  {
    key: "GSB",
    label: "Government Savings Bank (GSB)",
    emoji: "🏛️",
    senders: [
      "notification@gsb.or.th",
      "alert@gsb.or.th",
      "noreply@gsb.or.th",
    ],
  },
  {
    key: "BAAC",
    label: "BAAC",
    emoji: "🌾",
    senders: ["noreply@baac.or.th", "alert@baac.or.th"],
  },
];

/** All senders flattened — used as fallback when a connection has no specific banks chosen. */
export function allDefaultSenders(): string[] {
  return THAI_BANKS.flatMap((b) => b.senders);
}

export function sendersForBankKeys(keys: string[]): string[] {
  return THAI_BANKS.filter((b) => keys.includes(b.key)).flatMap(
    (b) => b.senders
  );
}

export function labelForBankKey(key: string): string {
  return THAI_BANKS.find((b) => b.key === key)?.label ?? key;
}
