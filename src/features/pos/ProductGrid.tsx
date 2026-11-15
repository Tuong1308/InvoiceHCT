import React from 'react';
import { Product } from '../../types/database';
import { ProductCard } from './ProductCard';
import { useCartStore } from '../../stores/cart';
import { Coffee } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, isLoading }) => {
  const { addItem, removeItem, getItemQty } = useCartStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-28 bg-stone-200 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-stone-400 text-center">
        <Coffee className="w-12 h-12 stroke-[1.5] text-stone-300 mb-3" />
        <p className="font-medium text-stone-600">Không có món nào khớp</p>
        <p className="text-xs text-stone-400 mt-1">Thử tìm kiếm với từ khóa khác hoặc đổi loại món</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 p-3 sm:p-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          qtyInCart={getItemQty(product.id)}
          onAdd={addItem}
          onRemove={removeItem}
        />
      ))}
    </div>
  );
};

