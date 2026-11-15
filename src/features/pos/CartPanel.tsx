import React, { useState } from 'react';
import { useCartStore } from '../../stores/cart';
import { formatVND } from '../../lib/money';
import { Trash2, Plus, Minus, ShoppingBag, AlertCircle } from 'lucide-react';

interface CartPanelProps {
  onCheckout: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({ onCheckout }) => {
  const { items, addItem, removeItem, deleteItem, clearCart, getTotalAmount, getTotalCount } =
    useCartStore();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const total = getTotalAmount();
  const totalCount = getTotalCount();
  const isEmpty = items.length === 0;

  return (
    <aside className="hidden lg:flex flex-col w-80 xl:w-96 bg-white border-l border-stone-200 shrink-0 select-none h-full justify-between shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-stone-900 text-base">ĐƠN HIỆN TẠI</h3>
        </div>
        {totalCount > 0 && (
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
            {totalCount} món
          </span>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center">
            <ShoppingBag className="w-12 h-12 stroke-[1.2] text-stone-300 mb-2" />
            <p className="font-medium text-stone-600">Đơn hàng trống</p>
            <p className="text-xs text-stone-400 mt-1">Chọn món ở danh sách bên trái để thêm vào đơn</p>
          </div>
        ) : (
          items.map(({ product, qty }) => (
            <div
              key={product.id}
              className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col gap-2 hover:border-amber-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-stone-900 text-sm leading-tight">
                  {product.name}
                </span>
                <button
                  type="button"
                  onClick={() => deleteItem(product.id)}
                  className="text-stone-400 hover:text-red-500 p-1 -mr-1 -mt-1 transition-colors"
                  title="Xoá món"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{formatVND(product.price)} / món</span>
                <span className="font-bold text-amber-900 text-sm">
                  {formatVND(product.price * qty)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-200/60">
                <div className="flex items-center bg-white rounded-lg border border-stone-300 p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-stone-100 text-stone-700 active:bg-stone-200 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-stone-900 text-sm px-3 min-w-[28px] text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => addItem(product)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog for Clearing Cart */}
      {showConfirmClear && (
        <div className="p-3 mx-3 mb-2 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Xóa toàn bộ đơn hàng?</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowConfirmClear(false)}
              className="px-2 py-1 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-100"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                clearCart();
                setShowConfirmClear(false);
              }}
              className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Xóa hết
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-600 font-medium text-sm">Tổng cộng</span>
          <span className="text-2xl font-black text-amber-700">
            {formatVND(total)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isEmpty}
            onClick={() => setShowConfirmClear(true)}
            className="col-span-1 py-3 px-3 rounded-xl border border-stone-300 font-semibold text-stone-700 hover:bg-stone-200 active:bg-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Xóa hết
          </button>
          <button
            type="button"
            disabled={isEmpty}
            onClick={onCheckout}
            className="col-span-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-base shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            THANH TOÁN
          </button>
        </div>
      </div>
    </aside>
  );
};

