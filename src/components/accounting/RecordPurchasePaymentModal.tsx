import React, { useState } from 'react';
import { PurchaseInvoice } from '../../types/accounting';
import { Company, PaymentMethod, User } from '../../types';
import { AccountingService } from '../../services/accountingService';
import { CreditCard, X, Check } from 'lucide-react';
import { Money } from '../../support/money';

interface RecordPurchasePaymentModalProps {
  company: Company;
  currentUser: User;
  invoice: PurchaseInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedInvoice: PurchaseInvoice) => void;
}

export const RecordPurchasePaymentModal: React.FC<RecordPurchasePaymentModalProps> = ({
  company,
  currentUser,
  invoice,
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!isOpen || !invoice) return null;

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountStr, setAmountStr] = useState((invoice.balance_due_minor / 100).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedAmountMinor = Math.round((parseFloat(amountStr) || 0) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmountMinor <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (parsedAmountMinor > invoice.balance_due_minor) {
      setError('Payment amount exceeds outstanding balance.');
      return;
    }

    try {
      const updated = AccountingService.recordPurchasePayment(invoice.id, {
        payment_date: paymentDate,
        amount_minor: parsedAmountMinor,
        payment_method: paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        recorded_by_user_id: currentUser.id,
      });

      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record bill payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Record Payment to Supplier
              </h2>
              <p className="text-xs text-stone-500">Accounts Payable Disbursal</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Bill Summary Banner */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-stone-500">Supplier:</span>
              <span className="font-bold text-stone-900">{invoice.supplier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Bill Number:</span>
              <span className="font-mono font-bold text-blue-700">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Total Bill Value:</span>
              <span className="font-mono text-stone-700">
                {new Money(invoice.total_minor, company.currency_code).format()}
              </span>
            </div>
            <div className="flex justify-between border-t border-stone-200/80 pt-1 text-xs">
              <span className="font-bold text-stone-800">Outstanding Balance Due:</span>
              <span className="font-mono font-black text-rose-700 text-sm">
                {new Money(invoice.balance_due_minor, company.currency_code).format()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Disbursal Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Amount Paid ({company.currency_code}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={(invoice.balance_due_minor / 100).toFixed(2)}
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
            >
              <option value="bank_transfer">Bank Transfer (EFT / Stanbic / Absa / FNB)</option>
              <option value="mobile_money">Mobile Money (Airtel / MTN Merchant)</option>
              <option value="card">Company Debit / Credit Card</option>
              <option value="cheque">Company Cheque</option>
              <option value="cash">Petty Cash</option>
              <option value="other">Other Settlement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Bank / Disbursal Reference #
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. FT-STANBIC-99214, CHQ-004812"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Disbursal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Full settlement authorized by finance director..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
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
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Disbursal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
