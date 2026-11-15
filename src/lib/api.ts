import { supabase, isSupabaseConfigured } from './supabase';
import {
  Category,
  Product,
  Bill,
  BillItem,
  BillWithItems,
  CashEntry,
  DayNote,
  ShopSettings,
  CreateBillPayload,
} from '../types/database';
import { getVietnamBusinessDate, getVietnamBillPrefix } from './date';

// Initial Mock Seed Data
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1111111-1111-1111-1111-111111111111', name: 'Cà phê', sort: 1, active: true },
  { id: 'c2222222-2222-2222-2222-222222222222', name: 'Matcha', sort: 2, active: true },
  { id: 'c3333333-3333-3333-3333-333333333333', name: 'Tea', sort: 3, active: true },
  { id: 'c4444444-4444-4444-4444-444444444444', name: 'Soda', sort: 4, active: true },
  { id: 'c5555555-5555-5555-5555-555555555555', name: 'Cake', sort: 5, active: true },
];

const DEFAULT_PRODUCTS: Product[] = [
  // Cà phê
  { id: 'a0111111-0000-0000-0000-000000000001', category_id: 'c1111111-1111-1111-1111-111111111111', name: 'Cà phê đen', price: 20000, sort: 1, active: true },
  { id: 'a0111111-0000-0000-0000-000000000002', category_id: 'c1111111-1111-1111-1111-111111111111', name: 'Cà phê sữa', price: 25000, sort: 2, active: true },
  { id: 'a0111111-0000-0000-0000-000000000003', category_id: 'c1111111-1111-1111-1111-111111111111', name: 'Cà phê muối', price: 30000, sort: 3, active: true },
  { id: 'a0111111-0000-0000-0000-000000000004', category_id: 'c1111111-1111-1111-1111-111111111111', name: 'Bạc xỉu', price: 28000, sort: 4, active: true },
  { id: 'a0111111-0000-0000-0000-000000000005', category_id: 'c1111111-1111-1111-1111-111111111111', name: 'Americano', price: 32000, sort: 5, active: true },
  { id: 'a0111111-0000-0000-0000-000000000006', category_id: 'c1111111-1111-1111-1111-111111111111', name: 'Latte', price: 38000, sort: 6, active: true },

  // Matcha
  { id: 'a0222222-0000-0000-0000-000000000001', category_id: 'c2222222-2222-2222-2222-222222222222', name: 'Matcha Latte', price: 38000, sort: 1, active: true },
  { id: 'a0222222-0000-0000-0000-000000000002', category_id: 'c2222222-2222-2222-2222-222222222222', name: 'Matcha đá xay', price: 45000, sort: 2, active: true },
  { id: 'a0222222-0000-0000-0000-000000000003', category_id: 'c2222222-2222-2222-2222-222222222222', name: 'Matcha Macchiato', price: 40000, sort: 3, active: true },

  // Tea
  { id: 'a0333333-0000-0000-0000-000000000001', category_id: 'c3333333-3333-3333-3333-333333333333', name: 'Trà đào cam sả', price: 35000, sort: 1, active: true },
  { id: 'a0333333-0000-0000-0000-000000000002', category_id: 'c3333333-3333-3333-3333-333333333333', name: 'Trà vải lài', price: 35000, sort: 2, active: true },
  { id: 'a0333333-0000-0000-0000-000000000003', category_id: 'c3333333-3333-3333-3333-333333333333', name: 'Trà sen vàng', price: 38000, sort: 3, active: true },
  { id: 'a0333333-0000-0000-0000-000000000004', category_id: 'c3333333-3333-3333-3333-333333333333', name: 'Hồng trà sữa trân châu', price: 35000, sort: 4, active: true },

  // Soda
  { id: 'a0444444-0000-0000-0000-000000000001', category_id: 'c4444444-4444-4444-4444-444444444444', name: 'Soda việt quất', price: 30000, sort: 1, active: true },
  { id: 'a0444444-0000-0000-0000-000000000002', category_id: 'c4444444-4444-4444-4444-444444444444', name: 'Soda chanh bạc hà', price: 28000, sort: 2, active: true },
  { id: 'a0444444-0000-0000-0000-000000000003', category_id: 'c4444444-4444-4444-4444-444444444444', name: 'Soda dâu tây', price: 30000, sort: 3, active: true },

  // Cake
  { id: 'a0555555-0000-0000-0000-000000000001', category_id: 'c5555555-5555-5555-5555-555555555555', name: 'Bánh Tiramisu', price: 35000, sort: 1, active: true },
  { id: 'a0555555-0000-0000-0000-000000000002', category_id: 'c5555555-5555-5555-5555-555555555555', name: 'Croissant bơ Pháp', price: 25000, sort: 2, active: true },
  { id: 'a0555555-0000-0000-0000-000000000003', category_id: 'c5555555-5555-5555-5555-555555555555', name: 'Bánh mousse chanh dây', price: 32000, sort: 3, active: true },
  { id: 'a0555555-0000-0000-0000-000000000004', category_id: 'c5555555-5555-5555-5555-555555555555', name: 'Bánh bông lan trứng muối', price: 30000, sort: 4, active: true },
];

const DEFAULT_SETTINGS: ShopSettings = {
  id: 1,
  shop_name: 'TIỆM NƯỚC & BÁNH HCT',
  address: '123 Đường Số 8, P. Linh Trung, TP. Thủ Đức',
  phone: '0909 123 456',
  bank_bin: '970436',
  bank_name: 'Vietcombank',
  account_no: '0123456789',
  account_name: 'NGUYEN VAN A',
  footer_text: 'Cảm ơn và hẹn gặp lại quý khách!',
  bill_paper_size: '80mm',
};

// Storage keys
const STORAGE_KEYS = {
  CATEGORIES: 'pos_categories',
  PRODUCTS: 'pos_products',
  BILLS: 'pos_bills',
  BILL_ITEMS: 'pos_bill_items',
  CASH_ENTRIES: 'pos_cash_entries',
  DAY_NOTES: 'pos_day_notes',
  SETTINGS: 'pos_shop_settings',
  COUNTERS: 'pos_bill_counters',
};

// Realtime cross-tab channel
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('pos_sync_channel') : null;

function notifyRealtime() {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'CHANGE', timestamp: Date.now() });
  }
}

// Local mock storage helpers
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyRealtime();
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

// API Implementation
export const api = {
  // 1. Categories
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },

  async saveCategory(category: Partial<Category>): Promise<Category> {
    if (isSupabaseConfigured && supabase) {
      if (category.id) {
        const { data, error } = await supabase
          .from('categories')
          .update(category)
          .eq('id', category.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert(category)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    const categories = getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    if (category.id) {
      const index = categories.findIndex((c) => c.id === category.id);
      if (index >= 0) {
        categories[index] = { ...categories[index], ...category } as Category;
        saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
        return categories[index];
      }
    }
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: category.name || 'Mục mới',
      sort: category.sort ?? categories.length + 1,
      active: category.active ?? true,
    };
    categories.push(newCat);
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    return newCat;
  },

  // 2. Products
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured && supabase) {
      if (product.id) {
        const { data, error } = await supabase
          .from('products')
          .update(product)
          .eq('id', product.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(product)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    const products = getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    if (product.id) {
      const index = products.findIndex((p) => p.id === product.id);
      if (index >= 0) {
        products[index] = { ...products[index], ...product } as Product;
        saveToStorage(STORAGE_KEYS.PRODUCTS, products);
        return products[index];
      }
    }
    const newProd: Product = {
      id: crypto.randomUUID(),
      category_id: product.category_id || '',
      name: product.name || 'Món mới',
      price: product.price ?? 0,
      sort: product.sort ?? products.length + 1,
      active: product.active ?? true,
    };
    products.push(newProd);
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    return newProd;
  },

  // 3. Create Bill (atomic, idempotent, sequential DDMMYY-NNN)
  async createBill(payload: CreateBillPayload): Promise<{ bill: Bill; items: BillItem[] }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('create_bill', {
        p_id: payload.id,
        p_payment_method: payload.payment_method,
        p_cash_received: payload.cash_received ?? null,
        p_items: payload.items,
      });
      if (error) throw error;
      return { bill: data.bill, items: data.items };
    }

    // Local storage fallback implementation matching the PostgreSQL RPC
    const bills = getFromStorage<Bill[]>(STORAGE_KEYS.BILLS, []);
    const existing = bills.find((b) => b.id === payload.id);
    if (existing) {
      const allItems = getFromStorage<BillItem[]>(STORAGE_KEYS.BILL_ITEMS, []);
      return { bill: existing, items: allItems.filter((i) => i.bill_id === existing.id) };
    }

    const products = getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const businessDate = getVietnamBusinessDate();
    const prefix = getVietnamBillPrefix();

    // Calculate sequential number
    const counters = getFromStorage<Record<string, number>>(STORAGE_KEYS.COUNTERS, {});
    const currentSeq = (counters[businessDate] || 0) + 1;
    counters[businessDate] = currentSeq;
    saveToStorage(STORAGE_KEYS.COUNTERS, counters);

    const code = `${prefix}-${String(currentSeq).padStart(3, '0')}`;

    let total = 0;
    const newItems: BillItem[] = [];

    for (const itemInput of payload.items) {
      const prod = products.find((p) => p.id === itemInput.product_id);
      if (!prod) {
        throw new Error(`Món không tồn tại: ${itemInput.product_id}`);
      }
      const lineTotal = prod.price * itemInput.qty;
      total += lineTotal;
      newItems.push({
        id: crypto.randomUUID(),
        bill_id: payload.id,
        product_id: prod.id,
        name_snapshot: prod.name,
        price_snapshot: prod.price,
        qty: itemInput.qty,
        line_total: lineTotal,
      });
    }

    let changeAmount: number | null = null;
    if (payload.payment_method === 'cash' && payload.cash_received != null) {
      if (payload.cash_received < total) {
        throw new Error(`Tiền khách đưa (${payload.cash_received}) nhỏ hơn tổng đơn (${total})`);
      }
      changeAmount = payload.cash_received - total;
    }

    const newBill: Bill = {
      id: payload.id,
      code,
      created_at: new Date().toISOString(),
      business_date: businessDate,
      total,
      payment_method: payload.payment_method,
      cash_received: payload.cash_received ?? null,
      change_amount: changeAmount,
      status: 'paid',
    };

    bills.unshift(newBill);
    saveToStorage(STORAGE_KEYS.BILLS, bills);

    const allItems = getFromStorage<BillItem[]>(STORAGE_KEYS.BILL_ITEMS, []);
    allItems.push(...newItems);
    saveToStorage(STORAGE_KEYS.BILL_ITEMS, allItems);

    return { bill: newBill, items: newItems };
  },

  // 4. Bills listing & detail
  async getBills(
    dateOrRange?: string | { date?: string; startDate?: string; endDate?: string },
    filterMethod?: string,
    filterStatus?: string,
    searchCode?: string
  ): Promise<BillWithItems[]> {
    let singleDate: string | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (typeof dateOrRange === 'string') {
      singleDate = dateOrRange;
    } else if (dateOrRange) {
      singleDate = dateOrRange.date;
      startDate = dateOrRange.startDate;
      endDate = dateOrRange.endDate;
    }

    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('bills').select('*, items:bill_items(*)').order('created_at', { ascending: false });
      if (startDate && endDate) {
        query = query.gte('business_date', startDate).lte('business_date', endDate);
      } else if (singleDate) {
        query = query.eq('business_date', singleDate);
      }
      if (filterMethod && filterMethod !== 'all') query = query.eq('payment_method', filterMethod);
      if (filterStatus && filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (searchCode && searchCode.trim()) query = query.ilike('code', `%${searchCode.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BillWithItems[];
    }

    let bills = getFromStorage<Bill[]>(STORAGE_KEYS.BILLS, []);
    const items = getFromStorage<BillItem[]>(STORAGE_KEYS.BILL_ITEMS, []);

    if (startDate && endDate) {
      bills = bills.filter((b) => b.business_date >= startDate! && b.business_date <= endDate!);
    } else if (singleDate) {
      bills = bills.filter((b) => b.business_date === singleDate);
    }
    if (filterMethod && filterMethod !== 'all') {
      bills = bills.filter((b) => b.payment_method === filterMethod);
    }
    if (filterStatus && filterStatus !== 'all') {
      bills = bills.filter((b) => b.status === filterStatus);
    }
    if (searchCode && searchCode.trim()) {
      const q = searchCode.trim().toLowerCase();
      bills = bills.filter((b) => b.code.toLowerCase().includes(q));
    }

    return bills.map((b) => ({
      ...b,
      items: items.filter((i) => i.bill_id === b.id),
    }));
  },

  async getBillById(id: string): Promise<BillWithItems | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('bills')
        .select('*, items:bill_items(*)')
        .eq('id', id)
        .single();
      if (error) return null;
      return data as BillWithItems;
    }

    const bills = getFromStorage<Bill[]>(STORAGE_KEYS.BILLS, []);
    const bill = bills.find((b) => b.id === id);
    if (!bill) return null;

    const items = getFromStorage<BillItem[]>(STORAGE_KEYS.BILL_ITEMS, []);
    return {
      ...bill,
      items: items.filter((i) => i.bill_id === bill.id),
    };
  },

  async voidBill(id: string, reason: string): Promise<Bill> {
    if (!reason || !reason.trim()) {
      throw new Error('Lý do huỷ bill là bắt buộc');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('void_bill', {
        p_id: id,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      return data.bill;
    }

    const bills = getFromStorage<Bill[]>(STORAGE_KEYS.BILLS, []);
    const index = bills.findIndex((b) => b.id === id);
    if (index < 0) throw new Error('Không tìm thấy hoá đơn');

    bills[index] = {
      ...bills[index],
      status: 'void',
      void_reason: reason.trim(),
      voided_at: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.BILLS, bills);
    return bills[index];
  },

  // 5. Cash entries
  async getCashEntries(
    dateOrRange?: string | { date?: string; startDate?: string; endDate?: string }
  ): Promise<CashEntry[]> {
    let singleDate: string | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (typeof dateOrRange === 'string') {
      singleDate = dateOrRange;
    } else if (dateOrRange) {
      singleDate = dateOrRange.date;
      startDate = dateOrRange.startDate;
      endDate = dateOrRange.endDate;
    }

    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('cash_entries').select('*').order('created_at', { ascending: false });
      if (startDate && endDate) {
        query = query.gte('business_date', startDate).lte('business_date', endDate);
      } else if (singleDate) {
        query = query.eq('business_date', singleDate);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    let entries = getFromStorage<CashEntry[]>(STORAGE_KEYS.CASH_ENTRIES, []);
    if (startDate && endDate) {
      entries = entries.filter((e) => e.business_date >= startDate! && e.business_date <= endDate!);
    } else if (singleDate) {
      entries = entries.filter((e) => e.business_date === singleDate);
    }
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createCashEntry(entry: { type: 'in' | 'out'; amount: number; note: string }): Promise<CashEntry> {
    if (!entry.note || !entry.note.trim()) {
      throw new Error('Ghi chú là bắt buộc');
    }
    if (entry.amount <= 0) {
      throw new Error('Số tiền phải lớn hơn 0');
    }

    const businessDate = getVietnamBusinessDate();
    const newEntry: CashEntry = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      business_date: businessDate,
      type: entry.type,
      amount: Math.round(entry.amount),
      note: entry.note.trim(),
      status: 'active',
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('cash_entries').insert(newEntry).select().single();
      if (error) throw error;
      return data;
    }

    const entries = getFromStorage<CashEntry[]>(STORAGE_KEYS.CASH_ENTRIES, []);
    entries.unshift(newEntry);
    saveToStorage(STORAGE_KEYS.CASH_ENTRIES, entries);
    return newEntry;
  },

  async voidCashEntry(id: string, reason: string): Promise<CashEntry> {
    if (!reason || !reason.trim()) {
      throw new Error('Lý do huỷ là bắt buộc');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('void_cash_entry', {
        p_id: id,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      return data.cash_entry;
    }

    const entries = getFromStorage<CashEntry[]>(STORAGE_KEYS.CASH_ENTRIES, []);
    const index = entries.findIndex((e) => e.id === id);
    if (index < 0) throw new Error('Không tìm thấy khoản thu chi');

    entries[index] = {
      ...entries[index],
      status: 'void',
      void_reason: reason.trim(),
    };
    saveToStorage(STORAGE_KEYS.CASH_ENTRIES, entries);
    return entries[index];
  },

  // 6. Day Notes (End of day count)
  async getDayNote(date: string): Promise<DayNote | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('day_notes').select('*').eq('business_date', date).maybeSingle();
      if (error) throw error;
      return data;
    }

    const notes = getFromStorage<Record<string, DayNote>>(STORAGE_KEYS.DAY_NOTES, {});
    return notes[date] || null;
  },

  async saveDayNote(date: string, countedCash: number | null, note: string | null): Promise<DayNote> {
    const payload = {
      business_date: date,
      counted_cash: countedCash,
      note: note,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('day_notes').upsert(payload).select().single();
      if (error) throw error;
      return data;
    }

    const notes = getFromStorage<Record<string, DayNote>>(STORAGE_KEYS.DAY_NOTES, {});
    notes[date] = payload;
    saveToStorage(STORAGE_KEYS.DAY_NOTES, notes);
    return payload;
  },

  // 7. Shop Settings
  async getSettings(): Promise<ShopSettings> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
      if (error) return DEFAULT_SETTINGS;
      return data;
    }
    return getFromStorage<ShopSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  async updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('shop_settings')
        .upsert({ ...settings, id: 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const current = getFromStorage<ShopSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const updated = { ...current, ...settings, id: 1 };
    saveToStorage(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // Realtime subscription helper
  subscribeRealtime(callback: () => void): () => void {
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const channel = client
        .channel('pos_realtime_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_entries' }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'day_notes' }, callback)
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }

    // Cross-tab broadcast channel listener
    if (broadcastChannel) {
      const listener = () => callback();
      broadcastChannel.addEventListener('message', listener);
      return () => {
        broadcastChannel.removeEventListener('message', listener);
      };
    }

    return () => {};
  },
};

