import React, { useState } from 'react';
import { Company } from '../../types';
import { AccountingService } from '../../services/accountingService';
import { Money } from '../../support/money';
import {
  TrendingUp,
  Download,
  Printer,
  PieChart,
  ShieldAlert,
  Scale,
  Receipt,
} from 'lucide-react';

interface ProfitLossViewProps {
  company: Company;
  onOpenCaptureBill?: () => void;
  onOpenRecordExpense?: () => void;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  company,
  onOpenCaptureBill,
  onOpenRecordExpense,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [preset, setPreset] = useState<'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all'>('this_month');
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual');
  const [startDate, setStartDate] = useState(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const handlePresetChange = (newPreset: 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all') => {
    setPreset(newPreset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    if (newPreset === 'this_month') {
      const start = new Date(y, m, 1).toISOString().split('T')[0];
      const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (newPreset === 'last_month') {
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (newPreset === 'this_quarter') {
      const q = Math.floor(m / 3);
      const start = new Date(y, q * 3, 1).toISOString().split('T')[0];
      const end = new Date(y, (q + 1) * 3, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (newPreset === 'this_year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (newPreset === 'all') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  const pnl = AccountingService.calculateProfitAndLoss(company.id, startDate, endDate, {
    basis,
    preset,
  });

  const rev = pnl.revenue.effectiveRevenueMinor;
  const isProfitable = pnl.netProfitMinor >= 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push(`"${company.legal_name || company.name} - PROFIT & LOSS STATEMENT"`);
    lines.push(`"Reporting Period: ${startDate} to ${endDate}"`);
    lines.push(`"Accounting Basis: ${basis.toUpperCase()} | Currency: ${company.currency_code}"`);
    lines.push('');
    lines.push('"Section","Account Line","Amount","% of Revenue"');

    // Revenue
    lines.push(`"Revenue","Effective Turnover","${(rev / 100).toFixed(2)}","100.0%"`);
    // Cost of sales
    lines.push(`"Cost of Sales","Total Direct Costs","${(pnl.costOfSales.totalCostOfSalesMinor / 100).toFixed(2)}","${rev > 0 ? ((pnl.costOfSales.totalCostOfSalesMinor / rev) * 100).toFixed(1) : 0}%"`);
    lines.push(`"Gross Profit","Gross Trading Margin","${(pnl.grossProfitMinor / 100).toFixed(2)}","${pnl.grossMarginPercent.toFixed(1)}%"`);

    // Operating expenses
    pnl.operatingExpenses.categories.forEach((cat) => {
      lines.push(`"Operating Expenses","${cat.label}","${(cat.amountMinor / 100).toFixed(2)}","${cat.percentageOfRevenue.toFixed(1)}%"`);
    });
    lines.push(`"Operating Expenses","Total OPEX","${(pnl.operatingExpenses.totalMinor / 100).toFixed(2)}","${rev > 0 ? ((pnl.operatingExpenses.totalMinor / rev) * 100).toFixed(1) : 0}%"`);

    // Net profit
    lines.push(`"Net Profit","Net Income Before Tax","${(pnl.netProfitMinor / 100).toFixed(2)}","${pnl.netMarginPercent.toFixed(1)}%"`);

    // VAT
    lines.push('');
    lines.push('"VAT Summary","Output VAT Collected","' + (pnl.taxVatSummary.outputVatMinor / 100).toFixed(2) + '",""');
    lines.push('"VAT Summary","Input VAT Claimable","' + (pnl.taxVatSummary.totalInputVatMinor / 100).toFixed(2) + '",""');
    lines.push('"VAT Summary","Net Position","' + (pnl.taxVatSummary.netVatPayableMinor / 100).toFixed(2) + '",""');

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Profit_and_Loss_${company.name.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Presets & Accounting Basis Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">Period:</span>
          {(
            [
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_quarter', label: 'This Quarter' },
              { id: 'this_year', label: 'Financial Year' },
              { id: 'all', label: 'All History' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetChange(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                preset === p.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & Basis Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 font-mono"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 font-mono"
            />
          </div>

          {/* Basis Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setBasis('accrual')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                basis === 'accrual' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
              }`}
              title="Recognize sales & bills when issued"
            >
              Accrual Basis
            </button>
            <button
              type="button"
              onClick={() => setBasis('cash')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                basis === 'cash' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
              }`}
              title="Recognize when cash changes hands"
            >
              Cash Basis
            </button>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="p-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl transition-colors cursor-pointer"
            title="Export P&L to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl transition-colors cursor-pointer"
            title="Print Income Statement"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Effective Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Operating Turnover
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-900 mt-2">
            {new Money(rev, company.currency_code).format()}
          </div>
          <div className="text-xs text-stone-400 mt-1 flex items-center gap-1">
            <span>{pnl.revenue.salesCount} sales invoices in range</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
              Gross Profit
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {pnl.grossMarginPercent.toFixed(1)}% Margin
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-teal-900 mt-2">
            {new Money(pnl.grossProfitMinor, company.currency_code).format()}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            COGS: {new Money(pnl.costOfSales.totalCostOfSalesMinor, company.currency_code).format()}
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Operating Overhead (OPEX)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-900 mt-2">
            {new Money(pnl.operatingExpenses.totalMinor, company.currency_code).format()}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            Across {pnl.operatingExpenses.categories.length} operational accounts
          </div>
        </div>

        {/* Net Profit / (Loss) */}
        <div
          className={`p-5 rounded-2xl border shadow-xs relative overflow-hidden ${
            isProfitable
              ? 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200'
              : 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isProfitable ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              Net Profit / (Loss)
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                isProfitable
                  ? 'bg-emerald-200 text-emerald-950'
                  : 'bg-rose-200 text-rose-950'
              }`}
            >
              {pnl.netMarginPercent.toFixed(1)}% Net Margin
            </span>
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              isProfitable ? 'text-emerald-900' : 'text-rose-900'
            }`}
          >
            {pnl.netProfitMinor < 0
              ? `(${new Money(Math.abs(pnl.netProfitMinor), company.currency_code).format()})`
              : new Money(pnl.netProfitMinor, company.currency_code).format()}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Bottom line before corporate tax
          </div>
        </div>
      </div>

      {/* Main Income Statement Table & Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Complete Income Statement Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-700" />
                Comprehensive Income Statement
              </h3>
              <p className="text-[11px] text-stone-500">
                Period: {startDate} to {endDate} • {basis.toUpperCase()} BASIS
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onOpenCaptureBill && (
                <button
                  type="button"
                  onClick={onOpenCaptureBill}
                  className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  + Capture Bill
                </button>
              )}
              {onOpenRecordExpense && (
                <button
                  type="button"
                  onClick={onOpenRecordExpense}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  + Record Expense
                </button>
              )}
            </div>
          </div>

          <div className="p-4 divide-y divide-stone-100 font-sans text-xs">
            {/* 1. REVENUE SECTION */}
            <div className="pb-3">
              <div className="font-extrabold uppercase text-[11px] text-emerald-800 tracking-wider mb-2">
                1. Operating Revenue (Turnover)
              </div>
              <div className="space-y-1.5 pl-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-700">Commercial Sales Invoiced</span>
                  <span className="font-mono font-bold text-stone-900">
                    {new Money(pnl.revenue.salesInvoicedMinor, company.currency_code).format()}
                  </span>
                </div>
                {basis === 'cash' && (
                  <div className="flex justify-between items-center py-1 text-emerald-700 font-medium">
                    <span>Cash Collected from Customers</span>
                    <span className="font-mono font-bold">
                      {new Money(pnl.revenue.salesPaidMinor, company.currency_code).format()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-t border-stone-200 font-bold bg-stone-50 px-2 rounded-lg">
                  <span className="text-stone-900">Total Effective Turnover</span>
                  <span className="font-mono text-emerald-900 text-sm">
                    {new Money(rev, company.currency_code).format()}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. COST OF SALES */}
            <div className="py-3">
              <div className="font-extrabold uppercase text-[11px] text-teal-800 tracking-wider mb-2">
                2. Cost of Goods Sold (Direct Costs)
              </div>
              <div className="space-y-1.5 pl-2">
                {pnl.costOfSales.items.length === 0 ? (
                  <div className="text-stone-400 italic text-[11px]">No direct COGS items recorded in period.</div>
                ) : (
                  pnl.costOfSales.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1">
                      <span className="text-stone-700">{item.name}</span>
                      <span className="font-mono text-stone-800">
                        {new Money(item.amountMinor, company.currency_code).format()}
                      </span>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center py-2 border-t border-stone-200 font-bold bg-stone-50 px-2 rounded-lg">
                  <span className="text-stone-900">Total Cost of Sales</span>
                  <span className="font-mono text-stone-900">
                    {new Money(pnl.costOfSales.totalCostOfSalesMinor, company.currency_code).format()}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. GROSS PROFIT SUB-TOTAL */}
            <div className="py-3 bg-teal-50/40 px-3 rounded-xl border border-teal-200/60 my-2">
              <div className="flex justify-between items-center font-black text-sm">
                <span className="text-teal-950 uppercase">GROSS PROFIT</span>
                <span className="font-mono text-teal-900 text-base">
                  {new Money(pnl.grossProfitMinor, company.currency_code).format()}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-teal-800 mt-0.5">
                <span>Trading Margin on Sales</span>
                <span className="font-mono font-bold">{pnl.grossMarginPercent.toFixed(1)}%</span>
              </div>
            </div>

            {/* 4. OPERATING EXPENSES */}
            <div className="py-3">
              <div className="font-extrabold uppercase text-[11px] text-amber-800 tracking-wider mb-2">
                3. Operating &amp; Administrative Expenses (OPEX)
              </div>
              <div className="space-y-1.5 pl-2">
                {pnl.operatingExpenses.categories.length === 0 ? (
                  <div className="text-stone-400 italic text-[11px]">No operating expenses recorded.</div>
                ) : (
                  pnl.operatingExpenses.categories.map((cat) => (
                    <div key={cat.category} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-700">{cat.label}</span>
                        <span className="text-[10px] text-stone-400 font-mono">({cat.count})</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-[11px] text-stone-400">
                          {cat.percentageOfRevenue.toFixed(1)}% rev
                        </span>
                        <span className="font-bold text-stone-800">
                          {new Money(cat.amountMinor, company.currency_code).format()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center py-2 border-t border-stone-200 font-bold bg-stone-50 px-2 rounded-lg">
                  <span className="text-stone-900">Total Operating Expenses</span>
                  <span className="font-mono text-amber-900">
                    {new Money(pnl.operatingExpenses.totalMinor, company.currency_code).format()}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. NET PROFIT FINAL ROW */}
            <div
              className={`p-4 rounded-xl border mt-3 flex justify-between items-center ${
                isProfitable
                  ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                  : 'bg-rose-100/70 border-rose-300 text-rose-950'
              }`}
            >
              <div>
                <div className="font-black text-sm uppercase">NET PROFIT / (LOSS)</div>
                <div className="text-[11px] font-medium opacity-80">
                  Net Return Margin: {pnl.netMarginPercent.toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-xl">
                  {pnl.netProfitMinor < 0
                    ? `(${new Money(Math.abs(pnl.netProfitMinor), company.currency_code).format()})`
                    : new Money(pnl.netProfitMinor, company.currency_code).format()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Expense Distribution & VAT Reconciliation */}
        <div className="space-y-6">
          {/* Expense Category Distribution Bar Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-3 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-amber-700" />
              Expense Distribution Breakdown
            </h4>

            {pnl.operatingExpenses.categories.length === 0 ? (
              <div className="text-xs text-stone-400 italic">No categorized expenses.</div>
            ) : (
              <div className="space-y-3">
                {pnl.operatingExpenses.categories.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-700 truncate max-w-[150px]">{cat.label}</span>
                      <span className="font-mono font-bold text-stone-900">
                        {cat.percentageOfExpenses.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, cat.percentageOfExpenses)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statutory Tax & VAT Reconciliation Box */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-700" />
                  Statutory VAT Position
                </h4>
                <p className="text-[10px] text-stone-500">
                  TPIN: {company.tpin || 'N/A'} • {company.is_vat_registered ? 'VAT Registered' : 'Exempt'}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {company.vat_rate_bp ? (company.vat_rate_bp / 100).toFixed(0) : '16'}% VAT
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-stone-700">
                <span className="font-sans text-stone-500">Output VAT (Sales Invoiced):</span>
                <span className="font-bold">
                  {new Money(pnl.taxVatSummary.outputVatMinor, company.currency_code).format()}
                </span>
              </div>

              <div className="flex justify-between text-stone-700">
                <span className="font-sans text-stone-500">Input VAT (Purchase Bills):</span>
                <span>
                  {new Money(pnl.taxVatSummary.inputVatPurchasesMinor, company.currency_code).format()}
                </span>
              </div>

              <div className="flex justify-between text-stone-700">
                <span className="font-sans text-stone-500">Input VAT (Expenses Claimed):</span>
                <span>
                  {new Money(pnl.taxVatSummary.inputVatExpensesMinor, company.currency_code).format()}
                </span>
              </div>

              <div className="flex justify-between text-emerald-800 font-bold border-t border-stone-200 pt-1">
                <span className="font-sans">Total Allowable Input Tax:</span>
                <span>
                  {new Money(pnl.taxVatSummary.totalInputVatMinor, company.currency_code).format()}
                </span>
              </div>

              <div
                className={`flex justify-between p-2.5 rounded-xl border mt-2 ${
                  pnl.taxVatSummary.netVatPayableMinor >= 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-sans">
                  <div className="font-bold text-xs">
                    {pnl.taxVatSummary.netVatPayableMinor >= 0
                      ? 'Net VAT Payable to Revenue Authority'
                      : 'Net Input Tax Credit (Claimable)'}
                  </div>
                  <div className="text-[10px] opacity-75">
                    {pnl.taxVatSummary.netVatPayableMinor >= 0
                      ? 'Payable before 18th of next month'
                      : 'Carried forward to offset future sales tax'}
                  </div>
                </div>
                <div className="text-right font-black text-sm self-center">
                  {new Money(
                    Math.abs(pnl.taxVatSummary.netVatPayableMinor),
                    company.currency_code
                  ).format()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
