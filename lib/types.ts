export type Currency = "THB" | "MMK" | "USD";
export type TxKind = "expense" | "income";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  default_currency: Currency;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  icon: string;
  color: string;
  kind: TxKind;
  is_system: boolean;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  currency: Currency;
  kind: TxKind;
  note: string | null;
  merchant: string | null;
  occurred_at: string;
  source: "manual" | "krungthai_email";
  source_ref: string | null;
  raw_email: string | null;
  created_at: string;
  category?: Category;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
}

export interface GmailConnection {
  id: string;
  user_id: string;
  workspace_id: string;
  email: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}
