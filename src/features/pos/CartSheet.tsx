import React, { useState } from 'react';
import { useCartStore } from '../../stores/cart';
import { formatVND } from '../../lib/money';
import { X, Trash2, Plus, Minus, AlertCircle } from 'lucide-react';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export const CartSheet: React.FC<CartSheetProps> = ({ isOpen, onClose, onCheckout }) => {
  const { items, addItem, removeItem, deleteItem, clearCart, getTotalAmount, getTotalCount } =
    useCartStore();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const total = getTotalAmount();
  const totalCount = getTotalCount();

  return (
    <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Grab bar */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Sheet Header */}
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-stone-900 text-lg">Đơn hiện tại</h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {totalCount} món
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.map(({ product, qty }) => (
            <div
              key={product.id}
              className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-bold text-stone-900 text-sm truncate">
                  {product.name}
                </h4>
                <div className="text-xs text-stone-500 mt-0.5">
                  {formatVND(product.price)} · <span className="font-bold text-amber-800">{formatVND(product.price * qty)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-white rounded-xl border border-stone-300 p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-700 active:bg-stone-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-stone-900 text-sm px-2.5 min-w-[28px] text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => addItem(product)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => deleteItem(product.id)}
                  className="p-2 text-stone-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Confirm Clear prompt */}
          {showConfirmClear && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Xác nhận xóa hết đơn?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2 py-1 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    setShowConfirmClear(false);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 rounded-lg"
                >
                  Xóa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-stone-600 font-semibold text-sm">Tổng cộng</span>
            <span className="text-2xl font-black text-amber-700">
              {formatVND(total)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmClear(true)}
              className="col-span-1 py-3 px-2 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-100 text-xs"
            >
              Xóa hết
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="col-span-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm shadow-md"
            >
              THANH TOÁN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

