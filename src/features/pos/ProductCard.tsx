import React from 'react';
import { Product } from '../../types/database';
import { formatVND } from '../../lib/money';
import { Plus, Minus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  qtyInCart: number;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  qtyInCart,
  onAdd,
  onRemove,
}) => {
  const isInCart = qtyInCart > 0;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(product);
  };

  const handleMinus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(product.id);
  };

  const handlePlus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(product);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all duration-150 cursor-pointer select-none active:scale-[0.98] min-h-[105px] sm:min-h-[120px] shadow-sm ${
        isInCart
          ? 'border-amber-600 bg-amber-50/70 shadow-amber-100 ring-2 ring-amber-500/20'
          : 'border-stone-200 bg-white hover:border-amber-300 hover:shadow-md'
      }`}
    >
      <div>
        <h4 className="font-semibold text-stone-900 text-sm sm:text-base leading-snug line-clamp-2">
          {product.name}
        </h4>
        <p className="mt-1 text-amber-700 font-bold text-sm sm:text-base">
          {formatVND(product.price)}
        </p>
      </div>

      {isInCart ? (
        <div
          className="mt-2 flex items-center justify-between bg-white rounded-lg p-1 border border-amber-300 shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleMinus}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-stone-100 hover:bg-amber-100 text-stone-700 active:bg-amber-200 transition-colors"
            aria-label="Giảm"
          >
            <Minus className="w-4 h-4 text-stone-800" />
          </button>
          <span className="font-bold text-amber-900 text-base px-2">
            {qtyInCart}
          </span>
          <button
            type="button"
            onClick={handlePlus}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-600 hover:bg-amber-700 text-white active:bg-amber-800 transition-colors"
            aria-label="Tăng"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-end">
          <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
};

