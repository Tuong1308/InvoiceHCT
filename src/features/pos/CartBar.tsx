import React from 'react';
import { useCartStore } from '../../stores/cart';
import { formatVND } from '../../lib/money';
import { ChevronUp, ShoppingBag } from 'lucide-react';

interface CartBarProps {
  onOpenSheet: () => void;
  onCheckout: () => void;
}

export const CartBar: React.FC<CartBarProps> = ({ onOpenSheet, onCheckout }) => {
  const { getTotalCount, getTotalAmount } = useCartStore();
  const totalCount = getTotalCount();
  const totalAmount = getTotalAmount();

  if (totalCount === 0) {
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur border-t border-stone-200 px-4 flex items-center justify-between text-stone-400 z-20">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShoppingBag className="w-4 h-4 text-stone-300" />
          <span>Chưa có món nào được chọn</span>
        </div>
        <button
          disabled
          className="px-4 py-2 rounded-lg bg-stone-200 text-stone-400 font-bold text-xs uppercase cursor-not-allowed"
        >
          Thanh toán
        </button>
      </div>
    );
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-stone-900 text-white border-t border-stone-800 px-3.5 flex items-center justify-between z-20 shadow-xl">
      {/* Clickable summary area to trigger bottom sheet */}
      <button
        type="button"
        onClick={onOpenSheet}
        className="flex items-center gap-2.5 text-left py-2 px-1 focus:outline-none flex-1 truncate"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold shadow-inner">
            {totalCount}
          </div>
        </div>

        <div className="flex flex-col truncate">
          <div className="flex items-center gap-1 text-xs text-stone-300">
            <span>{totalCount} món</span>
            <ChevronUp className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          </div>
          <span className="text-base font-extrabold text-amber-400 truncate">
            {formatVND(totalAmount)}
          </span>
        </div>
      </button>

      {/* Checkout Button */}
      <button
        type="button"
        onClick={onCheckout}
        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 font-bold text-sm tracking-wide text-white shadow-md active:scale-95 transition-all shrink-0 ml-2"
      >
        THANH TOÁN
      </button>
    </div>
  );
};

