import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../../types/database';
import { api } from '../../lib/api';
import { VIETNAM_BANKS, findBankByBin } from '../../lib/banks';
import { isSupabaseConfigured } from '../../lib/supabase';
import { removeVietnameseTones } from '../../lib/search';
import {
  Settings,
  Store,
  CreditCard,
  Printer,
  Save,
  CheckCircle2,
  Database,
} from 'lucide-react';

interface ShopSettingsPageProps {
  onSettingsSaved?: (newSettings: ShopSettings) => void;
}

export const ShopSettingsPage: React.FC<ShopSettingsPageProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<ShopSettings>({
    id: 1,
    shop_name: 'TIỆM NƯỚC & BÁNH HCT',
    address: '123 Đường Số 8, P. Linh Trung, TP. Thủ Đức',
    phone: '0909 123 456',
    bank_bin: '970436',
    bank_name: 'Vietcombank',
    account_no: '0123456789',
    account_name: 'NGUYEN VAN A',
    footer_text: 'Cảm ơn và hẹn gặp lại quý khách!',
    bill_paper_size: '80mm',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((res) => {
      setSettings(res);
      setIsLoading(false);
    });
  }, []);

  const handleBankChange = (bin: string) => {
    const bank = findBankByBin(bin);
    setSettings((prev) => ({
      ...prev,
      bank_bin: bin,
      bank_name: bank ? bank.shortName : prev.bank_name,
    }));
  };

  const handleAccountNameChange = (val: string) => {
    // Uppercase unaccented
    const clean = removeVietnameseTones(val).toUpperCase();
    setSettings((prev) => ({ ...prev, account_name: clean }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSuccessMsg('Đã lưu cấu hình tiệm thành công!');
      if (onSettingsSaved) onSettingsSaved(updated);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      alert('Lỗi lưu cài đặt');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-stone-400">Đang tải cài đặt...</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-stone-200 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-stone-900">Cài đặt hệ thống</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto space-y-5">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Section 1: Shop Profile Info */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-600" />
              <span>Thông tin tiệm (In trên hoá đơn)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Tên tiệm *
                </label>
                <input
                  type="text"
                  required
                  value={settings.shop_name}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Địa chỉ tiệm *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bank Account & VietQR */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Tài khoản ngân hàng nhận chuyển khoản (VietQR)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Chọn Ngân hàng *
                </label>
                <select
                  value={settings.bank_bin}
                  onChange={(e) => handleBankChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none"
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.shortName} - {b.name} (BIN: {b.bin})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Số tài khoản (STK) *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.account_no}
                    onChange={(e) => setSettings({ ...settings, account_no: e.target.value.trim() })}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Tên chủ tài khoản (In hoa không dấu) *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.account_name}
                    onChange={(e) => handleAccountNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Receipt Formatting */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-600" />
              <span>Cấu hình in hoá đơn (Bill)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Khổ giấy in
                </label>
                <select
                  value={settings.bill_paper_size}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bill_paper_size: e.target.value as '80mm' | 'A5' | 'A4',
                    })
                  }
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white"
                >
                  <option value="80mm">Khổ giấy nhiệt 80mm (Khuyên dùng cho POS)</option>
                  <option value="A5">Khổ giấy A5</option>
                  <option value="A4">Khổ giấy A4</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                  Lời chào cuối bill
                </label>
                <input
                  type="text"
                  value={settings.footer_text}
                  onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Database & Cloud Status */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600" />
              <span>Trạng thái kết nối CSDL Cloud (Supabase)</span>
            </h3>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900">
                    {isSupabaseConfigured
                      ? 'Đang kết nối Supabase Cloud PostgreSQL (Realtime Live)'
                      : 'Đang hoạt động ở chế độ Lưu trữ Trình duyệt & Bộ nhớ (Local / Demo Mode)'}
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {isSupabaseConfigured
                      ? 'Dữ liệu được đồng bộ trực tiếp lên Cloud Postgres, hỗ trợ đa máy bán hàng realtime.'
                      : 'Để kết nối Supabase, bạn điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-2xl shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Lưu tất cả cài đặt</span>
          </button>
        </form>
      </div>
    </div>
  );
};

