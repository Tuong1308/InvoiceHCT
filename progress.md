# Báo Cáo Tiến Độ Dự Án (Progress Report)
## Web Bán Hàng (POS) – Tiệm Nước & Bánh
*Phiên bản: 1.0 – Cập nhật: 14/11/2026*  
*Người phụ trách: Tech Lead*

---

## 1. Tổng Quan Trạng Thái Hiện Tại
- **Trạng thái:** Toàn bộ mã nguồn đã hoàn thành và biên dịch thành công (`npm run build` không có lỗi, thư mục `dist/` đã tạo xong).
- **Trạng thái máy chủ & tiến trình:** Đang tạm dừng theo yêu cầu của chủ tiệm / quản lý, sẵn sàng kích hoạt bất kỳ lúc nào.

---

## 2. Chi Tiết Các Hạng Mục Đã Hoàn Thành (100%)

### 2.1. Cấu Trúc Dự Án & Hạ Tầng
- **Stack công nghệ đã chốt theo plan.md:**
  - Frontend: **ReactJS + TypeScript + Vite** (dạng SPA + PWA)
  - Styling: **Tailwind CSS + Lucide React**
  - Quản lý trạng thái: **Zustand + persist** (giữ giỏ hàng khi F5)
  - Database: **Supabase PostgreSQL** (Auth, Realtime, RPC PL/pgSQL)
  - Deployment: Đã tạo file `vercel.json` phục vụ deploy Vercel với cấu hình rewrite URL tránh lỗi 404.
- **Tập tin cấu hình & CI/CD:**
  - `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`
  - `vercel.json`: Cấu hình rewrite toàn bộ route về `index.html`.
  - `.github/workflows/backup.yml`: GitHub Actions tự động dump backup Postgres mỗi ngày lúc 3h sáng (giờ VN), giữ 30 bản sao lưu.
  - `.github/workflows/keep-alive.yml`: GitHub Actions ping CSDL hàng ngày tránh Supabase Free tier bị tạm dừng khi tiệm nghỉ lễ.

### 2.2. Cơ Sở Dữ Liệu PostgreSQL & RPCs (Supabase)
- **File migration:** `supabase/migrations/20261114_init_pos_schema.sql`
  - Bảng `categories`: Danh mục món (có sắp xếp `sort` và trạng thái `active`).
  - Bảng `products`: Món ăn/nước uống (giá tiền VND dạng số nguyên, liên kết danh mục).
  - Bảng `bill_counters`: Bộ đếm số thứ tự sinh mã bill theo ngày `DDMMYY-NNN`.
  - Bảng `bills`: Lưu hoá đơn, ngày kinh doanh `business_date` theo múi giờ `Asia/Ho_Chi_Minh`, trạng thái `paid`/`void`, tiền khách đưa, tiền thối.
  - Bảng `bill_items`: Lưu bản chụp (`name_snapshot`, `price_snapshot`) đảm bảo đổi giá sau này không làm sai lệch bill cũ.
  - Bảng `cash_entries`: Ghi nhận thu/chi tiền mặt ngoài bán hàng.
  - Bảng `day_notes`: Bảng kiểm két cuối ngày (tiền thực tế, ghi chú).
  - Bảng `shop_settings`: Cấu hình tiệm, thông tin tài khoản ngân hàng, lời chào cuối bill, khổ in.
- **Hàm RPC PL/pgSQL:**
  - `create_bill`: Xử lý giao dịch nguyên tử (atomic transaction), tự động lấy giá và tính tổng từ DB (chống gian lận client), kiểm tra tiền khách đưa, sinh mã bill tự tăng không trùng lặp, hỗ trợ cơ chế idempotent (trả về bill cũ nếu client gửi trùng id).
  - `void_bill`: Huỷ bill kèm lý do bắt buộc, cập nhật trạng thái `void`.
  - `void_cash_entry`: Huỷ khoản thu/chi quỹ tiền mặt kèm lý do bắt buộc.
- **Bảo mật RLS:** Đã bật Row Level Security cho 100% bảng.
- **Dữ liệu mẫu:** `supabase/seed.sql` đã tạo sẵn 5 danh mục chuẩn (`Cà phê`, `Matcha`, `Tea`, `Soda`, `Cake`) và 20 món bán chạy cùng cấu hình tiệm mặc định.

### 2.3. Lớp Xử Lý Dữ Liệu Thông Minh (Dual-Engine Data Layer)
- **File:** `src/lib/api.ts` & `src/lib/supabase.ts`
  - **Chế độ Cloud (Supabase):** Tự động kích hoạt khi có biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
  - **Chế độ Thử nghiệm / Offline (Local Storage):** Tự động hoạt động liền mạch khi chưa cấu hình Supabase. Tái hiện đầy đủ 100% logic của PostgreSQL RPC (sinh mã bill `DDMMYY-NNN`, snapshot giá, tính tiền thối) và dùng `BroadcastChannel` của trình duyệt để đồng bộ dữ liệu thời gian thực giữa các tab.

### 2.4. Các Tiện Ích Lõi (Core Utilities)
- `src/lib/vietqr.ts`: Sinh chuỗi thanh toán VietQR động chuẩn EMVCo (NAPAS) kèm thuật toán băm kiểm tra **CRC16-CCITT** (poly `0x1021`, init `0xFFFF`).
- `src/lib/search.ts`: Tìm kiếm tiếng Việt không dấu, không phân biệt hoa thường (`ca phe muoi` $\rightarrow$ `Cà phê muối`, tự động map `đ` $\leftrightarrow$ `d`).
- `src/lib/money.ts`: Định dạng tiền VND chuẩn (`88.000đ`), bóc tách chuỗi số, tính tiền thừa/thiếu.
- `src/lib/date.ts`: Xử lý múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7), định dạng ngày giờ, sinh tiền tố mã hoá đơn `DDMMYY`.
- `src/lib/banks.ts`: Danh mục các ngân hàng Việt Nam kèm mã BIN chính xác (Vietcombank, MB, Techcombank, ACB, VPBank, BIDV, TPBank...).

### 2.5. Giao Diện Người Dùng & Các Màn Hình Chức Năng
1. **Màn hình Bán hàng (POS) – `src/features/pos/`**:
   - **Bản Máy tính ($\ge$ 1024px):** 3 cột chuẩn gồm Danh mục bên trái, Lưới món co giãn ở giữa, Giỏ hàng bên phải.
   - **Bản Điện thoại (< 640px) & Tablet:** Thanh danh mục cuộn ngang, lưới món 2 cột, thanh đơn hàng ghim cố định ở đáy (`3 món · 88.000đ [THANH TOÁN]`), chạm mở Bottom Sheet tối đa 70% màn hình để chỉnh số lượng/xoá món, đã chừa khoảng đệm đáy tránh che món cuối.
   - **Thao tác nhanh trên ô món:** Bấm lần đầu thêm vào đơn (SL = 1); ô đã có trong đơn đổi viền nổi bật kèm cụm `[−] số lượng [+]` trực tiếp trên ô (vùng chạm $\ge$ 44px).
   - **Tìm kiếm:** Lọc tức thì trên toàn bộ menu khi đang gõ chữ.
2. **Hộp thoại Thanh toán – `CheckoutDialog.tsx`**:
   - Tiền mặt: Ô nhập tiền khách đưa kèm các nút bấm nhanh (Đủ tiền, 50k, 100k, 200k, 500k), tự tính tiền thối; hiển thị cảnh báo đỏ khi đưa thiếu tiền.
   - Chuyển khoản: Tự tạo và render mã VietQR động trực quan trên màn hình để khách quét bằng mọi app ngân hàng.
   - Cơ chế khóa nút ngay lập tức khi bấm thanh toán để chống tạo trùng bill.
3. **Mẫu In Hoá Đơn / Xuất PDF – `BillPrint.tsx`**:
   - Định dạng chuẩn khổ nhiệt **80mm** (hỗ trợ chuyển đổi A5/A4).
   - In rõ ràng tên tiệm, bill code, ngày giờ, danh sách món chụp giá thời điểm bán, tổng tiền.
   - Đơn chuyển khoản có in kèm mã QR VietQR.
   - Hoá đơn đã huỷ hiển thị watermark **"ĐÃ HỦY"** lớn chống gian lận.
4. **Màn hình Doanh thu hôm nay – `TodayDashboard.tsx`**:
   - Thống kê Realtime: Tổng doanh thu, Tiền mặt bán hàng, Chuyển khoản, Thu ngoài, Chi tiền, Tiền mặt ròng trong két.
   - Bảng xếp hạng món bán chạy nhất trong ngày.
   - Dòng thời gian gộp tất cả hoá đơn và phiếu thu chi mới nhất.
5. **Màn hình Thu chi tiền mặt – `CashManagement.tsx`**:
   - Ghi nhận phiếu Thu / Chi quỹ ngoài bán hàng với ghi chú bắt buộc (mua đá, thêm tiền lẻ...).
   - Hiển thị danh sách và tổng Thu / Chi trong ngày.
   - Huỷ khoản thu chi ghi sai kèm lý do (không xoá cứng khỏi CSDL).
6. **Màn hình Lịch sử bill – `BillHistory.tsx`**:
   - Xem theo ngày hoặc khoảng ngày, lọc theo phương thức (tiền mặt / chuyển khoản), trạng thái (hợp lệ / đã huỷ), tìm theo mã bill.
   - Bấm vào bill để xem chi tiết, in lại bill hoặc huỷ bill kèm lý do.
7. **Màn hình Tổng kết ngày – `DaySummary.tsx`**:
   - Báo cáo tổng hợp: Doanh thu = TM + CK; Tiền mặt ròng = TM + Thu − Chi.
   - Tính năng kiểm két cuối ngày: Nhập số tiền đếm thực tế $\rightarrow$ Hệ thống tự tính chênh lệch Thừa / Thiếu / Khớp 100% $\rightarrow$ Lưu chốt két.
   - Nút In / Lưu PDF báo cáo tổng kết ngày.
8. **Màn hình Quản lý menu – `MenuAdmin.tsx`**:
   - Thêm / sửa / ẩn loại món và thay đổi thứ tự hiển thị.
   - Thêm / sửa / ẩn món (tên, giá, loại, thứ tự).
   - Không xoá hẳn món đã từng bán để bảo toàn dữ liệu lịch sử.
9. **Màn hình Cài đặt – `ShopSettingsPage.tsx`**:
   - Cài đặt tên tiệm, địa chỉ, số điện thoại, lời chào chân bill.
   - Chọn ngân hàng (tự động điền mã BIN), STK, tên chủ tài khoản.
   - Tuỳ chọn khổ giấy in: 80mm / A5 / A4.
   - Hiển thị trực quan trạng thái kết nối CSDL Supabase.
10. **Màn hình Đăng nhập – `LoginPage.tsx`**:
   - Giao diện đăng nhập dùng tài khoản chung của tiệm, ghi nhớ phiên làm việc trên từng thiết bị.

---

## 3. Trạng Thái Biên Dịch & Kiểm Thử
- Lệnh biên dịch kiểm tra: `npm run build`
  - Kết quả: **Thành công 100% (Build time: ~59s, Exit Code 0)**.
  - Không còn bất kỳ lỗi nào về cú pháp, kiểu dữ liệu TypeScript hay đóng gói Vite.
- File kiểm thử tự động: `tests/verify.ts` (kiểm tra thuật toán VietQR, CRC16, đổi tiền VND, bỏ dấu tiếng Việt và ngày giờ Việt Nam).

---

## 4. Các Bước Tiếp Theo Khi Tiếp Tục
Khi bạn yêu cầu làm tiếp, các bước sẵn sàng triển khai gồm:
1. Chạy `npm run dev` để xem trực tiếp ứng dụng trên trình duyệt (máy tính hoặc điện thoại).
2. Kết nối tới project Supabase của bạn bằng cách điền thông tin vào file `.env` (nếu muốn kích hoạt chế độ Cloud).
3. Đẩy code lên GitHub và kết nối Vercel để deploy production.

