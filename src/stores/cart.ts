import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types/database';

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  deleteItem: (productId: string) => void;
  clearCart: () => void;
  getTotalCount: () => number;
  getTotalAmount: () => number;
  getItemQty: (productId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        set((state) => {
          const index = state.items.findIndex((i) => i.product.id === product.id);
          if (index >= 0) {
            const next = [...state.items];
            next[index] = { ...next[index], qty: next[index].qty + 1 };
            return { items: next };
          }
          return { items: [...state.items, { product, qty: 1 }] };
        });
      },

      removeItem: (productId: string) => {
        set((state) => {
          const index = state.items.findIndex((i) => i.product.id === productId);
          if (index < 0) return state;

          const currentItem = state.items[index];
          if (currentItem.qty <= 1) {
            return { items: state.items.filter((i) => i.product.id !== productId) };
          }

          const next = [...state.items];
          next[index] = { ...next[index], qty: next[index].qty - 1 };
          return { items: next };
        });
      },

      updateQty: (productId: string, qty: number) => {
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => i.product.id !== productId) };
          }
          const index = state.items.findIndex((i) => i.product.id === productId);
          if (index < 0) return state;

          const next = [...state.items];
          next[index] = { ...next[index], qty };
          return { items: next };
        });
      },

      deleteItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalCount: () => {
        return get().items.reduce((sum, item) => sum + item.qty, 0);
      },

      getTotalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
      },

      getItemQty: (productId: string) => {
        const item = get().items.find((i) => i.product.id === productId);
        return item ? item.qty : 0;
      },
    }),
    {
      name: 'pos_cart_storage',
    }
  )
);

