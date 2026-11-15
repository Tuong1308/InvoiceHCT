import React, { useState } from 'react';
import { BillWithItems, ShopSettings } from '../../types/database';
import { BillPrint } from './BillPrint';
import { api } from '../../lib/api';
import { X, Printer, Ban, AlertCircle, Loader2 } from 'lucide-react';

interface BillDetailModalProps {
  bill: BillWithItems | null;
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
  onBillUpdated?: () => void;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  bill,
  settings,
  isOpen,
  onClose,
  onBillUpdated,
}) => {
  const [showVoidPrompt, setShowVoidPrompt] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      setErrorMsg('Vui lòng nhập lý do huỷ bill');
      return;
    }

    try {
      setIsVoiding(true);
      setErrorMsg(null);
      await api.voidBill(bill.id, voidReason);
      setShowVoidPrompt(false);
      if (onBillUpdated) onBillUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể huỷ bill');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-stone-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-base">Chi tiết hoá đơn</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable View Container */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-stone-200/50">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden w-full max-w-[340px]">
            <BillPrint bill={bill} settings={settings} />
          </div>
        </div>

        {/* Void confirmation banner */}
        {showVoidPrompt && (
          <div className="p-4 bg-red-50 border-t border-red-200 space-y-3">
            <div className="flex items-center gap-1.5 text-red-800 text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Xác nhận huỷ hoá đơn {bill.code}</span>
            </div>
            <input
              type="text"
              placeholder="Nhập lý do huỷ (bắt buộc, vd: khách đổi ý...)"
              value={voidReason}
              onChange={(e) => {
                setVoidReason(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full text-sm px-3.5 py-2.5 bg-white border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {errorMsg && <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isVoiding}
                onClick={() => setShowVoidPrompt(false)}
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold hover:bg-white"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleVoid}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {isVoiding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Huỷ bill này</span>
              </button>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-3">
          {bill.status === 'paid' && !showVoidPrompt ? (
            <button
              type="button"
              onClick={() => setShowVoidPrompt(true)}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-4 h-4" />
              <span>Huỷ bill</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all ml-auto"
          >
            <Printer className="w-4 h-4" />
            <span>In lại bill / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

