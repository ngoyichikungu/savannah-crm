import React, { useState } from 'react';
import { Invoice } from '../../types';
import { Money } from '../../support/money';
import { X, AlertCircle, FileText } from 'lucide-react';

interface CreditNoteModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onIssue: (input: { amount_minor: number; reason: string; issue_date?: string }) => void;
}

export const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onIssue,
}) => {
  const balanceMoney = new Money(invoice.balance_due_minor, invoice.currency_code);
  const [amountDecimal, setAmountDecimal] = useState<string>((invoice.balance_due_minor / 100).toFixed(2));
  const [reason, setReason] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amountDecimal);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid credit amount greater than 0.');
      return;
    }

    const minor = Math.round(val * 100);
    if (minor > invoice.balance_due_minor) {
      setError(`Credit note amount cannot exceed remaining balance of ${balanceMoney.format()}.`);
      return;
    }

    if (!reason.trim()) {
      setError('A formal business reason is required for issuing a credit note.');
      return;
    }

    onIssue({
      amount_minor: minor,
      reason: reason.trim(),
      issue_date: issueDate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <h2 className="text-base font-bold text-stone-900">Issue Credit Note</h2>
            <p className="text-xs text-stone-500 font-mono">Invoice: {invoice.number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 text-xs text-purple-900 space-y-1">
            <div className="font-bold uppercase tracking-wider">Accounting Integrity Rule</div>
            <p>
              Sent invoices cannot be directly edited. Adjustments and scope reductions are formally documented via an
              atomic Credit Note.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Credit Amount ({invoice.currency_code}) *
              </label>
              <input
                id="credit-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                max={(invoice.balance_due_minor / 100).toFixed(2)}
                value={amountDecimal}
                onChange={(e) => setAmountDecimal(e.target.value)}
                className="w-full text-base font-mono font-bold rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Issue Date *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border-stone-300 px-3 py-2.5 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Reason for Credit Note *</label>
            <textarea
              id="credit-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scope adjustment per client addendum / Defective unit returned / Discount applied..."
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-credit-note"
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-800 text-white rounded-lg text-xs font-bold hover:bg-purple-900 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Issue Credit Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
