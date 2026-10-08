import React, { useState } from 'react';
import { BusinessExpense, EXPENSE_CATEGORIES, ExpenseCategory } from '../../types/accounting';
import { Company, User } from '../../types';
import { Money } from '../../support/money';
import {
  Plus,
  Search,
  Download,
  Receipt,
  Trash2,
  Edit2,
  Tag,
} from 'lucide-react';

interface ExpenseListProps {
  company: Company;
  currentUser?: User;
  expenses: BusinessExpense[];
  onOpenCreate: () => void;
  onEdit: (expense: BusinessExpense) => void;
  onDelete: (expense: BusinessExpense) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  company,
  expenses,
  onOpenCreate,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filtered = expenses.filter((e) => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && e.status !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        e.title.toLowerCase().includes(q) ||
        e.payee_merchant.toLowerCase().includes(q) ||
        e.expense_number.toLowerCase().includes(q) ||
        (e.reference && e.reference.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const totalGrossMinor = filtered.reduce((acc, e) => acc + e.amount_minor, 0);
  const totalNetMinor = filtered.reduce((acc, e) => acc + e.net_amount_minor, 0);
  const totalVatMinor = filtered.reduce((acc, e) => acc + e.vat_minor, 0);

  const getCategoryMeta = (catId: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.id === catId) || {
      name: catId,
      group: 'operating',
    };
  };

  const handleExportCsv = () => {
    const headers = ['Expense #', 'Date', 'Payee / Merchant', 'Title', 'Category', 'Payment Method', 'Net Amount', 'VAT', 'Gross Total', 'Status', 'Reference'];
    const rows = filtered.map((e) => [
      `"${e.expense_number}"`,
      `"${e.date}"`,
      `"${e.payee_merchant}"`,
      `"${e.title}"`,
      `"${getCategoryMeta(e.category).name}"`,
      `"${e.payment_method}"`,
      (e.net_amount_minor / 100).toFixed(2),
      (e.vat_minor / 100).toFixed(2),
      (e.amount_minor / 100).toFixed(2),
      `"${e.status}"`,
      `"${e.reference || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expenses_${company.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Total Expense Outflow
          </span>
          <div className="text-2xl font-black font-mono text-stone-900 mt-1">
            {new Money(totalGrossMinor, company.currency_code).format()}
          </div>
          <span className="text-xs text-stone-400 mt-0.5">{filtered.length} recorded expenses</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
            Net Operating Costs
          </span>
          <div className="text-2xl font-bold font-mono text-stone-800 mt-1">
            {new Money(totalNetMinor, company.currency_code).format()}
          </div>
          <span className="text-xs text-stone-400 mt-0.5">Excluding claimable VAT</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Input VAT Claimable
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
            {new Money(totalVatMinor, company.currency_code).format()}
          </div>
          <span className="text-xs text-emerald-600 mt-0.5">Offset against sales tax</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Expense Actions
            </span>
            <div className="text-xs text-stone-500 mt-0.5">Capture operational slips</div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              id="btn-add-expense"
              onClick={onOpenCreate}
              className="flex-1 px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Record Expense</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              title="Export expenses to CSV"
              className="p-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by merchant, title, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:border-amber-600"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:border-amber-600"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Settled / Paid</option>
            <option value="pending">Pending</option>
            <option value="reimbursed">Reimbursed</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="text-stone-800 font-bold text-sm">No business expenses found</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No expenses match your search or filter criteria. Record day-to-day operational expenses to track costs.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Expense # &amp; Date</th>
                  <th className="py-3 px-4">Payee / Merchant</th>
                  <th className="py-3 px-4">Purpose / Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method &amp; Ref</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-right">VAT</th>
                  <th className="py-3 px-4 text-right">Total Outflow</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filtered.map((exp) => {
                  const meta = getCategoryMeta(exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-amber-50/30 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-stone-900">{exp.expense_number}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{exp.date}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-800">
                        {exp.payee_merchant}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-stone-900 max-w-[200px] truncate" title={exp.title}>
                          {exp.title}
                        </div>
                        {exp.receipt_ref && (
                          <div className="text-[10px] text-stone-400 font-mono">
                            Doc: {exp.receipt_ref}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          <Tag className="w-2.5 h-2.5 text-amber-700" />
                          <span>{meta.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium capitalize text-stone-700 text-[11px]">
                          {exp.payment_method.replace('_', ' ')}
                        </div>
                        {exp.reference && (
                          <div className="text-[10px] text-stone-400 font-mono truncate max-w-[120px]">
                            {exp.reference}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700">
                        {new Money(exp.net_amount_minor, company.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                        {exp.vat_minor > 0
                          ? new Money(exp.vat_minor, company.currency_code).format()
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-stone-900">
                        {new Money(exp.amount_minor, company.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            exp.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : exp.status === 'pending'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(exp)}
                            className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(exp)}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
