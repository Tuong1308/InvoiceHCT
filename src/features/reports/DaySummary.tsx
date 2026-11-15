import React, { useState, useEffect, useMemo } from 'react';
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
  CalendarRange,
  CalendarDays,
} from 'lucide-react';

type PeriodMode = 'today' | 'single' | 'range' | 'month';

interface DaySummaryProps {
  settings: ShopSettings;
}

export const DaySummary: React.FC<DaySummaryProps> = ({ settings }) => {
  const todayStr = getVietnamBusinessDate();

  // Period Selection Mode
  const [mode, setMode] = useState<PeriodMode>('today');
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => todayStr.slice(0, 7)); // YYYY-MM

  // Data State
  const [bills, setBills] = useState<BillWithItems[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form for counted cash (for single day reconciliation)
  const [countedCashStr, setCountedCashStr] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<boolean>(false);

  // Calculate active date range based on mode
  const { activeStartDate, activeEndDate, periodLabel, isSingleDay } = useMemo(() => {
    if (mode === 'today') {
      return {
        activeStartDate: todayStr,
        activeEndDate: todayStr,
        periodLabel: `Hôm nay (${formatVietnamDate(todayStr)})`,
        isSingleDay: true,
      };
    }
    if (mode === 'single') {
      return {
        activeStartDate: singleDate,
        activeEndDate: singleDate,
        periodLabel: `Ngày ${formatVietnamDate(singleDate)}`,
        isSingleDay: true,
      };
    }
    if (mode === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const start = `${selectedMonth}-01`;
      const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      return {
        activeStartDate: start,
        activeEndDate: end,
        periodLabel: `Tháng ${month}/${year} (${formatVietnamDate(start)} - ${formatVietnamDate(end)})`,
        isSingleDay: false,
      };
    }
    // range mode
    const start = startDate <= endDate ? startDate : endDate;
    const end = startDate <= endDate ? endDate : startDate;
    return {
      activeStartDate: start,
      activeEndDate: end,
      periodLabel: `Từ ${formatVietnamDate(start)} đến ${formatVietnamDate(end)}`,
      isSingleDay: start === end,
    };
  }, [mode, todayStr, singleDate, startDate, endDate, selectedMonth]);

  // Fetch summary data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [b, c] = await Promise.all([
        api.getBills({ startDate: activeStartDate, endDate: activeEndDate }),
        api.getCashEntries({ startDate: activeStartDate, endDate: activeEndDate }),
      ]);
      setBills(b);
      setCashEntries(c);

      // Fetch day note if single day
      if (isSingleDay) {
        const dn = await api.getDayNote(activeStartDate);
        if (dn) {
          setCountedCashStr(dn.counted_cash ? formatVND(dn.counted_cash, false) : '');
          setClosingNote(dn.note || '');
        } else {
          setCountedCashStr('');
          setClosingNote('');
        }
      }
    } catch (err) {
      console.error('Error fetching day summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStartDate, activeEndDate, isSingleDay]);

  // Financial Calculations
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

  // Actual cash difference for single day
  const countedCash = countedCashStr ? parseVND(countedCashStr) : null;
  const discrepancy = countedCash !== null ? countedCash - netCash : null;

  // Items sold aggregated across selected period
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

  // Save Day Note (Reconciliation)
  const handleSaveDayNote = async () => {
    try {
      setIsSavingNote(true);
      await api.saveDayNote(activeStartDate, countedCash, closingNote.trim() || null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      fetchData();
    } catch (err) {
      alert('Lỗi khi lưu chốt két');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Export to Google Sheets & Excel CSV (Safe, No Formula Errors)
  const handleExportGoogleSheet = () => {
    // Escape cell values for CSV: sanitize leading '=', '+', '-', '@'
    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""').trim();
      // If starts with =, +, -, @, prepend ' to prevent Google Sheets from interpreting as a formula
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      return `"${str}"`;
    };

    const rows: string[][] = [
      [escapeCsv(`BÁO CÁO TỔNG KẾT BÁN HÀNG - ${periodLabel.toUpperCase()}`), '""', '""'],
      [escapeCsv('Tên tiệm:'), escapeCsv(settings.shop_name), '""'],
      [escapeCsv('Địa chỉ:'), escapeCsv(settings.address), '""'],
      [escapeCsv('Số điện thoại:'), escapeCsv(settings.phone), '""'],
      [escapeCsv('Thời gian xuất file:'), escapeCsv(formatVietnamDateTime(new Date().toISOString())), '""'],
      [],
      [escapeCsv('--- PHẦN 1: TỔNG QUAN DOANH THU & TIỀN MẶT ---'), '""', '""'],
      [escapeCsv('Chỉ tiêu'), escapeCsv('Số tiền (VND)'), escapeCsv('Ghi chú')],
      [escapeCsv('TỔNG DOANH THU'), escapeCsv(totalRevenue), escapeCsv('Bao gồm Tiền mặt và Chuyển khoản')],
      [escapeCsv('Tiền mặt bán hàng'), escapeCsv(cashSales), escapeCsv('Doanh thu từ đơn thanh toán tiền mặt')],
      [escapeCsv('Chuyển khoản ngân hàng'), escapeCsv(transferSales), escapeCsv('Doanh thu từ đơn chuyển khoản VietQR')],
      [escapeCsv('Tổng thu ngoài quỹ'), escapeCsv(totalIn), escapeCsv('Các khoản thu tiền mặt phát sinh')],
      [escapeCsv('Tổng chi quỹ'), escapeCsv(totalOut), escapeCsv('Các khoản chi tiền mặt (mua đá, phụ phí...)')],
      [escapeCsv('Tiền mặt ròng (trong két)'), escapeCsv(netCash), escapeCsv('Công thức: Tiền mặt bán hàng + Thu ngoài - Chi')],
    ];

    if (isSingleDay) {
      rows.push(
        [escapeCsv('Tiền đếm thực tế trong két'), escapeCsv(countedCash !== null ? countedCash : 'Chưa đếm'), escapeCsv('Số tiền thực tế kiểm đếm')],
        [escapeCsv('Chênh lệch kiểm két'), escapeCsv(discrepancy !== null ? discrepancy : '--'), escapeCsv(discrepancy === 0 ? 'Khớp 100%' : (discrepancy && discrepancy > 0 ? 'Thừa tiền' : 'Thiếu tiền'))],
        [escapeCsv('Ghi chú chốt két'), escapeCsv(closingNote || ''), '""']
      );
    }

    rows.push(
      [],
      [escapeCsv('--- PHẦN 2: THỐNG KÊ ĐƠN HÀNG ---'), '""', '""'],
      [escapeCsv('Chỉ tiêu'), escapeCsv('Số lượng đơn'), '""'],
      [escapeCsv('Đơn hàng hợp lệ (Đã thanh toán)'), escapeCsv(validBills.length), '""'],
      [escapeCsv('Đơn hàng đã huỷ'), escapeCsv(voidBills.length), '""'],
      [],
      [escapeCsv('--- PHẦN 3: BẢNG MÓN BÁN ĐƯỢC ---'), '""', '""', '""'],
      [escapeCsv('STT'), escapeCsv('Tên món'), escapeCsv('Số lượng bán'), escapeCsv('Tổng doanh thu món (VND)')],
      ...itemsSold.map((item, idx) => [
        escapeCsv(idx + 1),
        escapeCsv(item.name),
        escapeCsv(item.qty),
        escapeCsv(item.total),
      ]),
      [],
      [escapeCsv('--- PHẦN 4: DANH SÁCH CHI TIẾT TẤT CẢ HOÁ ĐƠN ---'), '""', '""', '""', '""', '""', '""', '""'],
      [
        escapeCsv('Mã bill'),
        escapeCsv('Ngày bán'),
        escapeCsv('Giờ tạo'),
        escapeCsv('Phương thức'),
        escapeCsv('Trạng thái'),
        escapeCsv('Tiền khách đưa (VND)'),
        escapeCsv('Tiền thối (VND)'),
        escapeCsv('Tổng tiền (VND)'),
      ],
      ...bills.map((b) => [
        escapeCsv(b.code),
        escapeCsv(formatVietnamDate(b.business_date)),
        escapeCsv(formatVietnamTime(b.created_at)),
        escapeCsv(b.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'),
        escapeCsv(b.status === 'void' ? 'ĐÃ HUỶ' : 'Hợp lệ'),
        escapeCsv(b.cash_received !== null ? b.cash_received : ''),
        escapeCsv(b.change_amount !== null ? b.change_amount : ''),
        escapeCsv(b.total),
      ]),
      [],
      [escapeCsv('--- PHẦN 5: DANH SÁCH THU CHI QUỸ TIỀN MẶT ---'), '""', '""', '""', '""', '""'],
      [
        escapeCsv('Loại phiếu'),
        escapeCsv('Ngày ghi'),
        escapeCsv('Giờ tạo'),
        escapeCsv('Nội dung ghi chú'),
        escapeCsv('Trạng thái'),
        escapeCsv('Số tiền (VND)'),
      ],
      ...cashEntries.map((c) => [
        escapeCsv(c.type === 'in' ? 'Thu ngoài' : 'Chi tiền'),
        escapeCsv(formatVietnamDate(c.business_date)),
        escapeCsv(formatVietnamTime(c.created_at)),
        escapeCsv(c.note),
        escapeCsv(c.status === 'void' ? 'ĐÃ HUỶ' : 'Hợp lệ'),
        escapeCsv(c.type === 'in' ? c.amount : -c.amount),
      ])
    );

    // UTF-8 BOM so Excel & Google Sheets display Vietnamese correctly without #ERROR!
    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedFilename = `Tong_Ket_${activeStartDate}_den_${activeEndDate}.csv`;
    link.setAttribute('download', sanitizedFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 5000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden">
      {/* Top Filter & Period Control Bar */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-stone-900 leading-tight">Tổng kết & Báo cáo</h2>
              <p className="text-xs text-stone-500">{periodLabel}</p>
            </div>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportGoogleSheet}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-200 transition-all cursor-pointer shrink-0"
            title="Tải file mở trực tiếp trên Google Sheets và Microsoft Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Google Sheets / Excel</span>
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
          <div className="inline-flex bg-stone-100 p-1 rounded-xl gap-1 text-xs font-bold text-stone-600">
            <button
              type="button"
              onClick={() => setMode('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'today' ? 'bg-white text-amber-700 shadow-sm' : 'hover:text-stone-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'single' ? 'bg-white text-amber-700 shadow-sm' : 'hover:text-stone-900'
              }`}
            >
              1 Ngày
            </button>
            <button
              type="button"
              onClick={() => setMode('range')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'range' ? 'bg-white text-amber-700 shadow-sm' : 'hover:text-stone-900'
              }`}
            >
              Nhiều ngày
            </button>
            <button
              type="button"
              onClick={() => setMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'month' ? 'bg-white text-amber-700 shadow-sm' : 'hover:text-stone-900'
              }`}
            >
              Theo tháng
            </button>
          </div>

          {/* Inputs for selected mode */}
          {mode === 'single' && (
            <div className="flex items-center gap-2 animate-in fade-in-50">
              <CalendarDays className="w-4 h-4 text-stone-400" />
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {mode === 'range' && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in-50">
              <CalendarRange className="w-4 h-4 text-stone-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500 font-medium">Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500 font-medium">Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {mode === 'month' && (
            <div className="flex items-center gap-2 animate-in fade-in-50">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span className="text-xs text-stone-500 font-medium">Chọn tháng:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Export Success Toast */}
      {exportNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <b>Đã tải file báo cáo thành công!</b> Bạn có thể mở trực tiếp bằng Microsoft Excel hoặc kéo thả vào Google Sheets/Drive để xem các cột số liệu rõ ràng.
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

      {/* Report Document Body */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl w-full mx-auto space-y-5">
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
          {/* Report Title */}
          <div className="text-center pb-4 border-b border-stone-200">
            <h1 className="text-xl font-black text-stone-900 uppercase">
              Báo cáo tổng kết doanh thu
            </h1>
            <p className="text-sm font-bold text-amber-700 mt-0.5">{periodLabel}</p>
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
              <span className="text-xs text-stone-500 font-semibold block">Tiền mặt ròng (trong két)</span>
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
              <span className="text-xs text-stone-500 font-semibold block">Thu ngoài / Chi quỹ</span>
              <span className="text-xl font-black text-stone-900 block mt-0.5">
                +{formatVND(totalIn, false)} / -{formatVND(totalOut, false)}
              </span>
              <span className="text-[11px] text-stone-400">
                {activeCashEntries.length} phiếu thu chi
              </span>
            </div>
          </div>

          {/* Cash Drawer Reconciliation (Only when 1 single day is selected) */}
          {isSingleDay && (
            <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
              <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-700" />
                <span>Kiểm két cuối ngày ({formatVietnamDate(activeStartDate)})</span>
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
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
          )}

          {/* Section: Items Sold Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-600" />
              <span>Bảng món bán được ({itemsSold.length})</span>
            </h3>

            {isLoading ? (
              <p className="text-xs text-stone-400">Đang tải dữ liệu...</p>
            ) : itemsSold.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Không có món nào bán được trong kỳ này</p>
            ) : (
              <div className="overflow-x-auto">
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
              </div>
            )}
          </div>

          {/* Section: Bills List */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Danh sách hoá đơn ({bills.length})</span>
            </h3>

            {isLoading ? (
              <p className="text-xs text-stone-400">Đang tải dữ liệu...</p>
            ) : bills.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Không có hoá đơn nào trong khoảng thời gian này</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-semibold">
                      <th className="py-1.5 text-left">Mã bill</th>
                      <th className="py-1.5 text-left">Ngày</th>
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
                        <td className="py-1.5 text-stone-500">{formatVietnamDate(b.business_date)}</td>
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

            {isLoading ? (
              <p className="text-xs text-stone-400">Đang tải dữ liệu...</p>
            ) : cashEntries.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Không có khoản thu chi nào trong kỳ này</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-semibold">
                      <th className="py-1.5 text-left">Loại</th>
                      <th className="py-1.5 text-left">Ngày</th>
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
                        <td className="py-1.5 text-stone-500">{formatVietnamDate(c.business_date)}</td>
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
