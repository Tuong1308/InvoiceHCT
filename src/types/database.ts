export type PaymentMethod = 'cash' | 'transfer';
export type BillStatus = 'paid' | 'void';
export type CashEntryType = 'in' | 'out';
export type CashEntryStatus = 'active' | 'void';

export interface Category {
  id: string;
  name: string;
  sort: number;
  active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  price: number; // Integer in VND
  sort: number;
  active: boolean;
}

export interface Bill {
  id: string; // UUID from client
  code: string; // e.g. 141126-005
  created_at: string;
  business_date: string; // YYYY-MM-DD
  total: number;
  payment_method: PaymentMethod;
  cash_received: number | null;
  change_amount: number | null;
  status: BillStatus;
  void_reason?: string | null;
  voided_at?: string | null;
}

export interface BillItem {
  id: string;
  bill_id: string;
  product_id?: string | null;
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
  line_total: number;
}

export interface BillWithItems extends Bill {
  items: BillItem[];
}

export interface CashEntry {
  id: string;
  created_at: string;
  business_date: string;
  type: CashEntryType;
  amount: number;
  note: string;
  status: CashEntryStatus;
  void_reason?: string | null;
}

export interface DayNote {
  business_date: string;
  counted_cash: number | null;
  note: string | null;
  updated_at: string;
}

export interface ShopSettings {
  id: number;
  shop_name: string;
  address: string;
  phone: string;
  bank_bin: string;
  bank_name: string;
  account_no: string;
  account_name: string;
  footer_text: string;
  bill_paper_size: '80mm' | 'A5' | 'A4';
}

export interface CreateBillItemInput {
  product_id: string;
  qty: number;
}

export interface CreateBillPayload {
  id: string;
  payment_method: PaymentMethod;
  cash_received?: number | null;
  items: CreateBillItemInput[];
}

