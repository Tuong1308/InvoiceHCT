import React, { useState, useEffect } from 'react';
import { BillWithItems, CashEntry, ShopSettings } from '../../types/database';
import { api } from '../../lib/api';
import { formatVND, parseVND } from '../../lib/money';
import {
  getVietnamBusinessDate,
  formatVietnamTime,
  formatVietnamDate,
  formatVietnamDateTime,
} from '../../lib/date';
import {
  FileText,
  Calendar,
  Save,
  CheckCircle2,
  Receipt,
  Wallet,
  Coffee,
  FileSpreadsheet,
} from 'lucide-react';

interface DaySummaryProps {
  settings: ShopSettings;
}

export const DaySummary: React.FC<DaySummaryProps> = ({ settings }) => {
  const [date, setDate] = useState<string>(getVietnamBusinessDate());
  const [bills, setBills] = useState<BillWithItems[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);

  // Form for counted cash
  const [countedCashStr, setCountedCashStr] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [b, c, dn] = await Promise.all([
        api.getBills(date),
        api.getCashEntries(date),
        api.getDayNote(date),
      ]);
      setBills(b);
      setCashEntries(c);
      if (dn) {
        setCountedCashStr(dn.counted_cash ? formatVND(dn.counted_cash, false) : '');
        setClosingNote(dn.note || '');
      } else {
        setCountedCashStr('');
        setClosingNote('');
      }
    } catch (err) {
      console.error('Error fetching day summary:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  // Calculations
  const validBills = bills.filter((b) => b.status === 'paid');
  const voidBills = bills.filter((b) => b.status === 'void');

  const cashSales = validBills
    .filter((b) => b.payment_method === 'cash')
    .reduce((sum, b) => sum + b.total, 0);

  const transferSales = validBills
    .filter((b) => b.payment_method === 'transfer')
    .reduce((sum, b) => sum + b.total, 0);

  const totalRevenue = cashSales + transferSales;

  const activeCashEntries = cashEntries.filter((e) => e.status === 'active');
  const totalIn = activeCashEntries
    .filter((e) => e.type === 'in')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOut = activeCashEntries
    .filter((e) => e.type === 'out')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCash = cashSales + totalIn - totalOut;

  // Actual cash difference
  const countedCash = countedCashStr ? parseVND(countedCashStr) : null;
  const discrepancy = countedCash !== null ? countedCash - netCash : null;

  // Items sold
  const itemsMap: Record<string, { name: string; qty: number; total: number }> = {};
  for (const bill of validBills) {
    for (const item of bill.items) {
      if (!itemsMap[item.name_snapshot]) {
        itemsMap[item.name_snapshot] = { name: item.name_snapshot, qty: 0, total: 0 };
      }
      itemsMap[item.name_snapshot].qty += item.qty;
      itemsMap[item.name_snapshot].total += item.line_total;
    }
  }
  const itemsSold = Object.values(itemsMap).sort((a, b) => b.qty - a.qty);

  const handleSaveDayNote = async () => {
    try {
      setIsSavingNote(true);
      await api.saveDayNote(date, countedCash, closingNote.trim() || null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      fetchData();
    } catch (err) {
      alert('Lỗi khi lưu chốt két');
    } finally {
      setIsSavingNote(false);
    }
  };

  const [exportNotice, setExportNotice] = useState<boolean>(false);

  const handleExportGoogleSheet = () => {
    // Escape cell values for CSV
    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Format rows for Google Sheets / Excel
    const rows: string[][] = [
      [escapeCsv(`BÁO CÁO TỔNG KẾT BÁN HÀNG NGÀY ${formatVietnamDate(date)}`)],
      [escapeCsv('Tên tiệm:'), escapeCsv(settings.shop_name)],
      [escapeCsv('Địa chỉ:'), escapeCsv(settings.address)],
      [escapeCsv('Số điện thoại:'), escapeCsv(settings.phone)],
      [escapeCsv('Thời gian xuất file:'), escapeCsv(formatVietnamDateTime(new Date().toISOString()))],
      [],
      [escapeCsv('--- 1. TỔNG QUAN DOANH THU & TIỀN MẶT ---')],
      [escapeCsv('Chỉ tiêu'), escapeCsv('Số tiền (VND)'), escapeCsv('Ghi chú')],
      [escapeCsv('TỔNG DOANH THU HÔM NAY'), escapeCsv(totalRevenue), escapeCsv('Bao gồm cả Tiền mặt & Chuyển khoản')],
      [escapeCsv('+ Tiền mặt bán hàng'), escapeCsv(cashSales), escapeCsv('')],
      [escapeCsv('+ Chuyển khoản ngân hàng'), escapeCsv(transferSales), escapeCsv('')],
      [escapeCsv('+ Thu ngoài quỹ tiền mặt'), escapeCsv(totalIn), escapeCsv('Các khoản thu tiền mặt phát sinh')],
      [escapeCsv('- Chi quỹ tiền mặt'), escapeCsv(totalOut), escapeCsv('Các khoản chi tiền mặt (mua đá, phụ phí...)')],
      [escapeCsv('TIỀN MẶT RÒNG TRONG KÉT (LÝ THUYẾT)'), escapeCsv(netCash), escapeCsv('= Tiền mặt bán hàng + Thu ngoài - Chi')],
      [escapeCsv('Tiền đếm thực tế trong két'), escapeCsv(countedCash !== null ? countedCash : 'Chưa đếm'), escapeCsv('Số tiền nhân viên / chủ tiệm đếm')],
      [escapeCsv('Chênh lệch kiểm két'), escapeCsv(discrepancy !== null ? discrepancy : '--'), escapeCsv(discrepancy === 0 ? 'Khớp 100%' : (discrepancy && discrepancy > 0 ? 'Thừa tiền' : 'Thiếu tiền'))],
      [escapeCsv('Ghi chú chốt két'), escapeCsv(closingNote || ''), escapeCsv('')],
      [],
      [escapeCsv('--- 2. THỐNG KÊ ĐƠN HÀNG ---')],
      [escapeCsv('Trạng thái đơn'), escapeCsv('Số lượng đơn')],
      [escapeCsv('Đơn hàng hợp lệ (Đã thanh toán)'), escapeCsv(validBills.length)],
      [escapeCsv('Đơn hàng đã huỷ'), escapeCsv(voidBills.length)],
      [],
      [escapeCsv('--- 3. BẢNG MÓN BÁN ĐƯỢC TRONG NGÀY ---')],
      [escapeCsv('STT'), escapeCsv('Tên món'), escapeCsv('Số lượng bán'), escapeCsv('Tổng doanh thu món (VND)')],
      ...itemsSold.map((item, idx) => [
        escapeCsv(idx + 1),
        escapeCsv(item.name),
        escapeCsv(item.qty),
        escapeCsv(item.total),
      ]),
      [],
      [escapeCsv('--- 4. DANH SÁCH CHI TIẾT TẤT CẢ HOÁ ĐƠN ---')],
      [
        escapeCsv('Mã bill'),
        escapeCsv('Giờ tạo'),
        escapeCsv('Phương thức'),
        escapeCsv('Trạng thái'),
        escapeCsv('Tiền khách đưa (VND)'),
        escapeCsv('Tiền thối (VND)'),
        escapeCsv('Tổng tiền (VND)'),
        escapeCsv('Lý do huỷ (nếu có)'),
      ],
      ...bills.map((b) => [
        escapeCsv(b.code),
        escapeCsv(formatVietnamTime(b.created_at)),
        escapeCsv(b.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'),
        escapeCsv(b.status === 'void' ? 'ĐÃ HUỶ' : 'Hợp lệ'),
        escapeCsv(b.cash_received !== null ? b.cash_received : ''),
        escapeCsv(b.change_amount !== null ? b.change_amount : ''),
        escapeCsv(b.total),
        escapeCsv(b.void_reason || ''),
      ]),
      [],
      [escapeCsv('--- 5. DANH SÁCH THU CHI QUỸ TIỀN MẶT ---')],
      [
        escapeCsv('Loại phiếu'),
        escapeCsv('Giờ tạo'),
        escapeCsv('Nội dung ghi chú'),
        escapeCsv('Trạng thái'),
        escapeCsv('Số tiền (VND)'),
        escapeCsv('Lý do huỷ (nếu có)'),
      ],
      ...cashEntries.map((c) => [
        escapeCsv(c.type === 'in' ? 'Thu ngoài' : 'Chi tiền'),
        escapeCsv(formatVietnamTime(c.created_at)),
        escapeCsv(c.note),
        escapeCsv(c.status === 'void' ? 'ĐÃ HUỶ' : 'Hợp lệ'),
        escapeCsv(c.type === 'in' ? c.amount : -c.amount),
        escapeCsv(c.void_reason || ''),
      ]),
    ];

    // UTF-8 BOM so Excel & Google Sheets display Vietnamese correctly
    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tong_Ket_Ngay_${date}_${settings.shop_name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 5000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden">
      {/* Header bar */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-stone-900">Tổng kết ngày</h2>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-stone-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <button
            type="button"
            onClick={handleExportGoogleSheet}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-200 transition-all cursor-pointer"
            title="Tải file mở trực tiếp trên Google Sheets và Microsoft Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Google Sheets / Excel</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs text-emerald-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <b>Đã xuất file thành công!</b> Bạn có thể mở trực tiếp bằng Excel hoặc tải lên Google Drive / Google Sheets để xem và theo dõi.
            </span>
          </div>
          <button
            onClick={() => setExportNotice(false)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Printable Report Document */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto space-y-5 print:p-0 print:max-w-none">
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Report Title */}
          <div className="text-center pb-4 border-b border-stone-200">
            <h1 className="text-xl font-black text-stone-900 uppercase">
              Báo cáo tổng kết ngày {formatVietnamDate(date)}
            </h1>
            <p className="text-xs text-stone-500 mt-1">{settings.shop_name} · SĐT: {settings.phone}</p>
          </div>

          {/* Key Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-xs text-stone-500 font-semibold block">Tổng doanh thu</span>
              <span className="text-xl font-black text-amber-700 block mt-0.5">
                {formatVND(totalRevenue)}
              </span>
              <span className="text-[11px] text-stone-400">
                TM: {formatVND(cashSales, false)} | CK: {formatVND(transferSales, false)}
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-xs text-stone-500 font-semibold block">Tiền mặt ròng (két)</span>
              <span className="text-xl font-black text-stone-900 block mt-0.5">
                {formatVND(netCash)}
              </span>
              <span className="text-[11px] text-stone-400">
                Bán hàng + Thu − Chi
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-xs text-stone-500 font-semibold block">Số lượng đơn</span>
              <span className="text-xl font-black text-stone-900 block mt-0.5">
                {validBills.length} đơn
              </span>
              <span className="text-[11px] text-stone-400">
                {voidBills.length > 0 ? `(${voidBills.length} đơn đã huỷ)` : '0 đơn huỷ'}
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-xs text-stone-500 font-semibold block">Thu ngoài / Chi</span>
              <span className="text-xl font-black text-stone-900 block mt-0.5">
                +{formatVND(totalIn, false)} / -{formatVND(totalOut, false)}
              </span>
              <span className="text-[11px] text-stone-400">
                {activeCashEntries.length} phiếu thu chi
              </span>
            </div>
          </div>

          {/* Cash Drawer Reconciliation (Kiểm két cuối ngày) */}
          <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
            <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-700" />
              <span>Kiểm két cuối ngày</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Tiền mặt ròng theo hệ thống
                </label>
                <div className="px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl font-black text-base text-stone-900">
                  {formatVND(netCash)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Tiền đếm thực tế trong két
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số tiền đếm được..."
                  value={countedCashStr}
                  onChange={(e) => {
                    const parsed = parseVND(e.target.value);
                    setCountedCashStr(parsed > 0 ? formatVND(parsed, false) : '');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-bold text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Chênh lệch (Thực tế − Hệ thống)
                </label>
                <div
                  className={`px-3.5 py-2.5 rounded-xl font-black text-base border ${
                    discrepancy === null
                      ? 'bg-stone-100 text-stone-400 border-stone-200'
                      : discrepancy === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : discrepancy > 0
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}
                >
                  {discrepancy === null
                    ? '--'
                    : discrepancy === 0
                    ? 'Khớp 100%'
                    : discrepancy > 0
                    ? `Thừa +${formatVND(discrepancy)}`
                    : `Thiếu ${formatVND(Math.abs(discrepancy))}`}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                placeholder="Ghi chú chốt két (tuỳ chọn)..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none"
              />
              <button
                type="button"
                disabled={isSavingNote}
                onClick={handleSaveDayNote}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors print:hidden"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu chốt két</span>
              </button>
            </div>

            {savedSuccess && (
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu thông tin chốt két!
              </p>
            )}
          </div>

          {/* Section: Items Sold Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-600" />
              <span>Bảng món bán được ({itemsSold.length})</span>
            </h3>

            {itemsSold.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Không có món nào bán được</p>
            ) : (
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 text-xs font-semibold">
                    <th className="py-2 text-left">Tên món</th>
                    <th className="py-2 text-center">Số lượng</th>
                    <th className="py-2 text-right">Tổng thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {itemsSold.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium text-stone-900">{item.name}</td>
                      <td className="py-2 text-center font-bold text-amber-800">{item.qty}</td>
                      <td className="py-2 text-right font-bold text-stone-800">{formatVND(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section: Bills List */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Danh sách hoá đơn ({bills.length})</span>
            </h3>

            {bills.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Không có hoá đơn nào trong ngày</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-semibold">
                      <th className="py-1.5 text-left">Mã bill</th>
                      <th className="py-1.5 text-left">Giờ</th>
                      <th className="py-1.5 text-left">Phương thức</th>
                      <th className="py-1.5 text-left">Trạng thái</th>
                      <th className="py-1.5 text-right">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {bills.map((b) => (
                      <tr key={b.id} className={b.status === 'void' ? 'opacity-50 line-through' : ''}>
                        <td className="py-1.5 font-mono font-bold">{b.code}</td>
                        <td className="py-1.5 text-stone-500">{formatVietnamTime(b.created_at)}</td>
                        <td className="py-1.5">{b.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
                        <td className="py-1.5">
                          {b.status === 'void' ? (
                            <span className="text-red-600 font-bold">Đã huỷ</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Hợp lệ</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-bold">{formatVND(b.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Cash entries list */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-600" />
              <span>Danh sách thu chi quỹ ({cashEntries.length})</span>
            </h3>

            {cashEntries.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Không có khoản thu chi nào</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-semibold">
                      <th className="py-1.5 text-left">Loại</th>
                      <th className="py-1.5 text-left">Giờ</th>
                      <th className="py-1.5 text-left">Ghi chú</th>
                      <th className="py-1.5 text-left">Trạng thái</th>
                      <th className="py-1.5 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cashEntries.map((c) => (
                      <tr key={c.id} className={c.status === 'void' ? 'opacity-50 line-through' : ''}>
                        <td className="py-1.5 font-semibold">
                          {c.type === 'in' ? (
                            <span className="text-emerald-700">Thu ngoài</span>
                          ) : (
                            <span className="text-red-700">Chi tiền</span>
                          )}
                        </td>
                        <td className="py-1.5 text-stone-500">{formatVietnamTime(c.created_at)}</td>
                        <td className="py-1.5">{c.note}</td>
                        <td className="py-1.5">
                          {c.status === 'void' ? (
                            <span className="text-red-600 font-bold">Đã huỷ</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Hợp lệ</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-bold">
                          {c.type === 'in' ? `+${formatVND(c.amount)}` : `-${formatVND(c.amount)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

