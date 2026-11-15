# Kế hoạch triển khai Web Bán Hàng (POS) – Tiệm Nước & Bánh

> Tài liệu đặc tả để bàn giao cho dev. Phiên bản 1.1 – 14/11/2026 (đã chốt công nghệ: ReactJS · Supabase PostgreSQL · Vercel).
> Các mục đánh dấu **[CẦN CHỐT]** phải được chủ tiệm xác nhận trước hoặc trong khi làm.

---

## 1. Mục tiêu

Một web app bán hàng tại quầy, dùng trên **điện thoại và máy tính** (responsive):

- Nhân viên nghe khách order → bấm món → hệ thống tự cộng tiền.
- Thanh toán **Tiền mặt** (có tính tiền thối) hoặc **Chuyển khoản** (bill có mã QR).
- In bill / lưu bill dạng PDF.
- Ghi **thu chi tiền mặt** ngoài bán hàng.
- Xem **doanh thu hôm nay** và **tổng kết cuối ngày**; sếp xem được từ xa theo thời gian thực.

### Các quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Thiết bị | Điện thoại + máy tính → bắt buộc responsive |
| Số lượng | Là số lượng món trong 1 đơn (bấm món = 1, bấm `+` = 2…). **Không** quản lý tồn kho |
| Ngày | Tính theo ngày lịch 00:00 – 23:59, múi giờ `Asia/Ho_Chi_Minh`. Không chia ca |
| Phân quyền | Sếp và nhân viên **quyền như nhau** → không phân quyền, dùng 1 tài khoản chung của tiệm |
| Chuyển khoản | Bill in/PDF của đơn chuyển khoản **có mã VietQR** (kèm số tiền + nội dung = mã bill) |
| Bố cục | Theo bản phác thảo của chủ tiệm (mục 4) + bổ sung cột “Đơn hiện tại” bên phải trên máy tính; trên điện thoại cột này thu thành thanh ngang full màn hình ở đáy |

---

## 2. Công nghệ (ĐÃ CHỐT)

### 2.1. Stack chính

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | **ReactJS** + TypeScript, build bằng **Vite**, dạng SPA + PWA | Không dùng Create React App (đã ngừng phát triển). Không cần Next.js vì app nội bộ, không cần SEO/SSR |
| Backend / Database | **Supabase – PostgreSQL** (CSDL quan hệ, **không dùng MongoDB**) | Dùng Auth (email + mật khẩu), Realtime, hàm RPC viết bằng PL/pgSQL. Chọn region **Singapore** cho gần Việt Nam |
| Deploy | **Vercel** | Kết nối GitHub: push `main` → tự deploy production; mỗi branch có link preview |

Không viết backend riêng (Node/Express…): logic quan trọng (tạo bill, sinh mã bill, huỷ bill) nằm trong hàm RPC của Postgres, frontend gọi qua `supabase-js`.

### 2.2. Thư viện đi kèm (đề xuất)

| Việc | Thư viện |
|---|---|
| Điều hướng trang | React Router |
| Giao diện, responsive | Tailwind CSS + shadcn/ui (Dialog cho thanh toán, Sheet/Drawer cho hamburger và bottom sheet, Toast) |
| Icon | lucide-react |
| Giỏ hàng (state phía máy) | Zustand + `persist` (F5 không mất đơn đang bấm) |
| Gọi dữ liệu Supabase | `@supabase/supabase-js` + TanStack Query |
| Form + kiểm tra dữ liệu | react-hook-form + zod |
| Ngày giờ (múi giờ VN) | date-fns + date-fns-tz |
| Định dạng tiền | `Intl.NumberFormat('vi-VN')` |
| Mã QR | `qrcode` + module tự viết `vietqr.ts` (mục 6.3) |
| PWA | vite-plugin-pwa |
| Test | Vitest (unit), Playwright (e2e ở 360px / 768px / 1366px) |
| Chất lượng code | ESLint + Prettier |

Dev được thay thư viện phụ bằng thư viện tương đương, nhưng **không đổi 3 lớp chính ở mục 2.1**.

### 2.3. Lưu ý bắt buộc

**Vercel**
- Theo điều khoản của Vercel, gói **Hobby (miễn phí) chỉ dành cho mục đích cá nhân, phi thương mại**; dùng cho kinh doanh phải lên gói **Pro** (khoảng 20 USD/tháng/thành viên – kiểm tra lại giá khi đăng ký).
- **[CẦN CHỐT]** Dùng Vercel Pro, hay muốn 0đ thì đổi sang Cloudflare Pages (miễn phí, cho phép thương mại). App là SPA tĩnh nên đổi nơi deploy **không phải sửa code**.
- SPA trên Vercel cần file `vercel.json` rewrite mọi đường dẫn về `index.html` (để F5 ở `/doanh-thu` không bị 404).
- Khai báo biến môi trường `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` trong Vercel → Project Settings → Environment Variables.

**Supabase (gói Free)**
- Giới hạn: database 500 MB/project, tối đa 2 project đang chạy, **project tự tạm dừng sau 1 tuần không hoạt động**, **không có backup**.
- Dung lượng: ước tính ~1–2 năm ở mức 300 bill/ngày; theo dõi ở Settings → Usage.
- Dev **bắt buộc** làm:
  1. **Backup hằng ngày**: GitHub Actions chạy theo lịch `supabase db dump` (hoặc `pg_dump`) → lưu vào repo private / artifact, giữ tối thiểu 30 bản; README có hướng dẫn khôi phục.
  2. **Chống bị tạm dừng** khi tiệm nghỉ dài ngày (Tết…): GitHub Actions mỗi ngày gọi 1 truy vấn nhẹ tới DB.
- Khi dùng ổn định, nên cân nhắc lên **Supabase Pro** (khoảng 25 USD/tháng): không bị tạm dừng, có backup hằng ngày.
- Dùng 2 project: `pos-dev` (thử nghiệm) và `pos-prod` (chạy thật).
- Mọi thay đổi DB đi qua **migration** của Supabase CLI (`supabase/migrations/*.sql`), không sửa tay trên dashboard. Sinh type TypeScript bằng `supabase gen types typescript`.
- Frontend chỉ dùng **anon key**; bảo mật bằng **RLS**. `service_role` key / mật khẩu DB chỉ nằm trong GitHub Secrets cho job backup, **không** đưa vào code frontend.

### 2.4. Cấu trúc thư mục đề xuất

```
pos-tiem/
├─ src/
│  ├─ app/                 # router, layout, providers
│  ├─ features/
│  │  ├─ pos/              # CategorySidebar, ProductGrid, ProductCard,
│  │  │                    # CartPanel (máy tính), CartBar + CartSheet (điện thoại),
│  │  │                    # CheckoutDialog
│  │  ├─ bills/            # BillHistory, BillDetail, BillPrint
│  │  ├─ cash/             # CashEntryForm, CashEntryList
│  │  ├─ reports/          # TodayDashboard, DaySummary
│  │  ├─ menu-admin/
│  │  └─ settings/
│  ├─ lib/
│  │  ├─ supabase.ts
│  │  ├─ vietqr.ts         # dựng chuỗi VietQR + CRC16
│  │  ├─ money.ts          # format VND, tính tiền thối
│  │  ├─ search.ts         # bỏ dấu tiếng Việt
│  │  └─ date.ts           # giờ Việt Nam
│  ├─ stores/cart.ts       # Zustand
│  └─ types/database.ts    # sinh tự động từ Supabase
├─ supabase/
│  ├─ migrations/          # bảng, RLS, RPC create_bill, void_bill...
│  └─ seed.sql             # menu ban đầu
├─ tests/                  # unit + e2e
├─ .github/workflows/      # backup DB hằng ngày, keep-alive
├─ vercel.json
└─ .env.example
```

---

## 3. Danh mục món

### 3.1. Loại món (cột trái)

Thứ tự cố định: **Cà phê → Matcha → Tea → Soda → Cake**. Có thể thêm/sửa/sắp xếp trong màn hình Quản lý menu.

### 3.2. Món

Mỗi món có: tên, giá (VND), thuộc loại nào, trạng thái đang bán/ẩn, thứ tự hiển thị.

Ví dụ (menu mẫu – thay bằng menu thật): Cà phê đen, Cà phê sữa, Cà phê muối, Bạc xỉu…

**[CẦN CHỐT]** Danh sách menu thật: tên món + giá + loại.

---

## 4. Giao diện

### 4.1. Màn hình Bán hàng – máy tính (≥ 1024px)

Dựa trên phác thảo: cột trái = loại món, thanh trên = hamburger + tìm kiếm, khu chính = lưới món. **Bổ sung cột giỏ hàng bên phải** (phác thảo chưa có chỗ hiện đơn và tổng tiền).

```
┌────────────┬──────────────────────────────────────┬──────────────────┐
│            │ [☰]  [ 🔍 Tìm món...              ]  │  ĐƠN HIỆN TẠI    │
│  Cà phê ◀  ├──────────────────────────────────────┤                  │
│            │ ┌────────┐ ┌────────┐ ┌────────┐     │ 2 × Cà phê muối  │
│  Matcha    │ │Cà phê  │ │Cà phê  │ │Cà phê  │     │        60.000đ   │
│            │ │đen     │ │sữa     │ │muối    │     │ 1 × Bạc xỉu      │
│  Tea       │ │20.000đ │ │25.000đ │ │30.000đ │     │        28.000đ   │
│            │ │        │ │        │ │[-] 2[+]│     │                  │
│  Soda      │ └────────┘ └────────┘ └────────┘     ├──────────────────┤
│            │ ┌────────┐ ┌────────┐                │ Tổng    88.000đ  │
│  Cake      │ │Bạc xỉu │ │America-│                │ [  Xóa hết     ] │
│            │ │28.000đ │ │no      │                │ [ THANH TOÁN   ] │
│            │ │[-] 1[+]│ │32.000đ │                │                  │
└────────────┴──────────────────────────────────────┴──────────────────┘
   ~160px              co giãn (auto-fill)                ~320px
```

### 4.2. Hành vi chi tiết

**Cột loại món (trái)**
- Bấm 1 loại → lưới bên phải chỉ hiện món thuộc loại đó; loại đang chọn được tô nổi.
- Mặc định khi mở app: chọn loại đầu tiên (Cà phê).

**Ô món (lưới)**
- Hiện tên + giá.
- Món chưa có trong đơn: bấm vào ô → thêm vào đơn, số lượng = 1.
- Món đã có trong đơn: ô được viền nổi, hiện cụm `[−] số lượng [+]` ngay trên ô.
  - `+` → tăng 1.
  - `−` → giảm 1; nếu đang là 1 thì bỏ món khỏi đơn.
- Vùng bấm tối thiểu 44×44px (dùng tay trên điện thoại).

**Thanh trên – Tìm kiếm**
- Tìm trên **toàn bộ menu** (mọi loại), lọc ngay khi gõ.
- Tìm **không dấu, không phân biệt hoa thường**: gõ `ca phe muoi` ra “Cà phê muối”; `đ` ↔ `d`.
- Khi đang tìm: bỏ tô loại món bên trái; xoá ô tìm → quay lại loại đang chọn.
- Không có kết quả → hiện “Không có món nào khớp”.

**Thanh trên – Menu hamburger (☰)**
Bấm mở ngăn menu (drawer) chứa các chức năng:
1. Bán hàng (màn hình chính)
2. Doanh thu hôm nay
3. Thu chi tiền mặt
4. Lịch sử bill
5. Tổng kết ngày
6. Quản lý menu
7. Cài đặt (thông tin tiệm, tài khoản ngân hàng)
8. Đăng xuất

**Cột giỏ hàng (phải)**
- Liệt kê các món: `số lượng × tên` – thành tiền; có `−`/`+`/xoá từng dòng.
- **Tổng tiền** chữ lớn, luôn nhìn thấy.
- Nút **Xóa hết** (hỏi xác nhận) và **Thanh toán** (vô hiệu khi đơn rỗng).

### 4.3. Màn hình Bán hàng – điện thoại (< 640px)

Cột trái 160px chiếm quá nhiều chỗ trên điện thoại nên đề xuất:

```
┌─────────────────────────────┐
│ [☰] [ 🔍 Tìm món...       ] │
│ (Cà phê)(Matcha)(Tea)(Soda)→│  ← loại món thành hàng tab cuộn ngang
├─────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ │
│ │Cà phê đen │ │Cà phê sữa │ │  ← lưới 2 cột
│ │20.000đ    │ │25.000đ    │ │
│ └───────────┘ └───────────┘ │
│ ┌───────────┐ ┌───────────┐ │
│ │Cà phê muối│ │Bạc xỉu    │ │
│ │30.000đ    │ │28.000đ    │ │
│ │[-]  2  [+]│ │           │ │
│ └───────────┘ └───────────┘ │
├─────────────────────────────┤
│ 3 món · 88.000đ [THANH TOÁN]│  ← thanh cố định đáy màn hình
└─────────────────────────────┘
```

**Đơn hiện tại trên điện thoại (ĐÃ CHỐT với chủ tiệm):** cột “Đơn hiện tại” của bản máy tính **thu nhỏ thành 1 thanh nằm ngang, rộng full màn hình, cố định ở đáy**.
- Thanh đáy hiện: số món · tổng tiền · nút **Thanh toán**. Ẩn khi đơn rỗng (hoặc hiện mờ “Chưa có món”).
- Chạm vào phần “3 món · 88.000đ” → danh sách món trượt lên từ đáy (bottom sheet, cao tối đa ~70% màn hình) để xem/chỉnh `−`/`+`/xoá từng món, có nút Xóa hết; vuốt xuống hoặc chạm ra ngoài để thu lại.
- Lưới món phải chừa khoảng trống phía dưới bằng chiều cao thanh đáy để món cuối không bị che.

**[CẦN CHỐT]** Trên điện thoại dùng **tab ngang** như trên (đề xuất), hay giữ **cột trái thu hẹp ~80px**.

### 4.4. Breakpoint

| Kích thước | Bố cục |
|---|---|
| ≥ 1024px (máy tính) | 3 cột: loại món · lưới món · đơn hiện tại (đã chốt theo bản mô phỏng) |
| 640–1023px (tablet / máy tính nhỏ) | 2 cột: loại món · lưới món; đơn hiện tại thành thanh ngang full chiều rộng ở đáy + bottom sheet |
| < 640px (điện thoại) | Như mục 4.3: đơn hiện tại thành thanh ngang full chiều rộng ở đáy |

---

## 5. Thanh toán

Bấm **Thanh toán** → mở hộp thoại thanh toán (modal; trên điện thoại là toàn màn hình).

### 5.1. Chọn phương thức

Hai nút lớn: **Tiền mặt** | **Chuyển khoản**. Trên cùng hiện lại tổng tiền.

### 5.2. Tiền mặt

- Ô **Tiền khách đưa** – *không bắt buộc*.
  - Bàn phím số; tự định dạng `100.000`.
  - Nút nhanh: **Đủ tiền**, 50.000, 100.000, 200.000, 500.000.
- Nếu có nhập: hiện **Tiền thối = Tiền khách đưa − Tổng**.
  - Nếu tiền khách đưa < tổng → báo đỏ “Khách đưa chưa đủ”, không cho xác nhận.
- Nếu không nhập: vẫn thanh toán được, bill không có dòng tiền khách đưa/tiền thối.

### 5.3. Chuyển khoản

- Hiện mã **VietQR** lên màn hình (để khách quét luôn nếu muốn), kèm ngân hàng, số tài khoản, tên chủ tài khoản, số tiền.
- Nhân viên xác nhận khi đã nhận tiền.

### 5.4. Xác nhận

- Hai nút: **Thanh toán** và **Thanh toán & In**.
- Khi bấm:
  1. Khoá nút ngay lập tức (chống bấm 2 lần tạo 2 bill).
  2. Lưu bill lên server (mục 8.2).
  3. Thành công → (nếu chọn In) mở bản in bill → xoá giỏ hàng → về màn hình bán hàng, hiện thông báo “Đã lưu bill 141126-005”.
  4. Lỗi (mất mạng…) → báo lỗi rõ ràng, **giữ nguyên giỏ hàng**, cho bấm lại.

---

## 6. Bill (in / PDF)

### 6.1. Cách in

- Nút **In / Lưu PDF** gọi `window.print()` với trang in riêng cho bill.
- Người dùng chọn máy in hoặc “Lưu dưới dạng PDF” (Chrome máy tính, Chrome Android; Safari iOS: Chia sẻ → Lưu vào Tệp).
- In lại được bất kỳ bill nào từ Lịch sử bill / Doanh thu hôm nay.

**[CẦN CHỐT]** Khổ bill: **80mm** (dạng bill máy in nhiệt – đề xuất) hay **A5/A4**. Dev làm CSS sao cho đổi khổ chỉ cần sửa `@page size` + biến chiều rộng.

### 6.2. Nội dung bill

```
        TÊN TIỆM
   Địa chỉ · SĐT
--------------------------------
Bill: 141126-005
Ngày: 14/11/2026 20:45
--------------------------------
Món            SL   Đ.giá   T.tiền
Cà phê muối     2  30.000   60.000
Bạc xỉu         1  28.000   28.000
--------------------------------
TỔNG CỘNG                  88.000đ
Thanh toán:            Tiền mặt
Khách đưa:                100.000
Tiền thối:                 12.000
--------------------------------
       Cảm ơn quý khách!
```

**Bill chuyển khoản**: thay 3 dòng “Thanh toán / Khách đưa / Tiền thối” bằng:

```
Thanh toán:          Chuyển khoản
        ┌───────────┐
        │  MÃ QR    │
        │  VietQR   │
        └───────────┘
Ngân hàng: Vietcombank
STK: 0123456789
Chủ TK: NGUYEN VAN A
Nội dung: 141126-005
```

- Bill đã huỷ (in lại) phải có dòng chữ **“ĐÃ HUỶ”** nổi bật.

### 6.3. Đặc tả mã VietQR

Sinh chuỗi theo chuẩn EMVCo QR của NAPAS (VietQR), sau đó render thành ảnh QR bằng thư viện `qrcode`.

| ID | Tên | Giá trị |
|---|---|---|
| 00 | Payload Format | `01` |
| 01 | Point of Initiation | `12` (QR động – có số tiền) |
| 38 | Merchant Account Info | 00 = `A000000727`; 01 = { 00 = BIN ngân hàng, 01 = số tài khoản }; 02 = `QRIBFTTA` |
| 53 | Currency | `704` (VND) |
| 54 | Amount | Tổng tiền bill, số nguyên, ví dụ `88000` |
| 58 | Country | `VN` |
| 62 | Additional Data | 08 = nội dung chuyển khoản = **mã bill** (không dấu, ≤ 25 ký tự) |
| 63 | CRC | CRC16-CCITT (poly `0x1021`, init `0xFFFF`) trên toàn chuỗi kèm `6304` |

- Mỗi trường mã hoá dạng `ID(2) + độ dài(2) + giá trị`.
- **Bắt buộc test** bằng app ngân hàng thật (ít nhất 2 ngân hàng khác nhau): quét ra đúng tên chủ TK, số tiền, nội dung.
- Thông tin ngân hàng lấy từ bảng `shop_settings` (mục 8.1), sửa được trong màn hình Cài đặt; có danh sách chọn ngân hàng → tự điền BIN.

---

## 7. Các màn hình chức năng (từ menu hamburger)

### 7.1. Doanh thu hôm nay

- Thẻ số liệu (cập nhật **realtime** khi có bill/thu chi mới từ máy khác):
  - **Doanh thu** = tổng bill hợp lệ hôm nay
  - **Tiền mặt** (bán hàng) · **Chuyển khoản**
  - **Số bill**
  - **Thu khác** · **Chi**
  - **Tiền mặt ròng** = Tiền mặt bán hàng + Thu − Chi
- Bảng **món bán được**: tên món – số lượng – thành tiền, sắp giảm dần.
- **Dòng thời gian** gộp bill + thu chi trong ngày, mới nhất ở trên. Bấm 1 bill → xem chi tiết, In lại, Huỷ.

### 7.2. Thu chi tiền mặt

- Form: chọn **Thu** hoặc **Chi** → nhập **số tiền** (> 0) → **ghi chú** (bắt buộc, ví dụ “mua đá”, “bỏ thêm tiền lẻ”) → Lưu.
- Thời gian tự lấy lúc lưu.
- Danh sách thu chi hôm nay bên dưới, có tổng Thu / tổng Chi.
- Khoản ghi sai: **huỷ** (kèm lý do), không xoá hẳn.

### 7.3. Lịch sử bill

- Chọn ngày (mặc định hôm nay) hoặc khoảng ngày.
- Lọc theo phương thức (tất cả / tiền mặt / chuyển khoản), trạng thái (hợp lệ / đã huỷ); tìm theo mã bill.
- Mỗi dòng: mã bill, giờ, tổng tiền, phương thức, trạng thái. Bấm → chi tiết, In lại, Huỷ.

**Huỷ bill**
- Ai cũng huỷ được; bắt buộc nhập lý do.
- Bill huỷ: vẫn hiện (gạch ngang + nhãn “Đã huỷ”), **không tính** vào doanh thu, món bán, tiền mặt.

### 7.4. Tổng kết ngày

- Chọn ngày (mặc định hôm nay); xem lại được mọi ngày cũ.
- Nội dung:
  ```
  Doanh thu            = Tiền mặt bán hàng + Chuyển khoản
  Tiền mặt ròng        = Tiền mặt bán hàng + Thu − Chi
  ```
  - Số bill hợp lệ, số bill huỷ
  - Bảng món bán được
  - Danh sách toàn bộ bill trong ngày
  - Danh sách toàn bộ thu chi trong ngày (kèm ghi chú)
- Ô **Tiền đếm thực tế trong két** (không bắt buộc) → hiện **Chênh lệch** = Thực tế − Tiền mặt ròng; lưu được kèm ghi chú.
- Nút **In / Lưu PDF** báo cáo tổng kết ngày.

### 7.5. Quản lý menu

- Thêm / sửa / ẩn loại món; sắp xếp thứ tự.
- Thêm / sửa / ẩn món: tên, giá, loại, thứ tự.
- Đổi giá **không ảnh hưởng** bill cũ (bill lưu giá tại thời điểm bán).
- Không xoá hẳn món đã từng bán → chỉ ẩn.

### 7.6. Cài đặt

- Tên tiệm, địa chỉ, số điện thoại (in trên bill).
- Tài khoản nhận chuyển khoản: ngân hàng (chọn từ danh sách → BIN), số tài khoản, tên chủ tài khoản (in hoa không dấu).
- Lời chào cuối bill.

### 7.7. Đăng nhập

- 1 tài khoản chung của tiệm (email + mật khẩu, Supabase Auth).
- Đăng nhập 1 lần trên mỗi thiết bị, ghi nhớ phiên.
- Chưa đăng nhập → chỉ thấy màn hình đăng nhập; mọi dữ liệu yêu cầu đăng nhập.

---

## 8. Dữ liệu

### 8.1. Lược đồ (Postgres)

```sql
-- Loại món
categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort        int  not null default 0,
  active      boolean not null default true
);

-- Món
products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name        text not null,
  price       integer not null check (price >= 0),   -- VND
  sort        int  not null default 0,
  active      boolean not null default true
);

-- Bill
bills (
  id              uuid primary key,                  -- client sinh sẵn (chống trùng)
  code            text not null unique,              -- vd 141126-005
  created_at      timestamptz not null default now(),
  business_date   date not null,                     -- ngày theo giờ VN
  total           integer not null check (total >= 0),
  payment_method  text not null check (payment_method in ('cash','transfer')),
  cash_received   integer,                           -- null nếu không nhập
  change_amount   integer,                           -- null nếu không nhập
  status          text not null default 'paid' check (status in ('paid','void')),
  void_reason     text,
  voided_at       timestamptz
);

-- Món trong bill (lưu bản chụp tên + giá)
bill_items (
  id              uuid primary key default gen_random_uuid(),
  bill_id         uuid not null references bills(id) on delete cascade,
  product_id      uuid references products(id),
  name_snapshot   text not null,
  price_snapshot  integer not null,
  qty             integer not null check (qty > 0),
  line_total      integer not null
);

-- Thu chi tiền mặt
cash_entries (
  id              uuid primary key,                  -- client sinh sẵn
  created_at      timestamptz not null default now(),
  business_date   date not null,
  type            text not null check (type in ('in','out')),
  amount          integer not null check (amount > 0),
  note            text not null,
  status          text not null default 'active' check (status in ('active','void')),
  void_reason     text
);

-- Ghi nhận cuối ngày (tuỳ chọn)
day_notes (
  business_date   date primary key,
  counted_cash    integer,
  note            text,
  updated_at      timestamptz not null default now()
);

-- Cài đặt tiệm (1 dòng)
shop_settings (
  id              int primary key default 1 check (id = 1),
  shop_name       text, address text, phone text,
  bank_bin        text, bank_name text,
  account_no      text, account_name text,
  footer_text     text
);
```

### 8.2. Quy tắc nghiệp vụ & kỹ thuật

1. **Tiền là số nguyên VND** – không dùng float.
2. **Thời gian lấy từ server**, không tin giờ máy client. `business_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date`.
3. **Tạo bill bằng 1 hàm DB (RPC) `create_bill`** chạy trong 1 transaction:
   - Nhận `id` (uuid client sinh), danh sách `{product_id, qty}`, phương thức, `cash_received`.
   - **Server tự lấy giá từ `products`** và tính lại tổng (không tin tổng từ client).
   - Sinh `code` = `DDMMYY-NNN`, NNN tăng dần theo `business_date`, không trùng khi nhiều máy bấm cùng lúc (dùng bảng đếm theo ngày + `SELECT … FOR UPDATE`, hoặc advisory lock).
   - Kiểm tra `cash_received >= total` nếu có.
   - Nếu `id` đã tồn tại → trả về bill cũ (idempotent, chống bấm 2 lần / gửi lại khi mạng chập chờn).
4. **Không xoá** bill / thu chi – chỉ chuyển trạng thái `void`.
5. Mọi thống kê **chỉ tính** bill `status='paid'` và thu chi `status='active'`.
6. **RLS (Row Level Security)** bật cho mọi bảng: chỉ người dùng đã đăng nhập được đọc/ghi.
7. **Realtime**: subscribe `bills` và `cash_entries` để các màn hình Doanh thu hôm nay / Tổng kết ngày tự cập nhật.

---

## 9. Lộ trình triển khai

| GĐ | Nội dung | Ước lượng |
|---|---|---|
| 0 | Nhận menu thật, thông tin tiệm, tài khoản ngân hàng, chốt khổ bill | 0,5 ngày |
| 1 | Khởi tạo React + Vite + TS, 2 project Supabase (dev/prod), migration DB, RLS, đăng nhập, seed menu, deploy Vercel, job backup + keep-alive (GitHub Actions) | 1–1,5 ngày |
| 2 | Màn hình Bán hàng responsive (cột loại, lưới món, tìm kiếm không dấu, `−`/`+`, giỏ hàng, hamburger) | 1,5 ngày |
| 3 | Thanh toán (tiền mặt + tiền thối, chuyển khoản) + RPC `create_bill` | 1 ngày |
| 4 | Bill in / PDF + VietQR + in lại | 1 ngày |
| 5 | Thu chi, Doanh thu hôm nay (realtime), Lịch sử bill, Huỷ bill | 1 ngày |
| 6 | Tổng kết ngày, Quản lý menu, Cài đặt | 1 ngày |
| 7 | Chạy thử tại tiệm, sửa lỗi, hướng dẫn sử dụng | 1 ngày |
| | **Tổng** | **~8 ngày** |

**Ngoài phạm vi bản đầu (để sau):** bán khi mất mạng (offline queue), báo cáo tuần/tháng + xuất Excel, size/topping, tồn kho, in trực tiếp ESC/POS không qua hộp thoại in.

---

## 10. Tiêu chí nghiệm thu (test)

**Bán hàng**
- [ ] Bấm loại món → lưới đổi đúng món của loại đó.
- [ ] Bấm món lần đầu → SL = 1; `+` → 2; `−` từ 1 → món biến khỏi đơn.
- [ ] Tổng tiền luôn đúng khi thêm/bớt/xoá nhiều món.
- [ ] Tìm `ca phe muoi`, `CA PHE`, `matcha` ra đúng món, trên mọi loại.
- [ ] Hiển thị tốt ở 360px, 768px, 1366px; không tràn ngang.
- [ ] Trên điện thoại: thanh đơn hiện tại nằm ngang full chiều rộng ở đáy, luôn thấy tổng tiền; chạm mở được danh sách món; không che món cuối của lưới.

**Thanh toán**
- [ ] Tiền mặt không nhập tiền khách → lưu được, bill không có dòng tiền thối.
- [ ] Nhập 100.000 cho đơn 88.000 → tiền thối 12.000; nhập 50.000 → báo thiếu, không cho xác nhận.
- [ ] Bấm Thanh toán liên tục nhiều lần → chỉ tạo **1** bill.
- [ ] Ngắt mạng khi thanh toán → báo lỗi, giỏ hàng còn nguyên; có mạng bấm lại → 1 bill.
- [ ] 2 máy thanh toán cùng lúc → mã bill không trùng, tăng liên tục.

**Bill & QR**
- [ ] Bill tiền mặt / chuyển khoản đủ thông tin như mục 6.2.
- [ ] QR quét bằng ≥ 2 app ngân hàng: đúng chủ TK, số tiền, nội dung = mã bill.
- [ ] Lưu PDF được trên Chrome máy tính, Chrome Android, Safari iOS.
- [ ] In lại bill đã huỷ có chữ “ĐÃ HUỶ”.

**Ngày & thống kê**
- [ ] Bill lúc 23:59 thuộc hôm nay; bill lúc 00:01 thuộc ngày mới.
- [ ] Đổi giá món → bill cũ giữ nguyên giá cũ.
- [ ] Huỷ bill → doanh thu, món bán, tiền mặt ròng giảm tương ứng; bill vẫn hiện trong lịch sử.
- [ ] Bill mới ở máy A hiện trên màn hình Doanh thu của máy B trong vài giây, không cần tải lại.
- [ ] Tổng kết ngày: Doanh thu = TM + CK; Tiền mặt ròng = TM + Thu − Chi; chênh lệch két tính đúng.

**Hạ tầng**
- [ ] F5 ở mọi trang trên bản deploy Vercel không bị 404.
- [ ] Job backup chạy hằng ngày, có file backup mới; đã thử khôi phục 1 lần vào project dev thành công.
- [ ] Frontend không chứa `service_role` key; truy cập API khi chưa đăng nhập bị RLS chặn.

---

## 11. Việc cần chủ tiệm cung cấp / chốt

- [ ] **Menu thật**: tên món, giá, loại (Cà phê / Matcha / Tea / Soda / Cake).
- [ ] **Tài khoản nhận chuyển khoản**: ngân hàng, số tài khoản, tên chủ tài khoản.
- [ ] **Thông tin in trên bill**: tên tiệm, địa chỉ, số điện thoại, lời chào cuối bill.
- [ ] **Khổ bill**: 80mm (đề xuất) hay A5/A4.
- [ ] **Loại món trên điện thoại**: tab ngang (đề xuất) hay cột trái thu hẹp.
- [ ] Email dùng làm tài khoản đăng nhập chung của tiệm.
- [ ] Gói Vercel: **Pro** (đúng điều khoản cho mục đích kinh doanh) hay chuyển sang **Cloudflare Pages** miễn phí (mục 2.3).