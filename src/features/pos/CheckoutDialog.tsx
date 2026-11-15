import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useCartStore } from '../../stores/cart';
import { api } from '../../lib/api';
import { formatVND, parseVND, calculateChange } from '../../lib/money';
import { buildVietQRString } from '../../lib/vietqr';
import { ShopSettings, PaymentMethod, BillWithItems } from '../../types/database';
import { X, Banknote, QrCode, Printer, Check, AlertCircle, Loader2 } from 'lucide-react';

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shopSettings: ShopSettings;
  onSuccess: (bill: BillWithItems, shouldPrint: boolean) => void;
}

export const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  isOpen,
  onClose,
  shopSettings,
  onSuccess,
}) => {
  const { items, getTotalAmount, clearCart } = useCartStore();
  const total = getTotalAmount();

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashReceivedStr, setCashReceivedStr] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client-generated unique UUID for idempotent bill creation
  const [billId, setBillId] = useState<string>(() => crypto.randomUUID());

  // Reset dialog state when opened
  useEffect(() => {
    if (isOpen) {
      setMethod('cash');
      setCashReceivedStr('');
      setErrorMessage(null);
      setIsSubmitting(false);
      setBillId(crypto.randomUUID());
    }
  }, [isOpen]);

  // Generate VietQR code when in transfer mode
  useEffect(() => {
    if (isOpen && method === 'transfer' && shopSettings.account_no && shopSettings.bank_bin) {
      const qrString = buildVietQRString({
        bin: shopSettings.bank_bin,
        accountNo: shopSettings.account_no,
        amount: total,
        memo: `POS ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }).replace(':', '')}`,
      });

      QRCode.toDataURL(qrString, {
        margin: 1,
        width: 250,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, method, shopSettings, total]);

  if (!isOpen) return null;

  const cashReceived = cashReceivedStr ? parseVND(cashReceivedStr) : null;
  const { change, isEnough, difference } = calculateChange(total, cashReceived);

  // Quick cash buttons logic
  const handleQuickCash = (amount: number) => {
    setCashReceivedStr(formatVND(amount, false));
    setErrorMessage(null);
  };

  const handleCashInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseVND(e.target.value);
    setCashReceivedStr(val > 0 ? formatVND(val, false) : '');
    setErrorMessage(null);
  };

  // Submit Handler
  const handleConfirm = async (shouldPrint: boolean) => {
    if (isSubmitting) return; // Prevent double-clicks

    // Validation
    if (method === 'cash' && cashReceived !== null && !isEnough) {
      setErrorMessage(`Khách đưa chưa đủ tiền (còn thiếu ${formatVND(Math.abs(difference))})`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        id: billId,
        payment_method: method,
        cash_received: cashReceived,
        items: items.map((i) => ({
          product_id: i.product.id,
          qty: i.qty,
        })),
      };

      const result = await api.createBill(payload);

      const billWithItems: BillWithItems = {
        ...result.bill,
        items: result.items,
      };

      clearCart();
      onSuccess(billWithItems, shouldPrint);
      onClose();
    } catch (err: any) {
      console.error('Failed to create bill:', err);
      setErrorMessage(err.message || 'Lỗi khi tạo hoá đơn. Vui lòng thử lại!');
      setIsSubmitting(false); // Enable retry
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 animate-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Thanh toán đơn hàng</h3>
            <p className="text-xs text-stone-500 mt-0.5">{items.length} món trong đơn</p>
          </div>
          <button
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-baseline justify-between">
          <span className="text-amber-900 font-semibold text-sm">Số tiền cần thanh toán</span>
          <span className="text-3xl font-black text-amber-700 tracking-tight">
            {formatVND(total)}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setMethod('cash');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                method === 'cash'
                  ? 'border-amber-600 bg-amber-600 text-white shadow-md shadow-amber-200'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span>Tiền mặt</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setMethod('transfer');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                method === 'transfer'
                  ? 'border-amber-600 bg-amber-600 text-white shadow-md shadow-amber-200'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>Chuyển khoản</span>
            </button>
          </div>

          {/* Cash Mode View */}
          {method === 'cash' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Cash Received Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Tiền khách đưa <span className="text-stone-400 font-normal lowercase">(không bắt buộc)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Nhập số tiền..."
                    value={cashReceivedStr}
                    onChange={handleCashInput}
                    disabled={isSubmitting}
                    className="w-full text-xl font-bold px-4 py-3 bg-stone-50 border-2 border-stone-200 rounded-2xl focus:bg-white focus:border-amber-500 focus:outline-none transition-colors text-stone-900"
                  />
                  {cashReceivedStr && (
                    <button
                      type="button"
                      onClick={() => setCashReceivedStr('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickCash(total)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-stone-200 transition-colors"
                >
                  Đủ tiền ({formatVND(total)})
                </button>
                {[50000, 100000, 200000, 500000].map((amt) => {
                  if (amt >= total) {
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickCash(amt)}
                        className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-200 transition-colors"
                      >
                        {formatVND(amt, false)}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Change Calculation Display */}
              {cashReceived !== null && cashReceived > 0 && (
                <div
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
                    isEnough
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <span className="font-semibold text-sm">
                    {isEnough ? 'Tiền thối lại cho khách' : 'Khách đưa chưa đủ'}
                  </span>
                  <span className="text-xl font-black">
                    {isEnough ? formatVND(change) : `Thiếu ${formatVND(Math.abs(difference))}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Transfer VietQR View */}
          {method === 'transfer' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                <div className="w-44 h-44 bg-white p-2 rounded-xl shadow-sm border border-stone-200 flex items-center justify-center shrink-0">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="VietQR" className="w-full h-full object-contain" />
                  ) : (
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                  )}
                </div>

                <div className="text-xs space-y-1.5 flex-1 min-w-0">
                  <div>
                    <span className="text-stone-400 block font-medium">Ngân hàng</span>
                    <span className="font-bold text-stone-900 text-sm">{shopSettings.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Số tài khoản</span>
                    <span className="font-bold text-stone-900 text-sm font-mono tracking-wider">
                      {shopSettings.account_no}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Chủ tài khoản</span>
                    <span className="font-bold text-stone-900 text-sm uppercase">
                      {shopSettings.account_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Số tiền</span>
                    <span className="font-black text-amber-700 text-base">
                      {formatVND(total)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-stone-500 text-center italic">
                Khách dùng ứng dụng ngân hàng bất kỳ để quét mã VietQR ở trên.
              </p>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-stone-200 bg-stone-50 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSubmitting || (method === 'cash' && cashReceived !== null && !isEnough)}
            onClick={() => handleConfirm(false)}
            className="py-3.5 px-4 rounded-2xl border-2 border-stone-300 font-bold text-stone-800 hover:bg-stone-100 active:bg-stone-200 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600" />
            )}
            <span>Thanh toán</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting || (method === 'cash' && cashReceived !== null && !isEnough)}
            onClick={() => handleConfirm(true)}
            className="py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Printer className="w-4 h-4 text-white" />
            )}
            <span>Thanh toán & In</span>
          </button>
        </div>
      </div>
    </div>
  );
};

