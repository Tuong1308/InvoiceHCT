import React, { useState, useEffect } from 'react';
import { BillWithItems, ShopSettings } from '../../types/database';
import { api } from '../../lib/api';
import { formatVND } from '../../lib/money';
import { getVietnamBusinessDate, formatVietnamTime } from '../../lib/date';
import { BillDetailModal } from './BillDetailModal';
import { Search, Calendar, Receipt, ChevronRight, Ban } from 'lucide-react';

interface BillHistoryProps {
  settings: ShopSettings;
}

export const BillHistory: React.FC<BillHistoryProps> = ({ settings }) => {
  const [date, setDate] = useState<string>(getVietnamBusinessDate());
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>('');

  const [bills, setBills] = useState<BillWithItems[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBill, setSelectedBill] = useState<BillWithItems | null>(null);

  const fetchBills = async () => {
    try {
      setIsLoading(true);
      const data = await api.getBills(date, filterMethod, filterStatus, searchCode);
      setBills(data);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [date, filterMethod, filterStatus, searchCode]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = api.subscribeRealtime(() => {
      fetchBills();
    });
    return () => unsubscribe();
  }, [date, filterMethod, filterStatus, searchCode]);

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden">
      {/* Top filter bar */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-stone-900">Lịch sử hoá đơn</h2>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search by code */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã bill (vd: 141126-001)..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Payment method filter */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-700 focus:outline-none focus:bg-white"
          >
            <option value="all">Phương thức: Tất cả</option>
            <option value="cash">Tiền mặt</option>
            <option value="transfer">Chuyển khoản</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-700 focus:outline-none focus:bg-white"
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="paid">Hợp lệ (Đã thanh toán)</option>
            <option value="void">Đã huỷ</option>
          </select>
        </div>
      </div>

      {/* Bill List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white animate-pulse rounded-2xl border border-stone-200" />
            ))}
          </div>
        ) : bills.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-center">
            <Receipt className="w-12 h-12 stroke-[1.2] text-stone-300 mb-2" />
            <p className="font-semibold text-stone-600">Không tìm thấy hoá đơn nào</p>
            <p className="text-xs text-stone-400 mt-1">Thử thay đổi bộ lọc hoặc ngày tìm kiếm</p>
          </div>
        ) : (
          bills.map((bill) => {
            const isVoid = bill.status === 'void';
            return (
              <div
                key={bill.id}
                onClick={() => setSelectedBill(bill)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 shadow-sm hover:shadow active:scale-[0.99] ${
                  isVoid
                    ? 'bg-red-50/50 border-red-200 opacity-80'
                    : 'bg-white border-stone-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isVoid ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isVoid ? <Ban className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-sm ${isVoid ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                        {bill.code}
                      </span>
                      {isVoid ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          Đã huỷ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {bill.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
                      <span>{formatVietnamTime(bill.created_at)}</span>
                      <span>·</span>
                      <span>{bill.items.length} món</span>
                      {isVoid && bill.void_reason && (
                        <span className="text-red-500 italic truncate max-w-[140px]">
                          ({bill.void_reason})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-base font-extrabold ${
                      isVoid ? 'text-stone-400 line-through' : 'text-amber-800'
                    }`}
                  >
                    {formatVND(bill.total)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bill Detail Modal */}
      <BillDetailModal
        bill={selectedBill}
        settings={settings}
        isOpen={Boolean(selectedBill)}
        onClose={() => setSelectedBill(null)}
        onBillUpdated={fetchBills}
      />
    </div>
  );
};

