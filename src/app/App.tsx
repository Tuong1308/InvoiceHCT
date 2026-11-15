import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../lib/api';
import { ShopSettings } from '../types/database';
import { PosView } from '../features/pos/PosView';
import { TodayDashboard } from '../features/reports/TodayDashboard';
import { ModernDashboard } from '../features/dashboard/ModernDashboard';
import { CashManagement } from '../features/cash/CashManagement';
import { BillHistory } from '../features/bills/BillHistory';
import { DaySummary } from '../features/reports/DaySummary';
import { MenuAdmin } from '../features/menu-admin/MenuAdmin';
import { ShopSettingsPage } from '../features/settings/ShopSettingsPage';
import { LoginPage } from '../features/auth/LoginPage';
import {
  ShoppingBag,
  TrendingUp,
  LayoutDashboard,
  Wallet,
  Receipt,
  FileText,
  UtensilsCrossed,
  Settings,
  LogOut,
  X,
  Coffee,
} from 'lucide-react';

type Screen =
  | 'dashboard'
  | 'pos'
  | 'today_revenue'
  | 'cash'
  | 'bill_history'
  | 'day_summary'
  | 'menu_admin'
  | 'settings';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [activeScreen, setActiveScreen] = useState<Screen>('pos');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const [shopSettings, setShopSettings] = useState<ShopSettings>({
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

  // Check Auth State on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          setIsAuthenticated(Boolean(data.session));
        } else {
          const session = localStorage.getItem('pos_auth_session');
          setIsAuthenticated(Boolean(session));
        }
      } catch (e) {
        console.error('Auth verification error:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();

    // Fetch Shop Settings
    api.getSettings().then(setShopSettings);
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('pos_auth_session');
    }
    setIsAuthenticated(false);
    setIsDrawerOpen(false);
  };

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center animate-pulse text-white shadow-lg shadow-amber-200">
            <Coffee className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
            Khởi động hệ thống...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Navigation Items
  const navItems = [
    { id: 'dashboard' as Screen, label: '1. Tổng quan (Dashboard)', icon: LayoutDashboard },
    { id: 'pos' as Screen, label: '2. Bán hàng (Màn chính)', icon: ShoppingBag },
    { id: 'today_revenue' as Screen, label: '3. Doanh thu hôm nay', icon: TrendingUp },
    { id: 'cash' as Screen, label: '4. Thu chi tiền mặt', icon: Wallet },
    { id: 'bill_history' as Screen, label: '5. Lịch sử bill', icon: Receipt },
    { id: 'day_summary' as Screen, label: '6. Tổng kết ngày', icon: FileText },
    { id: 'menu_admin' as Screen, label: '7. Quản lý menu', icon: UtensilsCrossed },
    { id: 'settings' as Screen, label: '8. Cài đặt hệ thống', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-stone-100 overflow-hidden font-sans">
      {/* Drawer Overlay Backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Navigation Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 sm:w-80 bg-white border-r border-stone-200 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-200 select-none ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div>
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-amber-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Coffee className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm truncate">{shopSettings.shop_name}</h2>
                <span className="text-[11px] text-amber-100">Bán hàng & Quản lý</span>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveScreen(item.id);
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                      : 'text-stone-700 hover:bg-stone-100 active:bg-stone-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer - Logout */}
        <div className="p-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm text-red-600 hover:bg-red-50 active:bg-red-100 border border-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>8. Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Screen Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeScreen === 'dashboard' && (
          <ModernDashboard
            settings={shopSettings}
            onNavigateToPos={() => setActiveScreen('pos')}
            onNavigateToBills={() => setActiveScreen('bill_history')}
            onNavigateToCash={() => setActiveScreen('cash')}
            onNavigateToSummary={() => setActiveScreen('day_summary')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        )}

        {activeScreen === 'pos' && (
          <PosView
            shopSettings={shopSettings}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        )}

        {activeScreen === 'today_revenue' && (
          <div className="flex-1 flex flex-col h-full">
            <header className="h-14 sm:h-16 bg-white border-b border-stone-200 px-4 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-stone-900">Doanh thu hôm nay</h2>
            </header>
            <TodayDashboard settings={shopSettings} />
          </div>
        )}

        {activeScreen === 'cash' && (
          <div className="flex-1 flex flex-col h-full">
            <header className="h-14 sm:h-16 bg-white border-b border-stone-200 px-4 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-stone-900">Thu chi tiền mặt</h2>
            </header>
            <CashManagement />
          </div>
        )}

        {activeScreen === 'bill_history' && (
          <div className="flex-1 flex flex-col h-full">
            <header className="h-14 sm:h-16 bg-white border-b border-stone-200 px-4 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-stone-900">Lịch sử bill</h2>
            </header>
            <BillHistory settings={shopSettings} />
          </div>
        )}

        {activeScreen === 'day_summary' && (
          <div className="flex-1 flex flex-col h-full">
            <header className="h-14 sm:h-16 bg-white border-b border-stone-200 px-4 flex items-center gap-3 shrink-0 print:hidden">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-stone-900">Tổng kết ngày</h2>
            </header>
            <DaySummary settings={shopSettings} />
          </div>
        )}

        {activeScreen === 'menu_admin' && (
          <div className="flex-1 flex flex-col h-full">
            <header className="h-14 sm:h-16 bg-white border-b border-stone-200 px-4 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-stone-900">Quản lý thực đơn</h2>
            </header>
            <MenuAdmin />
          </div>
        )}

        {activeScreen === 'settings' && (
          <div className="flex-1 flex flex-col h-full">
            <header className="h-14 sm:h-16 bg-white border-b border-stone-200 px-4 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-stone-900">Cài đặt thông tin tiệm</h2>
            </header>
            <ShopSettingsPage onSettingsSaved={setShopSettings} />
          </div>
        )}
      </main>
    </div>
  );
};

