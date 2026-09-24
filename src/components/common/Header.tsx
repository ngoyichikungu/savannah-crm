import React, { useState } from 'react';
import { Company, User } from '../../types';
import {
  Building2,
  FileText,
  CreditCard,
  Users,
  Target,
  FileSpreadsheet,
  LayoutDashboard,
  Server,
  BarChart3,
  Terminal,
  CheckCircle2,
  Info,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Grid,
  LogOut,
  Plus,
  Calendar,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'calendar'
  | 'invoices'
  | 'payments'
  | 'clients'
  | 'marketing'
  | 'reports'
  | 'quotations'
  | 'proposals'
  | 'integrity'
  | 'operations';

interface HeaderProps {
  currentCompany: Company;
  companies: Company[];
  onSwitchCompany: (companyId: string) => void;
  onOpenCompanySettings?: () => void;
  onCreateCompany?: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  invoiceCount: number;
  quotationCount: number;
  paymentCount?: number;
  marketingPlanCount?: number;
  calendarEventCount?: number;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCompany,
  companies,
  onSwitchCompany,
  onOpenCompanySettings,
  onCreateCompany,
  activeTab,
  onSelectTab,
  invoiceCount,
  quotationCount,
  paymentCount = 0,
  marketingPlanCount = 0,
  calendarEventCount = 0,
  currentUser,
  onLogout,
}) => {
  const [showVatInfo, setShowVatInfo] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const vatPercentage = currentCompany.vat_rate_bp
    ? (currentCompany.vat_rate_bp / 100).toFixed(0)
    : '16';

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    category: 'Core' | 'Financial' | 'Sales' | 'System';
    count?: number;
    color?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-emerald-700" />,
      category: 'Core',
    },
    {
      id: 'calendar',
      label: 'Calendar & Reminders',
      icon: <Calendar className="w-4 h-4 text-teal-700" />,
      category: 'Core',
      count: calendarEventCount,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <FileText className="w-4 h-4 text-blue-700" />,
      category: 'Financial',
      count: invoiceCount,
    },
    {
      id: 'payments',
      label: 'Payments & Receipts',
      icon: <CreditCard className="w-4 h-4 text-emerald-700" />,
      category: 'Financial',
      count: paymentCount,
    },
    {
      id: 'clients',
      label: 'Client Accounts',
      icon: <Users className="w-4 h-4 text-purple-700" />,
      category: 'Financial',
    },
    {
      id: 'quotations',
      label: 'Quotations',
      icon: <FileSpreadsheet className="w-4 h-4 text-amber-700" />,
      category: 'Sales',
      count: quotationCount,
    },
    {
      id: 'proposals',
      label: 'Sales Pipeline',
      icon: <Target className="w-4 h-4 text-blue-700" />,
      category: 'Sales',
    },
    {
      id: 'marketing',
      label: 'Marketing Plans',
      icon: <Sparkles className="w-4 h-4 text-amber-700" />,
      category: 'Sales',
      count: marketingPlanCount,
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      icon: <BarChart3 className="w-4 h-4 text-purple-700" />,
      category: 'System',
    },
    {
      id: 'integrity',
      label: 'Audit Ledger',
      icon: <Terminal className="w-4 h-4 text-stone-600" />,
      category: 'System',
    },
    {
      id: 'operations',
      label: 'Ops & Install',
      icon: <Server className="w-4 h-4 text-emerald-700" />,
      category: 'System',
    },
  ];

  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];

  const handleSelectNav = (tabId: ActiveTab) => {
    onSelectTab(tabId);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="no-print bg-white/95 text-stone-900 border-b border-stone-200 sticky top-0 z-50 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Company Switcher */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div
              onClick={() => handleSelectNav('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 group-hover:from-emerald-700 group-hover:to-emerald-900 flex items-center justify-center font-extrabold text-amber-300 font-mono shadow-sm transition-all group-hover:scale-105 border border-emerald-500/20">
                S
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base tracking-tight text-stone-900 group-hover:text-emerald-800 transition-colors">
                    Savannah
                  </span>
                  <span className="hidden xl:inline-block px-1.5 py-0.2 text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 block font-mono font-semibold tracking-wider -mt-0.5">
                  BUSINESS OPERATIONS
                </span>
              </div>
            </div>

            {/* Company Switcher & Logo Branding Button */}
            <div className="relative hidden md:flex items-center gap-2 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-300/80 shadow-2xs transition-all">
              {currentCompany.logo_url ? (
                <img
                  src={currentCompany.logo_url}
                  alt={currentCompany.name}
                  className="w-5 h-5 object-contain rounded shrink-0 bg-white p-0.5 border border-stone-200"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              )}
              <select
                id="company-switcher"
                value={currentCompany.id}
                onChange={(e) => onSwitchCompany(e.target.value)}
                className="bg-transparent text-xs font-bold text-stone-900 focus:outline-none cursor-pointer pr-1"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-stone-900 font-medium">
                    {c.legal_name || c.name} ({c.currency_code})
                  </option>
                ))}
              </select>

              {/* Logo Upload & Company Settings Trigger Button */}
              {onOpenCompanySettings && (
                <button
                  id="btn-open-logo-settings"
                  onClick={onOpenCompanySettings}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-stone-200/80 hover:bg-emerald-100 text-stone-800 hover:text-emerald-950 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs ml-1 border border-stone-300/60"
                  title="Upload company logo, manage companies, and configure letterhead branding"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Companies &amp; Branding</span>
                </button>
              )}

              {/* Create New Company Quick Action Button */}
              {onCreateCompany && (
                <button
                  id="btn-quick-create-company"
                  onClick={onCreateCompany}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs"
                  title="Create a new subsidiary or business entity"
                >
                  <Plus className="w-3 h-3 text-white" />
                  <span>New Entity</span>
                </button>
              )}

              {/* Dynamic VAT Badge */}
              {currentCompany.is_vat_registered ? (
                <div className="relative">
                  <button
                    onClick={() => setShowVatInfo(!showVatInfo)}
                    className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300 transition-all cursor-pointer shadow-2xs group"
                    title="Click for VAT registration details"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
                    <span>VAT {vatPercentage}%</span>
                    <Info className="w-2.5 h-2.5 text-emerald-700 group-hover:scale-110 transition-transform" />
                  </button>

                  {/* VAT Details Popover */}
                  {showVatInfo && (
                    <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-emerald-200 rounded-2xl p-3.5 shadow-xl z-50 text-stone-900 text-xs space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          VAT Registered Entity
                        </span>
                        <button
                          onClick={() => setShowVatInfo(false)}
                          className="text-stone-400 hover:text-stone-800 text-xs font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-stone-700">
                        <div className="flex justify-between">
                          <span className="text-stone-500">TPIN:</span>
                          <span className="font-bold text-stone-900">{currentCompany.tpin || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">VAT Rate:</span>
                          <span className="font-bold text-emerald-800">{vatPercentage}% ({currentCompany.vat_rate_bp} bp)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Currency:</span>
                          <span className="font-bold text-stone-900">{currentCompany.currency_code}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border border-stone-300">
                  NO VAT
                </span>
              )}
            </div>
          </div>

          {/* Navigation Dropdown Controls & User Session */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logged in User Profile & Sign Out */}
            {currentUser && (
              <div className="hidden xl:flex items-center gap-2 bg-stone-100/90 px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] font-mono shadow-2xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-900 text-[11px] leading-none">
                    {currentUser.name || currentUser.username}
                  </div>
                  <div className="text-[9px] text-stone-500 font-mono capitalize">
                    {currentUser.role}
                  </div>
                </div>
              </div>
            )}

            {onLogout && (
              <button
                id="header-btn-logout"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Sign out of Privacy Gate"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-500 group-hover:text-rose-600" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            {/* Primary Navigation Dropdown Menu Trigger (Desktop & Tablet) */}
            <div className="relative hidden md:block">
              <button
                id="header-nav-dropdown-btn"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 shadow-2xs transition-all cursor-pointer active:scale-95 group"
              >
                <Grid className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
                <span className="text-stone-500">Module:</span>
                <span className="text-stone-900 font-black">{activeItem.label}</span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Responsive Dropdown Menu Panel (Desktop) */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-stone-200 rounded-2xl p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3 opacity-100">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2 px-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-emerald-700" />
                      Select Module
                    </span>
                    <button
                      onClick={() => setIsDropdownOpen(false)}
                      className="text-stone-400 hover:text-stone-800 text-xs font-bold p-1 hover:bg-stone-100 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                    {navItems.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`dropdown-tab-${item.id}`}
                          onClick={() => handleSelectNav(item.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-left group cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-900 shadow-2xs font-extrabold border border-emerald-200/80'
                              : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={isActive ? 'text-emerald-700' : ''}>{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                          {item.count !== undefined && item.count > 0 && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                isActive
                                  ? 'bg-emerald-200 text-emerald-950 font-black'
                                  : 'bg-stone-100 text-stone-600 border border-stone-200'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Dropdown Hamburger Trigger */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl bg-stone-100 text-stone-900 border border-stone-200 transition-all cursor-pointer"
                aria-label="Toggle navigation dropdown"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-stone-700" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Full Dropdown Menu Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 py-3 space-y-2 animate-in fade-in duration-150 bg-white px-2 rounded-b-xl shadow-xl">
            {/* Company Selector for Mobile */}
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Company:</span>
              </div>
              <select
                value={currentCompany.id}
                onChange={(e) => onSwitchCompany(e.target.value)}
                className="bg-white text-xs font-bold text-stone-900 rounded-lg px-2 py-1 border border-stone-300 focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.currency_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Nav Links Grid */}
            <div className="grid grid-cols-1 gap-1 pt-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 font-extrabold shadow-xs border border-emerald-200'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-emerald-700' : ''}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-emerald-200 text-emerald-950'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
