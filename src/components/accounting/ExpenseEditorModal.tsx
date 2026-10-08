import React, { useState, useEffect } from 'react';
import { BusinessExpense, EXPENSE_CATEGORIES, ExpenseCategory } from '../../types/accounting';
import { Company, PaymentMethod, User } from '../../types';
import { AccountingService } from '../../services/accountingService';
import { Receipt, X, Check, Calculator, CreditCard } from 'lucide-react';
import { Money } from '../../support/money';

interface ExpenseEditorModalProps {
  company: Company;
  currentUser: User;
  expense?: BusinessExpense | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (expense: BusinessExpense) => void;
}

export const ExpenseEditorModal: React.FC<ExpenseEditorModalProps> = ({
  company,
  currentUser,
  expense,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState(expense?.title || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || 'office_supplies');
  const [amountStr, setAmountStr] = useState(
    expense ? (expense.amount_minor / 100).toFixed(2) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense?.payment_method || 'mobile_money');
  const [payeeMerchant, setPayeeMerchant] = useState(expense?.payee_merchant || '');
  const [supplierId, setSupplierId] = useState(expense?.supplier_id || '');
  const [reference, setReference] = useState(expense?.reference || '');
  const [receiptRef, setReceiptRef] = useState(expense?.receipt_ref || '');
  const [isTaxDeductible, setIsTaxDeductible] = useState(expense?.is_tax_deductible ?? true);
  const [isVatable, setIsVatable] = useState(expense?.is_vatable ?? company.is_vat_registered);
  const [status, setStatus] = useState<'paid' | 'pending' | 'reimbursed'>(expense?.status || 'paid');
  const [error, setError] = useState<string | null>(null);

  const suppliers = AccountingService.getSuppliers(company.id);

  useEffect(() => {
    if (expense) {
      setDate(expense.date);
      setTitle(expense.title);
      setDescription(expense.description || '');
      setCategory(expense.category);
      setAmountStr((expense.amount_minor / 100).toFixed(2));
      setPaymentMethod(expense.payment_method);
      setPayeeMerchant(expense.payee_merchant);
      setSupplierId(expense.supplier_id || '');
      setReference(expense.reference || '');
      setReceiptRef(expense.receipt_ref || '');
      setIsTaxDeductible(expense.is_tax_deductible);
      setIsVatable(expense.is_vatable);
      setStatus(expense.status);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setDescription('');
      setCategory('office_supplies');
      setAmountStr('');
      setPaymentMethod('mobile_money');
      setPayeeMerchant('');
      setSupplierId('');
      setReference('');
      setReceiptRef('');
      setIsTaxDeductible(true);
      setIsVatable(company.is_vat_registered);
      setStatus('paid');
    }
    setError(null);
  }, [expense, isOpen, company]);

  if (!isOpen) return null;

  const parsedAmount = Math.max(0, Math.round((parseFloat(amountStr) || 0) * 100));
  const vatRateBp = isVatable && company.is_vat_registered ? company.vat_rate_bp || 1600 : 0;
  const rateMultiplier = 1 + vatRateBp / 10000;
  const netMinor = isVatable && vatRateBp > 0 ? Math.round(parsedAmount / rateMultiplier) : parsedAmount;
  const vatMinor = parsedAmount - netMinor;

  const handleSupplierSelect = (id: string) => {
    setSupplierId(id);
    if (id) {
      const s = suppliers.find((sup) => sup.id === id);
      if (s) {
        setPayeeMerchant(s.name);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Expense description or title is required.');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!payeeMerchant.trim()) {
      setError('Payee or merchant name is required.');
      return;
    }

    try {
      if (expense) {
        const updated = AccountingService.updateExpense(expense.id, {
          date,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          amount_minor: parsedAmount,
          payment_method: paymentMethod,
          payee_merchant: payeeMerchant.trim(),
          supplier_id: supplierId || undefined,
          reference: reference.trim() || undefined,
          receipt_ref: receiptRef.trim() || undefined,
          is_tax_deductible: isTaxDeductible,
          is_vatable: isVatable,
          vat_rate_bp: vatRateBp,
          vat_minor: vatMinor,
          net_amount_minor: netMinor,
          status,
        });
        onSaved(updated);
      } else {
        const created = AccountingService.createExpense(company, {
          date,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          amount_minor: parsedAmount,
          payment_method: paymentMethod,
          payee_merchant: payeeMerchant.trim(),
          supplier_id: supplierId || undefined,
          reference: reference.trim() || undefined,
          receipt_ref: receiptRef.trim() || undefined,
          is_tax_deductible: isTaxDeductible,
          is_vatable: isVatable,
          status,
          recorded_by_user_id: currentUser.id,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save business expense.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                {expense ? 'Edit Business Expense' : 'Record Business Expense'}
              </h2>
              <p className="text-xs text-stone-500">Capture operating expenditure &amp; input tax credit</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Settlement Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white font-medium"
              >
                <option value="paid">Settled / Paid</option>
                <option value="pending">Pending Approval / Reimbursement</option>
                <option value="reimbursed">Reimbursed to Staff</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Expense Title / Purpose *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ZESCO Commercial Power Token, Office High-Speed Internet, Staff Fuel"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Expense Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white font-bold"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.group.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Total Amount Paid ({company.currency_code}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-3 pr-12 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white font-mono font-bold text-base"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-mono font-bold">
                  {company.currency_code}
                </span>
              </div>
            </div>
          </div>

          {/* Tax / VAT Calculation Breakdown Card */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-sans font-bold flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-stone-400" />
                Input Tax Breakdown:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer font-sans text-[11px] text-stone-700 font-bold">
                <input
                  type="checkbox"
                  checked={isVatable}
                  disabled={!company.is_vat_registered}
                  onChange={(e) => setIsVatable(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Includes VAT ({company.vat_rate_bp ? (company.vat_rate_bp / 100).toFixed(0) : '16'}%)</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-200/60 text-[11px]">
              <div>
                <span className="text-stone-400 block font-sans text-[10px]">Net Expense</span>
                <span className="font-bold text-stone-800">
                  {new Money(netMinor, company.currency_code).format()}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-sans text-[10px]">Claimable Input VAT</span>
                <span className="font-bold text-emerald-700">
                  {new Money(vatMinor, company.currency_code).format()}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-sans text-[10px]">Gross Cash Outflow</span>
                <span className="font-black text-stone-900">
                  {new Money(parsedAmount, company.currency_code).format()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Payee / Merchant Name *</span>
                {suppliers.length > 0 && (
                  <span className="text-[10px] text-stone-400 font-normal">Or link supplier</span>
                )}
              </label>
              <input
                type="text"
                required
                value={payeeMerchant}
                onChange={(e) => setPayeeMerchant(e.target.value)}
                placeholder="e.g. Puma Energy, Arcades Properties, Amazon"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Link to Registered Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => handleSupplierSelect(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              >
                <option value="">None / Ad-hoc Merchant</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-stone-400" />
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              >
                <option value="mobile_money">Mobile Money (Airtel / MTN / Zamtel)</option>
                <option value="bank_transfer">Bank Transfer (EFT / RTGS)</option>
                <option value="card">Company Debit / Credit Card</option>
                <option value="cash">Petty Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Payment Reference / Transaction ID
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. MOMO-881920, FT-STANBIC-901"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Receipt / Tax Invoice Number
              </label>
              <input
                type="text"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                placeholder="e.g. RCP-2026-9912"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white font-mono"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-800 font-bold">
                <input
                  type="checkbox"
                  checked={isTaxDeductible}
                  onChange={(e) => setIsTaxDeductible(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Allowable Business Deduction for Corporate Tax</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed justification or project cost attribution notes..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{expense ? 'Save Changes' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
