/**
 * Lightweight i18n for Ko Wallet UI.
 *
 * Strategy: a flat dictionary with English keys → translations. Untranslated
 * strings simply fall back to the English key, so the app stays usable while
 * keys are gradually added.
 *
 * Usage:
 *   const t = await getServerT();
 *   t("Dashboard")  // "ပင်မစာမျက်နှာ" if user picked Burmese
 *
 * The user's UI language is stored in `user_settings.ui_language`.
 */
export type Lang = "en" | "my" | "th";

type Dict = Record<string, string>;

const my: Dict = {
  // Nav
  "Dashboard": "Dashboard",
  "Transactions": "ငွေပြောင်းရွေ့မှု",
  "Reports": "အစီရင်ခံစာ",
  "Settings": "Settings",
  "Notifications": "သတိပေးချက်များ",
  "Sign out": "ထွက်ရန်",
  // Common buttons
  "Add": "ထည့်",
  "Save": "သိမ်း",
  "Cancel": "ပယ်ဖျက်",
  "Delete": "ဖျက်",
  "Edit": "ပြင်",
  "Back": "နောက်သို့",
  "Export": "Export",
  "Import": "Import",
  "Split": "ခွဲဝေ",
  "Search": "ရှာ",
  // Settings labels
  "Wallet Settings": "Wallet Settings",
  "Family Workspace": "မိသားစု Workspace",
  "Categories": "အမျိုးအစားများ",
  "Budgets": "Budget များ",
  "Recurring Transactions": "ပုံမှန် ငွေပြောင်းရွေ့မှု",
  "Telegram Bot": "Telegram Bot",
  "Auto Digest": "Auto Digest",
  "Transfer Between Wallets": "Wallet ၂ ခုကြား ပြောင်း",
  "Saving Goals": "ငွေစုပန်းတိုင်များ",
  "Currency Rates": "ငွေလဲနှုန်းများ",
  "Bank Accounts": "ဘဏ်အကောင့်များ",
  "Investments": "ရင်းနှီးမြှုပ်နှံမှု",
  "Clients & Invoices": "Clients & Invoices",
  "Language": "ဘာသာစကား",
  // Headers
  "Net Worth": "စုစုပေါင်း ပိုက်ဆံ",
  "This Month": "ဒီလ",
  "This Week": "ဒီအပတ်",
  "Today": "ဒီနေ့",
  "Last Month": "ပြီးခဲ့သောလ",
  "This Year": "ဒီနှစ်",
  "All": "အကုန်",
  "Custom": "Custom",
  "Income": "ဝင်ငွေ",
  "Expense": "သုံးငွေ",
  "Recent Transactions": "မကြာသေးခင်က ငွေပြောင်းရွေ့မှု",
  "View all": "အကုန်ကြည့်",
  // Common
  "Loading…": "Loading…",
  "Connected": "ချိတ်ဆက်ပြီး",
  "Disconnect": "ဖြုတ်",
  "Connect": "ချိတ်",
};

const th: Dict = {
  "Dashboard": "หน้าหลัก",
  "Transactions": "รายการ",
  "Reports": "รายงาน",
  "Settings": "ตั้งค่า",
  "Notifications": "การแจ้งเตือน",
  "Sign out": "ออกจากระบบ",
  "Add": "เพิ่ม",
  "Save": "บันทึก",
  "Cancel": "ยกเลิก",
  "Delete": "ลบ",
  "Edit": "แก้ไข",
  "Back": "กลับ",
  "Export": "ส่งออก",
  "Import": "นำเข้า",
  "Split": "หาร",
  "Search": "ค้นหา",
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
  "Language": "ภาษา",
  "Net Worth": "มูลค่าสุทธิ",
  "This Month": "เดือนนี้",
  "This Week": "สัปดาห์นี้",
  "Today": "วันนี้",
  "Last Month": "เดือนที่แล้ว",
  "This Year": "ปีนี้",
  "All": "ทั้งหมด",
  "Custom": "กำหนดเอง",
  "Income": "รายได้",
  "Expense": "รายจ่าย",
  "Recent Transactions": "รายการล่าสุด",
  "View all": "ดูทั้งหมด",
  "Loading…": "กำลังโหลด…",
  "Connected": "เชื่อมต่อแล้ว",
  "Disconnect": "ยกเลิกการเชื่อมต่อ",
  "Connect": "เชื่อมต่อ",
};

const DICTS: Record<Lang, Dict> = {
  en: {},
  my,
  th,
};

export function translate(key: string, lang: Lang = "en"): string {
  return DICTS[lang]?.[key] ?? key;
}

export type T = (key: string) => string;

export function makeT(lang: Lang): T {
  return (key) => translate(key, lang);
}
