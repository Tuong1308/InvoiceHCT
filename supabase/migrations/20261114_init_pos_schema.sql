-- ============================================================
-- POS TIỆM NƯỚC & BÁNH - POSTGRESQL SCHEMA & RPCs
-- ============================================================

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- 1. BẢNG DANH MỤC (categories)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int not null default 0,
  active boolean not null default true
);

-- 2. BẢNG MÓN (products)
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  price integer not null check (price >= 0),
  sort int not null default 0,
  active boolean not null default true
);

-- 3. BẢNG ĐẾM SỐ BILL THEO NGÀY (bill_counters)
create table if not exists bill_counters (
  business_date date primary key,
  last_seq integer not null default 0
);

-- 4. BẢNG HOÁ ĐƠN (bills)
create table if not exists bills (
  id uuid primary key, -- client sinh sẵn chống trùng
  code text not null unique,
  created_at timestamptz not null default now(),
  business_date date not null,
  total integer not null check (total >= 0),
  payment_method text not null check (payment_method in ('cash', 'transfer')),
  cash_received integer,
  change_amount integer,
  status text not null default 'paid' check (status in ('paid', 'void')),
  void_reason text,
  voided_at timestamptz
);

-- 5. BẢNG MÓN TRONG HOÁ ĐƠN (bill_items)
create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  product_id uuid references products(id),
  name_snapshot text not null,
  price_snapshot integer not null,
  qty integer not null check (qty > 0),
  line_total integer not null
);

-- 6. BẢNG THU CHI TIỀN MẶT (cash_entries)
create table if not exists cash_entries (
  id uuid primary key,
  created_at timestamptz not null default now(),
  business_date date not null,
  type text not null check (type in ('in', 'out')),
  amount integer not null check (amount > 0),
  note text not null,
  status text not null default 'active' check (status in ('active', 'void')),
  void_reason text
);

-- 7. BẢNG TỔNG KẾT / KIỂM KÉT CUỐI NGÀY (day_notes)
create table if not exists day_notes (
  business_date date primary key,
  counted_cash integer,
  note text,
  updated_at timestamptz not null default now()
);

-- 8. BẢNG CÀI ĐẶT TIỆM (shop_settings)
create table if not exists shop_settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'Tiệm Nước & Bánh HCT',
  address text not null default 'Khu phố 6, P. Linh Trung, TP. Thủ Đức',
  phone text not null default '0901 234 567',
  bank_bin text not null default '970436',
  bank_name text not null default 'Vietcombank',
  account_no text not null default '0123456789',
  account_name text not null default 'NGUYEN VAN A',
  footer_text text not null default 'Cảm ơn và hẹn gặp lại quý khách!',
  bill_paper_size text not null default '80mm'
);

-- ============================================================
-- RPC: CREATE_BILL
-- ============================================================
create or replace function create_bill(
  p_id uuid,
  p_payment_method text,
  p_cash_received integer,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing_bill bills%rowtype;
  v_vn_now timestamptz;
  v_business_date date;
  v_prefix text;
  v_next_seq integer;
  v_code text;
  v_item jsonb;
  v_product products%rowtype;
  v_calculated_total integer := 0;
  v_change integer := null;
  v_bill bills%rowtype;
  v_bill_items jsonb := '[]'::jsonb;
begin
  -- 1. Idempotency Check: if bill id already exists, return it
  select * into v_existing_bill from bills where id = p_id;
  if found then
    return jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'bill', to_jsonb(v_existing_bill)
    );
  end if;

  -- 2. Business date according to Asia/Ho_Chi_Minh
  v_vn_now := now() at time zone 'Asia/Ho_Chi_Minh';
  v_business_date := v_vn_now::date;
  v_prefix := to_char(v_business_date, 'DDMMYY');

  -- 3. Atomic sequence generation
  insert into bill_counters (business_date, last_seq)
  values (v_business_date, 1)
  on conflict (business_date)
  do update set last_seq = bill_counters.last_seq + 1
  returning last_seq into v_next_seq;

  v_code := v_prefix || '-' || lpad(v_next_seq::text, 3, '0');

  -- 4. Calculate total and validate items from products table
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Đơn hàng không có món nào';
  end if;

  -- Create temporary storage for verified items
  create temporary table if not exists temp_items (
    prod_id uuid,
    name_snap text,
    price_snap integer,
    qty integer,
    line_total integer
  ) on commit drop;
  delete from temp_items;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    if not found then
      raise exception 'Món với ID % không tồn tại', (v_item->>'product_id');
    end if;

    insert into temp_items (prod_id, name_snap, price_snap, qty, line_total)
    values (
      v_product.id,
      v_product.name,
      v_product.price,
      (v_item->>'qty')::integer,
      v_product.price * (v_item->>'qty')::integer
    );

    v_calculated_total := v_calculated_total + (v_product.price * (v_item->>'qty')::integer);
  end loop;

  -- 5. Validate cash received if provided
  if p_payment_method = 'cash' and p_cash_received is not null then
    if p_cash_received < v_calculated_total then
      raise exception 'Tiền khách đưa (%) nhỏ hơn tổng đơn (%)', p_cash_received, v_calculated_total;
    end if;
    v_change := p_cash_received - v_calculated_total;
  end if;

  -- 6. Insert bill
  insert into bills (
    id,
    code,
    created_at,
    business_date,
    total,
    payment_method,
    cash_received,
    change_amount,
    status
  ) values (
    p_id,
    v_code,
    now(),
    v_business_date,
    v_calculated_total,
    p_payment_method,
    p_cash_received,
    v_change,
    'paid'
  ) returning * into v_bill;

  -- 7. Insert bill items
  insert into bill_items (bill_id, product_id, name_snapshot, price_snapshot, qty, line_total)
  select v_bill.id, prod_id, name_snap, price_snap, qty, line_total
  from temp_items;

  -- Select items as json
  select jsonb_agg(to_jsonb(bi)) into v_bill_items
  from bill_items bi
  where bi.bill_id = v_bill.id;

  return jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'bill', to_jsonb(v_bill),
    'items', v_bill_items
  );
end;
$$;

-- ============================================================
-- RPC: VOID_BILL
-- ============================================================
create or replace function void_bill(
  p_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_bill bills%rowtype;
begin
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Lý do huỷ bill là bắt buộc';
  end if;

  update bills
  set status = 'void',
      void_reason = p_reason,
      voided_at = now()
  where id = p_id
  returning * into v_bill;

  if not found then
    raise exception 'Không tìm thấy hoá đơn';
  end if;

  return jsonb_build_object('success', true, 'bill', to_jsonb(v_bill));
end;
$$;

-- ============================================================
-- RPC: VOID_CASH_ENTRY
-- ============================================================
create or replace function void_cash_entry(
  p_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_entry cash_entries%rowtype;
begin
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Lý do huỷ khoản thu chi là bắt buộc';
  end if;

  update cash_entries
  set status = 'void',
      void_reason = p_reason
  where id = p_id
  returning * into v_entry;

  if not found then
    raise exception 'Không tìm thấy khoản thu chi';
  end if;

  return jsonb_build_object('success', true, 'cash_entry', to_jsonb(v_entry));
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table categories enable row level security;
alter table products enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;
alter table cash_entries enable row level security;
alter table day_notes enable row level security;
alter table shop_settings enable row level security;
alter table bill_counters enable row level security;

-- Policies for Authenticated Shop Staff
create policy "Authenticated users full access categories" on categories for all to authenticated using (true) with check (true);
create policy "Authenticated users full access products" on products for all to authenticated using (true) with check (true);
create policy "Authenticated users full access bills" on bills for all to authenticated using (true) with check (true);
create policy "Authenticated users full access bill_items" on bill_items for all to authenticated using (true) with check (true);
create policy "Authenticated users full access cash_entries" on cash_entries for all to authenticated using (true) with check (true);
create policy "Authenticated users full access day_notes" on day_notes for all to authenticated using (true) with check (true);
create policy "Authenticated users full access shop_settings" on shop_settings for all to authenticated using (true) with check (true);
create policy "Authenticated users full access bill_counters" on bill_counters for all to authenticated using (true) with check (true);

-- Enable Realtime publication for relevant tables
alter publication supabase_realtime add table bills;
alter publication supabase_realtime add table cash_entries;
alter publication supabase_realtime add table day_notes;

