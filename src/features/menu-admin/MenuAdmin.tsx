import React, { useState, useEffect } from 'react';
import { Category, Product } from '../../types/database';
import { api } from '../../lib/api';
import { formatVND, parseVND } from '../../lib/money';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';

export const MenuAdmin: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Category Edit / Add Modal
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // Product Edit / Add Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productPriceStr, setProductPriceStr] = useState<string>('');

  const loadData = async () => {
    try {
      const [cats, prods] = await Promise.all([api.getCategories(), api.getProducts()]);
      setCategories(cats);
      setProducts(prods);
      if (!selectedCatId && cats.length > 0) {
        setSelectedCatId(cats[0].id);
      }
    } catch (err) {
      console.error('Error loading menu admin data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name?.trim()) return;

    try {
      await api.saveCategory(editingCategory);
      setEditingCategory(null);
      loadData();
    } catch (err) {
      alert('Lỗi lưu danh mục');
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      await api.saveCategory({ ...cat, active: !cat.active });
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái danh mục');
    }
  };

  // Product Actions
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductPriceStr(formatVND(product.price, false));
    } else {
      setEditingProduct({
        category_id: selectedCatId || (categories[0]?.id ?? ''),
        name: '',
        price: 0,
        sort: products.length + 1,
        active: true,
      });
      setProductPriceStr('');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name?.trim()) return;
    const price = parseVND(productPriceStr);

    try {
      await api.saveProduct({
        ...editingProduct,
        price,
      });
      setEditingProduct(null);
      loadData();
    } catch (err) {
      alert('Lỗi lưu món');
    }
  };

  const handleToggleProductActive = async (prod: Product) => {
    try {
      await api.saveProduct({ ...prod, active: !prod.active });
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái món');
    }
  };

  const filteredProducts = selectedCatId
    ? products.filter((p) => p.category_id === selectedCatId)
    : products;

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-stone-900">Quản lý thực đơn (Menu)</h2>
        </div>

        <button
          type="button"
          onClick={() => handleOpenProductModal()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm món mới</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-6xl w-full mx-auto space-y-5">
        {/* Category Management Bar */}
        <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Danh mục món</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingCategory({ name: '', sort: categories.length + 1, active: true })}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm danh mục
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`group px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  } ${!cat.active ? 'opacity-50 line-through' : ''}`}
                >
                  <span>{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(cat);
                      }}
                      className="p-1 hover:bg-black/10 rounded-full"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCategoryActive(cat);
                      }}
                      className="p-1 hover:bg-black/10 rounded-full"
                    >
                      {cat.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Products Table for Selected Category */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              Danh sách món ({filteredProducts.length})
            </h3>
            <span className="text-xs text-stone-400">
              *Món đã ẩn sẽ không hiển thị trên màn hình bán hàng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 font-semibold text-xs">
                  <th className="py-2 text-left">Thứ tự</th>
                  <th className="py-2 text-left">Tên món</th>
                  <th className="py-2 text-left">Danh mục</th>
                  <th className="py-2 text-right">Giá bán</th>
                  <th className="py-2 text-center">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((prod) => {
                  const cat = categories.find((c) => c.id === prod.category_id);
                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-stone-50 ${!prod.active ? 'opacity-50 bg-stone-50/50' : ''}`}
                    >
                      <td className="py-3 font-mono font-semibold text-stone-500">{prod.sort}</td>
                      <td className="py-3 font-bold text-stone-900">
                        {prod.name}
                        {!prod.active && (
                          <span className="ml-2 text-[10px] text-stone-400 font-normal italic">
                            (Đang ẩn)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-stone-600 font-medium">{cat?.name || '--'}</td>
                      <td className="py-3 text-right font-black text-amber-700">
                        {formatVND(prod.price)}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleProductActive(prod)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                            prod.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {prod.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{prod.active ? 'Đang bán' : 'Ẩn'}</span>
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenProductModal(prod)}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-stone-500" />
                          <span>Sửa</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setEditingCategory(null)}
          />
          <form
            onSubmit={handleSaveCategory}
            className="relative bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 z-50 shadow-2xl"
          >
            <h4 className="font-bold text-stone-900 text-base">
              {editingCategory.id ? 'Sửa danh mục' : 'Thêm danh mục'}
            </h4>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                Tên danh mục *
              </label>
              <input
                type="text"
                required
                value={editingCategory.name || ''}
                onChange={(e) =>
                  setEditingCategory({ ...editingCategory, name: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                Thứ tự sắp xếp
              </label>
              <input
                type="number"
                value={editingCategory.sort ?? 0}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    sort: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white"
              >
                Lưu danh mục
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setEditingProduct(null)}
          />
          <form
            onSubmit={handleSaveProduct}
            className="relative bg-white rounded-3xl p-5 max-w-md w-full space-y-4 z-50 shadow-2xl"
          >
            <h4 className="font-bold text-stone-900 text-base">
              {editingProduct.id ? 'Sửa thông tin món' : 'Thêm món mới'}
            </h4>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                Tên món *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Cà phê muối"
                value={editingProduct.name || ''}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, name: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Giá bán (VND) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ví dụ: 30.000"
                  value={productPriceStr}
                  onChange={(e) => {
                    const parsed = parseVND(e.target.value);
                    setProductPriceStr(parsed > 0 ? formatVND(parsed, false) : '');
                  }}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Danh mục
                </label>
                <select
                  value={editingProduct.category_id}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                Thứ tự sắp xếp
              </label>
              <input
                type="number"
                value={editingProduct.sort ?? 0}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    sort: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white"
              >
                Lưu món
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

