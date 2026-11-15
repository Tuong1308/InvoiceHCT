import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product, ShopSettings, BillWithItems } from '../../types/database';
import { api } from '../../lib/api';
import { matchesVietnameseSearch } from '../../lib/search';
import { CategorySidebar } from './CategorySidebar';
import { ProductGrid } from './ProductGrid';
import { CartPanel } from './CartPanel';
import { CartBar } from './CartBar';
import { CartSheet } from './CartSheet';
import { CheckoutDialog } from './CheckoutDialog';
import { BillPrint } from '../bills/BillPrint';
import { Search, Menu, X, CheckCircle2 } from 'lucide-react';

interface PosViewProps {
  shopSettings: ShopSettings;
  onOpenDrawer: () => void;
}

export const PosView: React.FC<PosViewProps> = ({ shopSettings, onOpenDrawer }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // POS State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState<boolean>(false);

  // Success Notification Toast & Auto Print
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [billToPrint, setBillToPrint] = useState<BillWithItems | null>(null);

  // Fetch categories & products
  useEffect(() => {
    const loadPosData = async () => {
      try {
        setIsLoading(true);
        const [cats, prods] = await Promise.all([api.getCategories(), api.getProducts()]);
        setCategories(cats);
        setProducts(prods);
        if (cats.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(cats[0].id);
        }
      } catch (err) {
        console.error('Error loading POS catalog:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosData();
  }, []);

  // Filter products based on search query or active category
  const isSearching = searchQuery.trim().length > 0;

  const displayedProducts = useMemo(() => {
    return products.filter((product) => {
      if (!product.active) return false;

      // When searching: search across all categories
      if (isSearching) {
        return matchesVietnameseSearch(product.name, searchQuery);
      }

      // When not searching: filter by selected category
      return selectedCategoryId ? product.category_id === selectedCategoryId : true;
    });
  }, [products, isSearching, searchQuery, selectedCategoryId]);

  // Handle successful checkout
  const handleCheckoutSuccess = (bill: BillWithItems, shouldPrint: boolean) => {
    setSuccessToast(`Đã lưu bill ${bill.code}`);
    setTimeout(() => setSuccessToast(null), 4000);

    if (shouldPrint) {
      setBillToPrint(bill);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden relative">
      {/* Top POS Header */}
      <header className="h-14 sm:h-16 bg-white border-b border-stone-200 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 select-none z-10">
        {/* Left: Hamburger Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 active:bg-stone-300 transition-colors shrink-0"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center: Search Box */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm món (không dấu, vd: ca phe muoi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-stone-100 border border-stone-200 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-stone-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right: Shop Name / Title */}
        <div className="hidden sm:block text-right">
          <h1 className="font-extrabold text-stone-900 text-sm tracking-tight truncate max-w-[200px]">
            {shopSettings.shop_name}
          </h1>
          <span className="text-[11px] text-amber-700 font-semibold">Bán hàng tại quầy</span>
        </div>
      </header>

      {/* Main Body - 3 columns layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: Categories */}
        <CategorySidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => {
            setSelectedCategoryId(id);
            setSearchQuery(''); // Clear search when user taps category
          }}
          isSearching={isSearching}
        />

        {/* Center: Products Grid */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-4">
          <ProductGrid products={displayedProducts} isLoading={isLoading} />
        </main>

        {/* Right Column: Desktop Cart Panel (>= 1024px) */}
        <CartPanel onCheckout={() => setIsCheckoutOpen(true)} />
      </div>

      {/* Mobile Sticky Bottom Bar (< 1024px) */}
      <CartBar
        onOpenSheet={() => setIsCartSheetOpen(true)}
        onCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Mobile Bottom Sheet (< 1024px) */}
      <CartSheet
        isOpen={isCartSheetOpen}
        onClose={() => setIsCartSheetOpen(false)}
        onCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Dialog Modal */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        shopSettings={shopSettings}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-sm">{successToast}</span>
        </div>
      )}

      {/* Hidden Container for Immediate Bill Print */}
      {billToPrint && (
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
          <BillPrint bill={billToPrint} settings={shopSettings} />
        </div>
      )}
    </div>
  );
};

