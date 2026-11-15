import React from 'react';
import { Category } from '../../types/database';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  isSearching: boolean;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isSearching,
}) => {
  return (
    <>
      {/* Desktop Column (>= 1024px) */}
      <aside className="hidden lg:flex flex-col w-44 bg-white border-r border-stone-200 shrink-0 select-none overflow-y-auto">
        <div className="p-3 border-b border-stone-100">
          <span className="text-xs font-bold tracking-wider text-stone-400 uppercase">
            Danh mục
          </span>
        </div>
        <div className="p-2 space-y-1">
          {categories
            .filter((c) => c.active)
            .map((cat) => {
              const isSelected = !isSearching && selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 text-left ${
                    isSelected
                      ? 'bg-amber-600 text-white font-semibold shadow-sm shadow-amber-200'
                      : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {isSelected && <span className="text-amber-200 ml-1 font-bold">◀</span>}
                </button>
              );
            })}
        </div>
      </aside>

      {/* Mobile & Tablet Horizontal Scroll Row (< 1024px) */}
      <div className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white border-b border-stone-200 overflow-x-auto no-scrollbar shrink-0 select-none">
        {categories
          .filter((c) => c.active)
          .map((cat) => {
            const isSelected = !isSearching && selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 active:bg-stone-300'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
      </div>
    </>
  );
};

