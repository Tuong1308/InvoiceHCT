import React, { useState, useEffect } from 'react';
import { CashEntry, CashEntryType } from '../../types/database';
import { api } from '../../lib/api';
import { formatVND, parseVND } from '../../lib/money';
import { getVietnamBusinessDate, formatVietnamTime } from '../../lib/date';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Calendar,
  AlertCircle,
  Ban,
  Check,
  Loader2,
} from 'lucide-react';

export const CashManagement: React.FC = () => {
  const [date, setDate] = useState<string>(getVietnamBusinessDate());
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form State
  const [type, setType] = useState<CashEntryType>('out');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Void prompt modal
  const [voidingEntry, setVoidingEntry] = useState<CashEntry | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCashEntries(date);
      setEntries(data);
    } catch (err) {
      console.error('Error fetching cash entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [date]);

  // Realtime subscription
  useEffect(() => {
    const unsub = api.subscribeRealtime(() => {
      fetchEntries();
    });
    return () => unsub();
  }, [date]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseVND(amountStr);

    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }
    if (!note.trim()) {
      setErrorMsg('Ghi chú là bắt buộc (ví dụ: mua đá, bỏ thêm tiền thối...)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await api.createCashEntry({
        type,
        amount,
        note,
      });

      setAmountStr('');
      setNote('');
      setSuccessMsg('Đã ghi nhận khoản thu/chi thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchEntries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu khoản thu/chi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void submission
  const handleVoid = async () => {
    if (!voidingEntry) return;
    if (!voidReason.trim()) {
      alert('Vui lòng nhập lý do huỷ');
      return;
    }

    try {
      setIsVoiding(true);
      await api.voidCashEntry(voidingEntry.id, voidReason);
      setVoidingEntry(null);
      setVoidReason('');
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Không thể huỷ khoản thu chi');
    } finally {
      setIsVoiding(false);
    }
  };

  // Calculate totals
  const activeEntries = entries.filter((e) => e.status === 'active');
  const totalIn = activeEntries
    .filter((e) => e.type === 'in')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOut = activeEntries
    .filter((e) => e.type === 'out')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-stone-900">Thu chi tiền mặt</h2>
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

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto space-y-5">
        {/* Entry Creation Form */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
            Ghi nhận khoản mới
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('out')}
                className={`py-3 px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  type === 'out'
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <ArrowDownCircle className="w-5 h-5 text-red-600" />
                <span>Chi tiền (Chi)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('in')}
                className={`py-3 px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  type === 'in'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                <span>Thu ngoài (Thu)</span>
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Số tiền (VND) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ví dụ: 50.000"
                  value={amountStr}
                  onChange={(e) => {
                    const parsed = parseVND(e.target.value);
                    setAmountStr(parsed > 0 ? formatVND(parsed, false) : '');
                    setErrorMsg(null);
                  }}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Ghi chú *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mua đá lạnh, Mua chanh, Tiền lẻ..."
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Lưu khoản {type === 'out' ? 'Chi' : 'Thu'}</span>
            </button>
          </form>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
              Tổng Thu trong ngày
            </span>
            <span className="text-xl font-black text-emerald-900 mt-1 block">
              +{formatVND(totalIn)}
            </span>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800 block">
              Tổng Chi trong ngày
            </span>
            <span className="text-xl font-black text-red-900 mt-1 block">
              -{formatVND(totalOut)}
            </span>
          </div>
        </div>

        {/* Entries List */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider px-1">
            Danh sách thu chi ({entries.length})
          </h3>

          {isLoading ? (
            <div className="h-28 bg-white animate-pulse rounded-2xl border border-stone-200" />
          ) : entries.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center text-stone-400">
              <p className="font-medium text-stone-600">Chưa có khoản thu chi nào trong ngày này</p>
            </div>
          ) : (
            entries.map((entry) => {
              const isVoid = entry.status === 'void';
              const isOut = entry.type === 'out';
              return (
                <div
                  key={entry.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-sm ${
                    isVoid
                      ? 'bg-stone-50 border-stone-200 opacity-60'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isVoid
                          ? 'bg-stone-200 text-stone-500'
                          : isOut
                          ? 'bg-red-100 text-red-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {isOut ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isVoid ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                          {entry.note}
                        </span>
                        {isVoid && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            Đã huỷ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
                        <span>{formatVietnamTime(entry.created_at)}</span>
                        <span>·</span>
                        <span className="font-semibold text-stone-600">{isOut ? 'Khoản chi' : 'Khoản thu'}</span>
                        {isVoid && entry.void_reason && (
                          <span className="text-red-500 italic">({entry.void_reason})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-base font-black ${
                        isVoid
                          ? 'text-stone-400 line-through'
                          : isOut
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isOut ? `-${formatVND(entry.amount)}` : `+${formatVND(entry.amount)}`}
                    </span>

                    {!isVoid && (
                      <button
                        type="button"
                        onClick={() => setVoidingEntry(entry)}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        title="Huỷ khoản này"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Void Modal */}
      {voidingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setVoidingEntry(null)}
          />
          <div className="relative bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 z-50 shadow-2xl">
            <h4 className="font-bold text-stone-900 text-base">Huỷ khoản thu/chi</h4>
            <p className="text-xs text-stone-600">
              Bạn đang huỷ: <b>{voidingEntry.note}</b> ({formatVND(voidingEntry.amount)})
            </p>
            <input
              type="text"
              placeholder="Nhập lý do huỷ (bắt buộc)..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidingEntry(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-300"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleVoid}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-red-600 text-white"
              >
                {isVoiding ? 'Đang huỷ...' : 'Xác nhận huỷ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

