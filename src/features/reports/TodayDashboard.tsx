import React, { useState, useEffect } from 'react';
import { BillWithItems, CashEntry, ShopSettings } from '../../types/database';
import { api } from '../../lib/api';
import { formatVND } from '../../lib/money';
import { getVietnamBusinessDate, formatVietnamTime } from '../../lib/date';
import { BillDetailModal } from '../bills/BillDetailModal';
import {
  TrendingUp,
  Banknote,
  QrCode,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  ChevronRight,
  Coffee,
} from 'lucide-react';

interface TodayDashboardProps {
  settings: ShopSettings;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({ settings }) => {
  const today = getVietnamBusinessDate();
  const [bills, setBills] = useState<BillWithItems[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillWithItems | null>(null);

  const fetchData = async () => {
    try {
      const [fetchedBills, fetchedCash] = await Promise.all([
        api.getBills(today),
        api.getCashEntries(today),
      ]);
      setBills(fetchedBills);
      setCashEntries(fetchedCash);
    } catch (err) {
      console.error('Error fetching today dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const unsub = api.subscribeRealtime(() => {
      fetchData();
    });
    return () => unsub();
  }, []);

  // Metrics calculation
  const validBills = bills.filter((b) => b.status === 'paid');
  const totalRevenue = validBills.reduce((sum, b) => sum + b.total, 0);

  const cashSales = validBills
    .filter((b) => b.payment_method === 'cash')
    .reduce((sum, b) => sum + b.total, 0);

  const transferSales = validBills
    .filter((b) => b.payment_method === 'transfer')
    .reduce((sum, b) => sum + b.total, 0);

  const activeCashEntries = cashEntries.filter((e) => e.status === 'active');
  const cashIn = activeCashEntries
    .filter((e) => e.type === 'in')
    .reduce((sum, e) => sum + e.amount, 0);

  const cashOut = activeCashEntries
    .filter((e) => e.type === 'out')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCash = cashSales + cashIn - cashOut;

  // Aggregate items sold
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
  const topItems = Object.values(itemsMap).sort((a, b) => b.qty - a.qty);

  // Combined timeline of bills and cash entries
  type TimelineItem =
    | { kind: 'bill'; data: BillWithItems; time: string }
    | { kind: 'cash'; data: CashEntry; time: string };

  const timeline: TimelineItem[] = [
    ...bills.map((b) => ({ kind: 'bill' as const, data: b, time: b.created_at })),
    ...cashEntries.map((c) => ({ kind: 'cash' as const, data: c, time: c.created_at })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-stone-900">Doanh thu hôm nay</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Realtime</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-6xl w-full mx-auto space-y-5">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Doanh thu */}
          <div className="col-span-2 md:col-span-1 p-4 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Tổng doanh thu
            </span>
            <span className="text-2xl font-black text-amber-700 block">
              {formatVND(totalRevenue)}
            </span>
            <span className="text-xs text-stone-400 font-medium">
              Từ {validBills.length} đơn hàng hợp lệ
            </span>
          </div>

          {/* Card 2: Tiền mặt vs Chuyển khoản */}
          <div className="p-4 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Kênh thanh toán
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-stone-600">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Tiền mặt:
                </span>
                <span className="font-bold text-stone-900">{formatVND(cashSales)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-stone-600">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" /> Chuyển khoản:
                </span>
                <span className="font-bold text-stone-900">{formatVND(transferSales)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Thu ngoài & Chi */}
          <div className="p-4 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Thu / Chi quỹ tiền mặt
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-700">Thu ngoài:</span>
                <span className="font-bold text-emerald-800">+{formatVND(cashIn)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-red-700">Chi tiền:</span>
                <span className="font-bold text-red-800">-{formatVND(cashOut)}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Tiền mặt ròng */}
          <div className="col-span-2 md:col-span-1 p-4 bg-amber-600 text-white rounded-3xl shadow-md shadow-amber-200 space-y-1">
            <span className="text-xs font-bold text-amber-100 uppercase tracking-wider block">
              Tiền mặt ròng (trong két)
            </span>
            <span className="text-2xl font-black block">{formatVND(netCash)}</span>
            <span className="text-[11px] text-amber-200 block">
              = Tiền mặt bán hàng + Thu − Chi
            </span>
          </div>
        </div>

        {/* Section 2: Split columns - Top items sold vs Activity timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Selling Products */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
                  Món bán được hôm nay
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-semibold">{topItems.length} món</span>
            </div>

            {topItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-400 text-center">
                <Coffee className="w-10 h-10 stroke-1 text-stone-300 mb-2" />
                <p className="text-sm font-medium text-stone-500">Chưa bán được món nào hôm nay</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 text-xs font-semibold">
                      <th className="pb-2">Tên món</th>
                      <th className="pb-2 text-center">SL</th>
                      <th className="pb-2 text-right">Doanh số</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {topItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="py-2.5 font-medium text-stone-900">{item.name}</td>
                        <td className="py-2.5 text-center font-bold text-amber-800">
                          {item.qty}
                        </td>
                        <td className="py-2.5 text-right font-bold text-stone-800">
                          {formatVND(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
                  Dòng thời gian hoạt động
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-semibold">Mới nhất ở trên</span>
            </div>

            {timeline.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-400 text-center">
                <Clock className="w-10 h-10 stroke-1 text-stone-300 mb-2" />
                <p className="text-sm font-medium text-stone-500">Chưa có giao dịch nào trong ngày</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {timeline.map((item) => {
                  if (item.kind === 'bill') {
                    const bill = item.data;
                    const isVoid = bill.status === 'void';
                    return (
                      <div
                        key={`bill-${bill.id}`}
                        onClick={() => setSelectedBill(bill)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isVoid
                            ? 'bg-red-50/50 border-red-200 opacity-70'
                            : 'bg-stone-50 border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isVoid ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 truncate">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono text-xs font-bold ${isVoid ? 'line-through' : 'text-stone-900'}`}>
                                {bill.code}
                              </span>
                              {isVoid && (
                                <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1.5 py-0.2 rounded">
                                  Đã huỷ
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-400">
                              {formatVietnamTime(bill.created_at)} · {bill.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-black ${isVoid ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                            {formatVND(bill.total)}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                        </div>
                      </div>
                    );
                  } else {
                    const cash = item.data;
                    const isVoid = cash.status === 'void';
                    const isOut = cash.type === 'out';
                    return (
                      <div
                        key={`cash-${cash.id}`}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isVoid
                            ? 'bg-stone-50 border-stone-200 opacity-60'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isOut ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            {isOut ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 truncate">
                            <span className={`text-xs font-bold block truncate ${isVoid ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                              {cash.note}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              {formatVietnamTime(cash.created_at)} · {isOut ? 'Khoản chi' : 'Khoản thu'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-sm font-black ${
                            isVoid
                              ? 'line-through text-stone-400'
                              : isOut
                              ? 'text-red-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isOut ? `-${formatVND(cash.amount)}` : `+${formatVND(cash.amount)}`}
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            )}
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

