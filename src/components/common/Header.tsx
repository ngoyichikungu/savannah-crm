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
  UserCheck,
  Receipt,
  TrendingUp,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'calendar'
  | 'invoices'
  | 'payments'
  | 'clients'
  | 'purchases'
  | 'expenses'
  | 'pnl'
  | 'accounting'
  | 'marketing'
  | 'reports'
  | 'quotations'
  | 'proposals'
  | 'integrity'
  | 'operations'
  | 'users';

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
  userCount?: number;
  purchaseInvoiceCount?: number;
  expenseCount?: number;
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
  userCount = 0,
  purchaseInvoiceCount = 0,
  expenseCount = 0,
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
      id: 'pnl',
      label: 'Profit & Loss (P&L)',
      icon: <TrendingUp className="w-4 h-4 text-emerald-800" />,
      category: 'Financial',
    },
    {
      id: 'invoices',
      label: 'Sales Invoices',
      icon: <FileText className="w-4 h-4 text-blue-700" />,
      category: 'Financial',
      count: invoiceCount,
    },
    {
      id: 'purchases',
      label: 'Purchase Bills (AP)',
      icon: <FileText className="w-4 h-4 text-indigo-700" />,
      category: 'Financial',
      count: purchaseInvoiceCount,
    },
    {
      id: 'expenses',
      label: 'Business Expenses',
      icon: <Receipt className="w-4 h-4 text-amber-700" />,
      category: 'Financial',
      count: expenseCount,
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
    {
      id: 'users',
      label: 'User Management',
      icon: <UserCheck className="w-4 h-4 text-indigo-700" />,
      category: 'System',
      count: userCount,
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
      {/* LINE 1: Primary Header Menu Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* LEFT SECTION: 1st Savannah Logo -> Module Dropdown Menu -> Company Selector */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* 1st Savannah Logo */}
            <div
              onClick={() => handleSelectNav('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
              title="Return to Savannah Dashboard"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 group-hover:from-emerald-700 group-hover:to-emerald-900 flex items-center justify-center font-extrabold text-amber-300 font-mono shadow-sm transition-all group-hover:scale-105 border border-emerald-500/20">
                S
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base tracking-tight text-stone-900 group-hover:text-emerald-800 transition-colors">
                    Savannah
                  </span>
                  <span className="hidden xl:inline-block px-1.5 py-0.2 text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 block font-mono font-semibold tracking-wider -mt-0.5">
                  SMALL BUSINESS ACCOUNTING
                </span>
              </div>
            </div>

            {/* 2nd: UNMISTAKABLE MODULE PULL-DOWN MENU (Between Logo & Company Selector) */}
            <div className="relative">
              <button
                id="header-nav-dropdown-btn"
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border-2 select-none group ${
                  isDropdownOpen
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                    : 'bg-white hover:bg-stone-50 text-stone-900 border-stone-300 hover:border-emerald-600 shadow-2xs'
                }`}
                title="Pull down menu to switch CRM module"
              >
                {/* Visual Label Tag */}
                <div className="text-left flex flex-col items-start pr-0.5 sm:pr-1">
                  <div className="flex items-center gap-1 leading-none text-[9px] font-mono font-extrabold uppercase tracking-wider text-emerald-800">
                    <Grid className="w-2.5 h-2.5 text-emerald-700" />
                    <span>MODULE (PULL DOWN)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 mt-0.5">
                    <span className="text-emerald-700">{activeItem.icon}</span>
                    <span className="truncate max-w-[110px] sm:max-w-[150px]">{activeItem.label}</span>
                  </div>
                </div>

                {/* Explicit Pull-Down Arrow Indicator Box */}
                <div className="border-l border-stone-200 pl-2 sm:pl-2.5 py-0.5 flex items-center gap-1 text-emerald-800">
                  <span className="text-[9px] font-mono font-black uppercase hidden lg:inline tracking-wider">
                    {isDropdownOpen ? 'CLOSE ▲' : 'SELECT ▼'}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isDropdownOpen
                        ? 'bg-emerald-700 text-white rotate-180 shadow-xs'
                        : 'bg-stone-100 text-stone-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>
              </button>

              {/* Pull-Down Menu Panel (Anchored Directly Beneath Module Trigger) */}
              {isDropdownOpen && (
                <>
                  {/* Backdrop to close on click outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-80 bg-white border-2 border-emerald-600/30 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3 opacity-100">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2 px-1">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <Grid className="w-3.5 h-3.5 text-emerald-700" />
                          Pull-Down Module Selector
                        </span>
                        <p className="text-[10px] text-stone-500 font-medium">
                          Select an operational module to navigate
                        </p>
                      </div>
                      <button
                        type="button"
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
                            type="button"
                            id={`dropdown-tab-${item.id}`}
                            onClick={() => handleSelectNav(item.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-left group cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-900 shadow-2xs font-extrabold border border-emerald-300 ring-1 ring-emerald-500/20'
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
                </>
              )}
            </div>

            {/* 3rd: Company Selector (Follows between Logo & Module Menu) */}
            <div className="relative hidden md:flex items-center gap-2 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-300 shadow-2xs transition-all">
              {currentCompany.logo_url ? (
                <img
                  src={currentCompany.logo_url}
                  alt={currentCompany.name}
                  className="w-5 h-5 object-contain rounded shrink-0 bg-white p-0.5 border border-stone-200"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase font-bold text-stone-400 leading-tight">
                  Active Entity
                </span>
                <select
                  id="company-switcher"
                  value={currentCompany.id}
                  onChange={(e) => onSwitchCompany(e.target.value)}
                  className="bg-transparent text-xs font-bold text-stone-900 focus:outline-none cursor-pointer pr-1 -mt-0.5"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-stone-900 font-medium">
                      {c.legal_name || c.name} ({c.currency_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: User Profile Pill & Sign Out Button in current position */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logged in User Profile */}
            {currentUser && (
              <button
                id="header-user-profile-badge"
                type="button"
                onClick={() => handleSelectNav('users')}
                className="hidden xl:flex items-center gap-2 bg-stone-100/90 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-stone-200 hover:border-indigo-300 text-xs transition-all cursor-pointer text-left group"
                title="Manage team accounts, roles, access permissions, and passwords"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-700 group-hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-[10px] font-mono shadow-2xs transition-colors">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-900 group-hover:text-indigo-950 text-[11px] leading-none transition-colors">
                    {currentUser.name || currentUser.username}
                  </div>
                  <div className="text-[9px] text-stone-500 font-mono capitalize">
                    {currentUser.role} • Manage
                  </div>
                </div>
              </button>
            )}

            {/* Sign Out Button */}
            {onLogout && (
              <button
                id="header-btn-logout"
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Sign out of Privacy Gate"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-500 group-hover:text-rose-600" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            {/* Mobile Hamburger Menu Button */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl bg-stone-100 text-stone-900 border border-stone-200 transition-all cursor-pointer"
                aria-label="Toggle navigation dropdown"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-stone-700" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LINE 2: SUB-HEADER TOOLBAR (Row immediately below the header menu) */}
      {/* Contains: Companies and branding button, + New Entity button, Team & Users button and VAT % indicator */}
      <div className="border-t border-stone-200 bg-stone-50/90 px-4 sm:px-6 lg:px-8 py-1.5 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left Actions: Companies & Branding, + New Entity, Team & Users */}
          <div className="flex items-center gap-2">
            {/* Companies and Branding Button */}
            {onOpenCompanySettings && (
              <button
                id="btn-open-logo-settings"
                type="button"
                onClick={onOpenCompanySettings}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white hover:bg-emerald-50 text-stone-800 hover:text-emerald-950 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs border border-stone-300 hover:border-emerald-300 active:scale-95"
                title="Upload company logo, manage companies, and configure letterhead branding"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Companies &amp; Branding</span>
              </button>
            )}

            {/* + New Entity Quick Action Button */}
            {onCreateCompany && (
              <button
                id="btn-quick-create-company"
                type="button"
                onClick={onCreateCompany}
                className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Create a new subsidiary or business entity"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ New Entity</span>
              </button>
            )}

            {/* Team & Users Button */}
            <button
              id="btn-quick-users"
              type="button"
              onClick={() => handleSelectNav('users')}
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs border active:scale-95 ${
                activeTab === 'users'
                  ? 'bg-indigo-700 text-white border-indigo-800 shadow-xs'
                  : 'bg-white hover:bg-indigo-50 text-indigo-900 border-stone-300 hover:border-indigo-300'
              }`}
              title="Manage user accounts, roles, access permissions, and passwords"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Team &amp; Users</span>
              {userCount !== undefined && userCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-mono bg-indigo-100 text-indigo-900 rounded font-black border border-indigo-200">
                  {userCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Action: VAT % Indicator */}
          <div className="flex items-center">
            {currentCompany.is_vat_registered ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVatInfo(!showVatInfo)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-300 transition-all cursor-pointer shadow-2xs group"
                  title="Click for VAT registration details"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
                  <span>VAT {vatPercentage}% Registered</span>
                  <Info className="w-3 h-3 text-emerald-700 group-hover:scale-110 transition-transform" />
                </button>

                {/* VAT Details Popover */}
                {showVatInfo && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-emerald-200 rounded-2xl p-3.5 shadow-xl z-50 text-stone-900 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        VAT Registered Entity
                      </span>
                      <button
                        type="button"
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
                        <span className="font-bold text-emerald-800">
                          {vatPercentage}% ({currentCompany.vat_rate_bp} bp)
                        </span>
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
              <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200/80 text-stone-600 px-2 py-1 rounded-lg border border-stone-300">
                NO VAT REGISTERED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer (When Mobile Menu Open) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 py-3 space-y-3 animate-in fade-in duration-150 bg-white px-4 shadow-xl">
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

          {/* Subheader Buttons for Mobile */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
            {onOpenCompanySettings && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenCompanySettings();
                }}
                className="flex items-center justify-center gap-1.5 text-xs font-bold p-2 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 text-stone-800"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Companies</span>
              </button>
            )}
            {onCreateCompany && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onCreateCompany();
                }}
                className="flex items-center justify-center gap-1.5 text-xs font-bold p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ New Entity</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectNav('users')}
              className="flex items-center justify-center gap-1.5 text-xs font-bold p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl border border-indigo-200 col-span-2"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Team &amp; Users Management ({userCount})</span>
            </button>
          </div>

          {/* Mobile Nav Links Grid */}
          <div className="grid grid-cols-1 gap-1 pt-1 border-t border-stone-100">
            <span className="text-[10px] font-mono uppercase font-bold text-stone-400 px-1">
              Select Module
            </span>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
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

          {/* Mobile Sign Out Button */}
          {onLogout && (
            <div className="pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
