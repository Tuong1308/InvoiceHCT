import React, { useState, useEffect, useMemo } from 'react';
import { BillWithItems, CashEntry, ShopSettings, DayNote } from '../../types/database';
import { api } from '../../lib/api';
import { formatVND, parseVND } from '../../lib/money';
import {
  getVietnamBusinessDate,
  formatVietnamTime,
  formatVietnamDate,
} from '../../lib/date';
import { removeVietnameseTones } from '../../lib/search';
import { BillDetailModal } from '../bills/BillDetailModal';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Wallet,
  QrCode,
  Banknote,
  Search,
  ChevronRight,
  Coffee,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';

interface ModernDashboardProps {
  settings: ShopSettings;
  onNavigateToPos?: () => void;
  onNavigateToBills?: () => void;
  onNavigateToCash?: () => void;
  onNavigateToSummary?: () => void;
  onOpenDrawer?: () => void;
}

type PeriodFilter = 'today' | 'yesterday' | '7days' | '30days' | 'this_month';

export const ModernDashboard: React.FC<ModernDashboardProps> = ({
  settings,
  onNavigateToPos,
  onNavigateToBills,
  onNavigateToCash,
  onNavigateToSummary,
  onOpenDrawer,
}) => {
  const todayStr = getVietnamBusinessDate();

  // Period Selection
  const [period, setPeriod] = useState<PeriodFilter>('today');

  // Data State
  const [bills, setBills] = useState<BillWithItems[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [prevBills, setPrevBills] = useState<BillWithItems[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search filter for recent orders
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected bill for detail modal
  const [selectedBill, setSelectedBill] = useState<BillWithItems | null>(null);

  // Quick cash count state (drawer reconciliation)
  const [countedCashStr, setCountedCashStr] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [lastSavedNote, setLastSavedNote] = useState<DayNote | null>(null);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Compute active date range based on period
  const { startDate, endDate, prevStartDate, prevEndDate, periodLabel } = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    if (period === 'today') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return {
        startDate: todayStr,
        endDate: todayStr,
        prevStartDate: formatDate(yesterday),
        prevEndDate: formatDate(yesterday),
        periodLabel: `Hôm nay (${formatVietnamDate(todayStr)})`,
      };
    }

    if (period === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(today.getDate() - 2);
      const yStr = formatDate(yesterday);
      const dbStr = formatDate(dayBefore);
      return {
        startDate: yStr,
        endDate: yStr,
        prevStartDate: dbStr,
        prevEndDate: dbStr,
        periodLabel: `Hôm qua (${formatVietnamDate(yStr)})`,
      };
    }

    if (period === '7days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      const prevStart = new Date(today);
      prevStart.setDate(today.getDate() - 13);
      const prevEnd = new Date(today);
      prevEnd.setDate(today.getDate() - 7);
      return {
        startDate: formatDate(start),
        endDate: todayStr,
        prevStartDate: formatDate(prevStart),
        prevEndDate: formatDate(prevEnd),
        periodLabel: '7 ngày qua',
      };
    }

    if (period === '30days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      const prevStart = new Date(today);
      prevStart.setDate(today.getDate() - 59);
      const prevEnd = new Date(today);
      prevEnd.setDate(today.getDate() - 30);
      return {
        startDate: formatDate(start),
        endDate: todayStr,
        prevStartDate: formatDate(prevStart),
        prevEndDate: formatDate(prevEnd),
        periodLabel: '30 ngày qua',
      };
    }

    // this_month
    const y = today.getFullYear();
    const m = today.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const prevMonthFirst = new Date(y, m - 1, 1);
    const prevMonthLast = new Date(y, m, 0);
    return {
      startDate: formatDate(firstDay),
      endDate: formatDate(lastDay),
      prevStartDate: formatDate(prevMonthFirst),
      prevEndDate: formatDate(prevMonthLast),
      periodLabel: `Tháng ${m + 1}/${y}`,
    };
  }, [period, todayStr]);

  // Fetch Data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [b, c, pb, dn] = await Promise.all([
        api.getBills({ startDate, endDate }),
        api.getCashEntries({ startDate, endDate }),
        api.getBills({ startDate: prevStartDate, endDate: prevEndDate }),
        api.getDayNote(todayStr),
      ]);
      setBills(b);
      setCashEntries(c);
      setPrevBills(pb);
      setLastSavedNote(dn);
      // Requirement: Input always resets on reload/F5
      setCountedCashStr('');
      setClosingNote('');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Realtime subscription
  useEffect(() => {
    const unsub = api.subscribeRealtime(() => {
      fetchData();
    });
    return () => unsub();
  }, [startDate, endDate]);

  // Financial Calculations
  const validBills = bills.filter((b) => b.status === 'paid');
  const voidBills = bills.filter((b) => b.status === 'void');

  const totalRevenue = validBills.reduce((sum, b) => sum + b.total, 0);
  const cashSales = validBills
    .filter((b) => b.payment_method === 'cash')
    .reduce((sum, b) => sum + b.total, 0);
  const transferSales = validBills
    .filter((b) => b.payment_method === 'transfer')
    .reduce((sum, b) => sum + b.total, 0);

  // Cash In / Out
  const activeCashEntries = cashEntries.filter((e) => e.status === 'active');
  const totalIn = activeCashEntries
    .filter((e) => e.type === 'in')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOut = activeCashEntries
    .filter((e) => e.type === 'out')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCash = cashSales + totalIn - totalOut;

  // Average Order Value (AOV)
  const aov = validBills.length > 0 ? Math.round(totalRevenue / validBills.length) : 0;

  // Comparison vs previous period
  const prevValidBills = prevBills.filter((b) => b.status === 'paid');
  const prevRevenue = prevValidBills.reduce((sum, b) => sum + b.total, 0);
  const revenueGrowthPct =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0
      ? 100
      : 0;

  const prevOrderCount = prevValidBills.length;
  const orderGrowthPct =
    prevOrderCount > 0
      ? Math.round(((validBills.length - prevOrderCount) / prevOrderCount) * 100)
      : validBills.length > 0
      ? 100
      : 0;

  // Aggregated Items Sold (Top 5 Best Sellers)
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
  const topProducts = Object.values(itemsMap).sort((a, b) => b.qty - a.qty);
  const maxProductQty = topProducts.length > 0 ? topProducts[0].qty : 1;

  // Hourly Breakdown (from 06:00 to 22:00)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 to 22
    const data = hours.map((h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      revenue: 0,
      orders: 0,
    }));

    for (const bill of validBills) {
      const date = new Date(bill.created_at);
      // Vietnam timezone offset (UTC+7)
      const vnHour = (date.getUTCHours() + 7) % 24;
      const target = data.find((d) => d.hour === vnHour);
      if (target) {
        target.revenue += bill.total;
        target.orders += 1;
      }
    }
    return data;
  }, [validBills]);

  const maxHourlyRevenue = Math.max(...hourlyData.map((d) => d.revenue), 100000);

  // Payment Method Percentages for Donut Chart
  const cashPct = totalRevenue > 0 ? Math.round((cashSales / totalRevenue) * 100) : 0;
  const transferPct = totalRevenue > 0 ? 100 - cashPct : 0;

  // Filtered Recent Orders
  const filteredBills = useMemo(() => {
    let result = [...bills];
    if (searchQuery.trim()) {
      const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
      result = result.filter((b) => {
        const matchCode = b.code.toLowerCase().includes(q);
        const matchItem = b.items.some((i) =>
          removeVietnameseTones(i.name_snapshot.toLowerCase()).includes(q)
        );
        return matchCode || matchItem;
      });
    }
    return result.slice(0, 7); // Display top 7 recent orders
  }, [bills, searchQuery]);

  // Drawer Reconciliation calculation
  const countedCash = countedCashStr ? parseVND(countedCashStr) : null;
  const discrepancy = countedCash !== null ? countedCash - netCash : null;

  const handleSaveDayNote = async () => {
    if (countedCash === null) {
      alert('Vui lòng nhập số tiền đếm thực tế trong két');
      return;
    }
    try {
      setIsSavingNote(true);
      const updated = await api.saveDayNote(todayStr, countedCash, closingNote.trim() || null);
      setLastSavedNote(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Lỗi khi lưu chốt két');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          {onOpenDrawer && (
            <button
              onClick={onOpenDrawer}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Mở menu"
            >
              <ShoppingBag className="w-5 h-5 text-amber-600" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Tổng quan hoạt động
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Cloud
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {settings.shop_name} · {periodLabel}
            </p>
          </div>
        </div>

        {/* Period Selector & Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setPeriod('yesterday')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'yesterday' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Hôm qua
            </button>
            <button
              type="button"
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'this_month' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Tháng này
            </button>
          </div>

          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {onNavigateToPos && (
            <button
              type="button"
              onClick={onNavigateToPos}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-amber-200 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>+ Bán hàng ngay</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-[1500px] w-full mx-auto">
        {/* ROW 1: 4 KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Doanh thu */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Tổng doanh thu</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatVND(totalRevenue)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <div className="text-slate-500 truncate">
                TM: <strong className="text-slate-700">{formatVND(cashSales, false)}</strong> · CK:{' '}
                <strong className="text-slate-700">{formatVND(transferSales, false)}</strong>
              </div>
              <div
                className={`flex items-center font-bold gap-0.5 ${
                  revenueGrowthPct >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {revenueGrowthPct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{revenueGrowthPct >= 0 ? `+${revenueGrowthPct}%` : `${revenueGrowthPct}%`}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Tiền mặt ròng trong két */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Tiền mặt ròng (Két)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              {formatVND(netCash)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 truncate">
                Bán + Thu ({formatVND(totalIn, false)}) − Chi ({formatVND(totalOut, false)})
              </span>
              {onNavigateToCash ? (
                <button
                  type="button"
                  onClick={onNavigateToCash}
                  className="font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md text-[11px] cursor-pointer transition-colors"
                >
                  Sổ quỹ →
                </button>
              ) : (
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                  Két an toàn
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Số đơn hàng */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Số đơn hoàn thành</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {validBills.length}{' '}
              <span className="text-sm font-semibold text-slate-500">đơn</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {voidBills.length > 0 ? (
                  <span className="text-red-600 font-semibold">{voidBills.length} đơn đã huỷ</span>
                ) : (
                  '0 đơn huỷ'
                )}
              </span>
              <div
                className={`flex items-center font-bold gap-0.5 ${
                  orderGrowthPct >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {orderGrowthPct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{orderGrowthPct >= 0 ? `+${orderGrowthPct}%` : `${orderGrowthPct}%`}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Giá trị trung bình đơn (AOV) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Giá trị TB / Đơn (AOV)</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatVND(aov)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
              <span>{topProducts.length} món khác nhau</span>
              <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[11px]">
                {validBills.length > 0
                  ? `~${Math.round(
                      validBills.reduce(
                        (sum, b) => sum + b.items.reduce((s, i) => s + i.qty, 0),
                        0
                      ) / validBills.length
                    )} món/đơn`
                  : '0 món'}
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2: CHARTS (2/3 Area/Bar Chart + 1/3 Donut Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Chart (2/3): Doanh thu & Đơn theo khung giờ */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>Doanh thu theo khung giờ bán hàng</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thống kê doanh số theo giờ thực tế trong ngày (06:00 - 22:00)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500" />
                  <span className="text-slate-600 font-medium">Doanh thu (VND)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-600 font-medium">Số đơn</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG Chart */}
            <div className="w-full h-56 pt-2">
              <div className="h-full w-full flex items-end gap-1.5 sm:gap-2">
                {hourlyData.map((d) => {
                  const heightPct = Math.round((d.revenue / maxHourlyRevenue) * 100);
                  const isPeak = d.revenue > 0 && d.revenue === maxHourlyRevenue;
                  return (
                    <div
                      key={d.hour}
                      className="flex-1 h-full flex flex-col items-center justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-20 bg-slate-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg transition-opacity flex flex-col items-center">
                        <span>
                          {d.label}: {formatVND(d.revenue)}
                        </span>
                        <span className="text-slate-400 font-medium text-[10px]">
                          {d.orders} đơn hàng
                        </span>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-0.5" />
                      </div>

                      {/* Bar Container */}
                      <div className="w-full bg-slate-50 rounded-t-md h-full flex items-end justify-center overflow-hidden">
                        <div
                          style={{ height: `${Math.max(heightPct, d.revenue > 0 ? 8 : 2)}%` }}
                          className={`w-full transition-all duration-300 rounded-t-sm ${
                            isPeak
                              ? 'bg-amber-600'
                              : d.revenue > 0
                              ? 'bg-amber-400/80 group-hover:bg-amber-500'
                              : 'bg-slate-200/50'
                          }`}
                        />
                      </div>

                      {/* Order Count Dot */}
                      {d.orders > 0 && (
                        <span className="absolute bottom-[calc(100%-8px)] text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded-full">
                          {d.orders}
                        </span>
                      )}

                      {/* X-axis Label (Only show every 2 hours on mobile, all on desktop) */}
                      <span className="text-[10px] text-slate-400 font-medium mt-2">
                        {d.hour % 2 === 0 ? `${d.hour}h` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Chart (1/3): Donut Chart Phương thức thanh toán */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Phương thức thanh toán</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Tỷ lệ tiền mặt vs VietQR</p>
            </div>

            {/* SVG Donut */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                  />
                  {/* Cash Slice (Emerald) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray={`${(cashPct * 251.2) / 100} 251.2`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  {/* Transfer Slice (Blue) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#2563EB"
                    strokeWidth="14"
                    strokeDasharray={`${(transferPct * 251.2) / 100} 251.2`}
                    strokeDashoffset={`${-((cashPct * 251.2) / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>

                {/* Center Label */}
                <div className="absolute text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng</span>
                  <span className="text-sm font-black text-slate-900 block">
                    {formatVND(totalRevenue, false)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">VND</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 font-medium">Tiền mặt ({cashPct}%)</span>
                </div>
                <strong className="text-slate-900">{formatVND(cashSales)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-slate-700 font-medium">VietQR ({transferPct}%)</span>
                </div>
                <strong className="text-slate-900">{formatVND(transferSales)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: RECENT ORDERS (65%) + SIDE PANELS (35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Orders Table (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header with Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>Đơn hàng gần đây ({filteredBills.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Bấm vào đơn để xem chi tiết hoặc in lại</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm mã đơn hoặc món..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Table */}
              {filteredBills.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">
                    Chưa có đơn hàng nào trong khoảng thời gian này
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                        <th className="pb-2.5 font-bold">Mã đơn</th>
                        <th className="pb-2.5">Thời gian</th>
                        <th className="pb-2.5">Chi tiết món</th>
                        <th className="pb-2.5 text-center">Thanh toán</th>
                        <th className="pb-2.5 text-right">Tổng tiền</th>
                        <th className="pb-2.5 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBills.map((bill) => {
                        const isVoid = bill.status === 'void';
                        const itemCount = bill.items.reduce((s, i) => s + i.qty, 0);
                        const itemsSummary = bill.items
                          .map((i) => `${i.qty} ${i.name_snapshot}`)
                          .join(', ');

                        return (
                          <tr
                            key={bill.id}
                            onClick={() => setSelectedBill(bill)}
                            className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                          >
                            <td className="py-3 font-mono font-bold text-slate-900">
                              {bill.code}
                            </td>
                            <td className="py-3 text-slate-500 text-xs">
                              {formatVietnamTime(bill.created_at)}
                            </td>
                            <td className="py-3 max-w-[200px] truncate text-slate-700">
                              <span className="font-medium">{itemsSummary}</span>
                              <span className="text-[11px] text-slate-400 block">
                                ({itemCount} món)
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  bill.payment_method === 'cash'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {bill.payment_method === 'cash' ? (
                                  <>
                                    <Banknote className="w-3 h-3" /> TM
                                  </>
                                ) : (
                                  <>
                                    <QrCode className="w-3 h-3" /> QR
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 text-right font-black text-slate-900">
                              {formatVND(bill.total)}
                            </td>
                            <td className="py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  isVoid
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isVoid ? 'Đã huỷ' : 'Hoàn thành'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Link */}
            {onNavigateToBills && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={onNavigateToBills}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem toàn bộ lịch sử bill</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Side Panels (1 Col: Top Selling & Quick Drawer Count) */}
          <div className="space-y-5">
            {/* Top 5 Products */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  <span>Món bán chạy nhất</span>
                </h3>
                <span className="text-xs text-slate-400 font-semibold">{topProducts.length} món</span>
              </div>

              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Chưa có dữ liệu món bán</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((item, idx) => {
                    const widthPct = Math.round((item.qty / maxProductQty) * 100);
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-100 text-amber-900 font-bold'
                                  : idx === 1
                                  ? 'bg-slate-200 text-slate-800'
                                  : idx === 2
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 truncate">{item.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <strong className="text-slate-900">{item.qty}</strong>{' '}
                            <span className="text-slate-400 text-[11px]">ly</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            style={{ width: `${widthPct}%` }}
                            className={`h-full rounded-full ${
                              idx === 0 ? 'bg-amber-600' : 'bg-amber-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Drawer Reconciliation Card */}
            <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-amber-900 text-sm flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-amber-700" />
                  <span>Kiểm két & Chốt ca</span>
                </h3>
                {lastSavedNote && lastSavedNote.counted_cash !== null && (
                  <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                    Đã lưu: {formatVND(lastSavedNote.counted_cash, false)}
                  </span>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Tiền mặt theo hệ thống:</span>
                  <strong className="text-slate-900">{formatVND(netCash)}</strong>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tiền đếm thực tế trong két:
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
                    className="w-full px-3 py-1.5 bg-slate-50 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-600">Chênh lệch:</span>
                  <span
                    className={`font-bold ${
                      discrepancy === null
                        ? 'text-slate-400'
                        : discrepancy === 0
                        ? 'text-emerald-700'
                        : discrepancy > 0
                        ? 'text-blue-700'
                        : 'text-red-700'
                    }`}
                  >
                    {discrepancy === null
                      ? '--'
                      : discrepancy === 0
                      ? 'Khớp 100%'
                      : discrepancy > 0
                      ? `Thừa +${formatVND(discrepancy)}`
                      : `Thiếu ${formatVND(Math.abs(discrepancy))}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingNote}
                  onClick={handleSaveDayNote}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveSuccess ? 'Đã lưu!' : 'Lưu chốt két'}</span>
                </button>

                {onNavigateToSummary && (
                  <button
                    type="button"
                    onClick={onNavigateToSummary}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Mở tổng kết & xuất file Google Sheets"
                  >
                    Báo cáo đầy đủ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Detail Modal */}
      <BillDetailModal
        bill={selectedBill}
        settings={settings}
        isOpen={Boolean(selectedBill)}
        onClose={() => setSelectedBill(null)}
        onBillUpdated={fetchData}
      />
    </div>
  );
};
