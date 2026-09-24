import React, { useState } from 'react';
import { Invoice } from '../../types';
import { Money } from '../../support/money';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onRecord: (input: {
    amount_minor: number;
    payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'momo' | 'card';
    reference?: string;
    note?: string;
  }) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onRecord,
}) => {
  const balanceMoney = new Money(invoice.balance_due_minor, invoice.currency_code);
  const [amountDecimal, setAmountDecimal] = useState<string>((invoice.balance_due_minor / 100).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'cheque' | 'momo' | 'card'>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amountDecimal);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    const minor = Math.round(val * 100);
    if (minor > invoice.balance_due_minor) {
      setError(`Payment cannot exceed the remaining balance due of ${balanceMoney.format()}.`);
      return;
    }

    onRecord({
      amount_minor: minor,
      payment_method: paymentMethod,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <h2 className="text-base font-bold text-stone-900">Record Payment</h2>
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

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex justify-between items-center text-xs">
            <div>
              <span className="text-stone-500">Current Balance Due:</span>
              <div className="text-sm font-bold font-mono text-red-700">{balanceMoney.format()}</div>
            </div>
            <div>
              <span className="text-stone-500">Total Invoiced:</span>
              <div className="text-sm font-semibold font-mono text-stone-900">
                {new Money(invoice.total_minor, invoice.currency_code).format()}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
              Payment Amount ({invoice.currency_code}) *
            </label>
            <input
              id="payment-amount-input"
              type="number"
              step="0.01"
              min="0.01"
              max={(invoice.balance_due_minor / 100).toFixed(2)}
              value={amountDecimal}
              onChange={(e) => setAmountDecimal(e.target.value)}
              className="w-full text-base font-mono font-bold rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
              required
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setAmountDecimal((invoice.balance_due_minor / 100).toFixed(2))}
                className="text-[11px] text-emerald-700 hover:underline font-semibold"
              >
                Pay Full Balance
              </button>
              <button
                type="button"
                onClick={() => setAmountDecimal((invoice.balance_due_minor / 200).toFixed(2))}
                className="text-[11px] text-stone-600 hover:underline"
              >
                Pay 50%
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Payment Method *</label>
            <select
              id="payment-method-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800 bg-white"
            >
              <option value="bank_transfer">Direct Bank Transfer (EFT/RTGS)</option>
              <option value="momo">Mobile Money (Airtel / MTN MoMo)</option>
              <option value="cash">Cash in Hand</option>
              <option value="cheque">Company Cheque</option>
              <option value="card">Point of Sale / Card</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Payment Reference / Transaction ID</label>
            <input
              id="payment-reference-input"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. EFT-992140 or MTN-TRX-10294"
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">Internal Note (Optional)</label>
            <textarea
              id="payment-note-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add remittance advice note or receipt remarks..."
              className="w-full text-xs rounded-lg border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-800 focus:ring-stone-800"
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
              id="btn-confirm-payment"
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm &amp; Allocate Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
