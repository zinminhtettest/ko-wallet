/**
 * Ko Wallet i18n.
 *
 * Four UI languages:
 *   - "en"   — pure English
 *   - "my"   — pure Burmese (formal / business)
 *   - "th"   — pure Thai
 *   - "both" — natural Myanmar + English code-switch (the original Ko Wallet voice)
 *
 * Strategy: flat dictionary keyed on the canonical English string. Untranslated
 * strings fall back to the English key so the UI never breaks while coverage
 * is filled in. Defaults to `en` for new users.
 */
export type Lang = "en" | "my" | "th" | "both";

type Dict = Record<string, string>;

/** Pure Burmese (formal / business). */
const my: Dict = {
  // Nav / app shell
  "Dashboard": "ပင်မစာမျက်နှာ",
  "Transactions": "ငွေပြောင်းရွေ့မှု",
  "Reports": "အစီရင်ခံစာ",
  "Settings": "ဆက်တင်",
  "Notifications": "သတိပေးချက်များ",
  "Sign out": "ထွက်ရန်",

  // Common buttons
  "Add": "ထည့်ရန်",
  "Add Transaction": "ငွေပြောင်းရွေ့မှု ထည့်ရန်",
  "Save": "သိမ်းရန်",
  "Save changes": "ပြောင်းလဲချက် သိမ်းရန်",
  "Cancel": "ပယ်ဖျက်ရန်",
  "Delete": "ဖျက်ရန်",
  "Edit": "ပြင်ဆင်ရန်",
  "Back": "နောက်သို့",
  "Export": "ထုတ်ယူရန်",
  "Import": "သွင်းရန်",
  "Split": "ခွဲဝေရန်",
  "Search": "ရှာဖွေရန်",
  "View all": "အားလုံးကြည့်",
  "Apply filters": "စစ်ထုတ်ရန်",

  // Settings tiles
  "Language": "ဘာသာစကား",
  "Wallet Settings": "ပိုက်ဆံအိတ် ဆက်တင်",
  "Family Workspace": "မိသားစု အလုပ်ခွင်",
  "Categories": "အမျိုးအစားများ",
  "Budgets": "ဘတ်ဂျက်များ",
  "Recurring Transactions": "ပုံမှန် ငွေပြောင်းရွေ့မှု",
  "Telegram Bot": "Telegram Bot",
  "Auto Digest": "အလိုအလျောက် အကျဉ်းချုပ်",
  "Transfer Between Wallets": "ပိုက်ဆံအိတ်များကြား လွှဲရန်",
  "Saving Goals": "ငွေစုပန်းတိုင်များ",
  "Currency Rates": "ငွေလဲနှုန်းများ",
  "Bank Accounts": "ဘဏ်အကောင့်များ",
  "Investments": "ရင်းနှီးမြှုပ်နှံမှု",
  "Clients & Invoices": "Client နှင့် ပြေစာများ",
  "Krungthai Bank Auto-Import": "Krungthai Bank အလိုအလျောက် သွင်းခြင်း",
  "AI Insights": "AI သုံးသပ်ချက်များ",

  // Date filters
  "Today": "ဒီနေ့",
  "This Week": "ဒီအပတ်",
  "This Month": "ဒီလ",
  "Last Month": "ပြီးခဲ့သောလ",
  "This Year": "ဒီနှစ်",
  "All": "အားလုံး",
  "Custom": "စိတ်ကြိုက်",

  // Headers / metrics
  "Net Worth": "စုစုပေါင်း ပိုက်ဆံ",
  "Income": "ဝင်ငွေ",
  "Expense": "သုံးငွေ",
  "Recent Transactions": "မကြာသေးခင်က ငွေပြောင်းရွေ့မှု",
  "My Wallets": "ကျွန်ုပ်၏ ပိုက်ဆံအိတ်များ",
  "Default": "ပင်မ",
  "Active": "သုံးနေသော",
  "Default wallet": "ပင်မ ပိုက်ဆံအိတ်",
  "Set as default": "ပင်မ အဖြစ် သတ်မှတ်",
  "Set as my default": "ကျွန်ုပ်၏ ပင်မ အဖြစ် သတ်မှတ်",

  // Forms / fields
  "Wallet name": "ပိုက်ဆံအိတ် အမည်",
  "Default currency": "ပင်မ ငွေကြေး",
  "Members": "အဖွဲ့ဝင်များ",
  "Invite a family member": "မိသားစုဝင် ဖိတ်ရန်",
  "Pending Invites": "ဆိုင်းငံ့ ဖိတ်စာများ",
  "Joined": "ပါဝင်ခဲ့သည်",
  "Cancel invite": "ဖိတ်စာ ပယ်ဖျက်",

  // Wallet picker
  "Create new wallet": "ပိုက်ဆံအိတ်အသစ် ဖန်တီး",
  "New wallet": "ပိုက်ဆံအိတ်အသစ်",
  "Switch Wallet": "ပိုက်ဆံအိတ် ပြောင်း",
  "Danger zone": "အန္တရာယ်ရှိ နယ်",

  // Status
  "Loading…": "တင်နေသည်…",
  "Saving...": "သိမ်းနေသည်…",
  "Connected": "ချိတ်ဆက်ပြီး",
  "Disconnect": "ဆက်သွယ်မှု ဖြုတ်",
  "Connect": "ချိတ်ဆက်",
};

/** Pure Thai. */
const th: Dict = {
  // Nav
  "Dashboard": "หน้าหลัก",
  "Transactions": "รายการ",
  "Reports": "รายงาน",
  "Settings": "ตั้งค่า",
  "Notifications": "การแจ้งเตือน",
  "Sign out": "ออกจากระบบ",

  // Buttons
  "Add": "เพิ่ม",
  "Add Transaction": "เพิ่มรายการ",
  "Save": "บันทึก",
  "Save changes": "บันทึกการเปลี่ยนแปลง",
  "Cancel": "ยกเลิก",
  "Delete": "ลบ",
  "Edit": "แก้ไข",
  "Back": "กลับ",
  "Export": "ส่งออก",
  "Import": "นำเข้า",
  "Split": "หาร",
  "Search": "ค้นหา",
  "View all": "ดูทั้งหมด",
  "Apply filters": "ปรับใช้ตัวกรอง",

  // Settings tiles
  "Language": "ภาษา",
  "Wallet Settings": "ตั้งค่ากระเป๋า",
  "Family Workspace": "พื้นที่ครอบครัว",
  "Categories": "หมวดหมู่",
  "Budgets": "งบประมาณ",
  "Recurring Transactions": "รายการประจำ",
  "Telegram Bot": "Telegram Bot",
  "Auto Digest": "สรุปอัตโนมัติ",
  "Transfer Between Wallets": "โอนระหว่างกระเป๋า",
  "Saving Goals": "เป้าหมายการออม",
  "Currency Rates": "อัตราแลกเปลี่ยน",
  "Bank Accounts": "บัญชีธนาคาร",
  "Investments": "การลงทุน",
  "Clients & Invoices": "ลูกค้าและใบแจ้งหนี้",
  "Krungthai Bank Auto-Import": "นำเข้าอัตโนมัติ Krungthai",
  "AI Insights": "ข้อมูลเชิงลึก AI",

  // Date filters
  "Today": "วันนี้",
  "This Week": "สัปดาห์นี้",
  "This Month": "เดือนนี้",
  "Last Month": "เดือนที่แล้ว",
  "This Year": "ปีนี้",
  "All": "ทั้งหมด",
  "Custom": "กำหนดเอง",

  // Headers / metrics
  "Net Worth": "มูลค่าสุทธิ",
  "Income": "รายได้",
  "Expense": "รายจ่าย",
  "Recent Transactions": "รายการล่าสุด",
  "My Wallets": "กระเป๋าของฉัน",
  "Default": "ค่าเริ่มต้น",
  "Active": "กำลังใช้",
  "Default wallet": "กระเป๋าเริ่มต้น",
  "Set as default": "ตั้งเป็นค่าเริ่มต้น",
  "Set as my default": "ตั้งเป็นค่าเริ่มต้นของฉัน",

  // Forms
  "Wallet name": "ชื่อกระเป๋า",
  "Default currency": "สกุลเงินเริ่มต้น",
  "Members": "สมาชิก",
  "Invite a family member": "เชิญสมาชิกในครอบครัว",
  "Pending Invites": "คำเชิญที่รอ",
  "Joined": "เข้าร่วม",
  "Cancel invite": "ยกเลิกคำเชิญ",

  // Wallet picker
  "Create new wallet": "สร้างกระเป๋าใหม่",
  "New wallet": "กระเป๋าใหม่",
  "Switch Wallet": "สลับกระเป๋า",
  "Danger zone": "โซนอันตราย",

  // Status
  "Loading…": "กำลังโหลด…",
  "Saving...": "กำลังบันทึก…",
  "Connected": "เชื่อมต่อแล้ว",
  "Disconnect": "ยกเลิกการเชื่อมต่อ",
  "Connect": "เชื่อมต่อ",
};

/** Both — natural Burmese + English code-switch, Ko Wallet's original voice. */
const both: Dict = {
  // Nav
  "Dashboard": "Dashboard",
  "Transactions": "ငွေပြောင်းရွေ့မှု",
  "Reports": "Reports",
  "Settings": "Settings",
  "Notifications": "သတိပေးချက်များ",
  "Sign out": "ထွက်ရန်",

  // Buttons
  "Add": "ထည့်",
  "Add Transaction": "+ Add Transaction",
  "Save": "သိမ်း",
  "Save changes": "ပြောင်းလဲချက် Save",
  "Cancel": "ပယ်ဖျက်",
  "Delete": "ဖျက်",
  "Edit": "ပြင်",
  "Back": "နောက်သို့",
  "Export": "Export",
  "Import": "Import",
  "Split": "ခွဲဝေ",
  "Search": "ရှာ",
  "View all": "အကုန်ကြည့်",
  "Apply filters": "Apply filters",

  // Settings tiles
  "Language": "ဘာသာစကား",
  "Wallet Settings": "Wallet Settings",
  "Family Workspace": "မိသားစု Workspace",
  "Categories": "Categories",
  "Budgets": "Budget များ",
  "Recurring Transactions": "Recurring Transactions",
  "Telegram Bot": "Telegram Bot",
  "Auto Digest": "Auto Digest",
  "Transfer Between Wallets": "Wallet ၂ ခုကြား ပြောင်း",
  "Saving Goals": "Saving Goals",
  "Currency Rates": "Currency Rates",
  "Bank Accounts": "Bank Accounts",
  "Investments": "Investments",
  "Clients & Invoices": "Clients & Invoices",
  "Krungthai Bank Auto-Import": "Krungthai Bank Auto-Import",
  "AI Insights": "AI Insights",

  // Date filters
  "Today": "Today",
  "This Week": "This Week",
  "This Month": "This Month",
  "Last Month": "Last Month",
  "This Year": "This Year",
  "All": "All",
  "Custom": "Custom",

  // Headers / metrics
  "Net Worth": "Net Worth",
  "Income": "Income",
  "Expense": "Expense",
  "Recent Transactions": "Recent Transactions",
  "My Wallets": "My Wallets",
  "Default": "Default",
  "Active": "Active",
  "Default wallet": "Default wallet",
  "Set as default": "Set as default",
  "Set as my default": "Set as my default",

  // Forms
  "Wallet name": "Wallet name",
  "Default currency": "Default currency",
  "Members": "Members",
  "Invite a family member": "Invite a family member",
  "Pending Invites": "Pending Invites",
  "Joined": "Joined",
  "Cancel invite": "Cancel invite",

  // Wallet picker
  "Create new wallet": "Create new wallet",
  "New wallet": "New wallet",
  "Switch Wallet": "Switch Wallet",
  "Danger zone": "Danger zone",

  // Status
  "Loading…": "Loading…",
  "Saving...": "Saving...",
  "Connected": "Connected",
  "Disconnect": "Disconnect",
  "Connect": "Connect",
};

const DICTS: Record<Lang, Dict> = {
  en: {},
  my,
  th,
  both,
};

export function translate(key: string, lang: Lang = "en"): string {
  return DICTS[lang]?.[key] ?? key;
}

export type T = (key: string) => string;

export function makeT(lang: Lang): T {
  return (key) => translate(key, lang);
}

export const ALL_LANGS: { code: Lang; label: string; sub: string; flag: string }[] = [
  { code: "both", label: "Both", sub: "Myanmar + English", flag: "🇲🇲🇬🇧" },
  { code: "en", label: "English", sub: "Pure English", flag: "🇬🇧" },
  { code: "my", label: "မြန်မာ", sub: "မြန်မာ ရုံးသုံး", flag: "🇲🇲" },
  { code: "th", label: "ไทย", sub: "ภาษาไทย", flag: "🇹🇭" },
];
