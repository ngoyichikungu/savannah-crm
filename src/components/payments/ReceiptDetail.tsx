import React, { useState } from 'react';
import { Company, Contact, Invoice, Organisation, Payment, PaymentAllocation, User } from '../../types';
import { Money } from '../../support/money';
import { DocumentPdfService } from '../../services/documentPdfService';
import { PaymentService } from '../../services/paymentService';
import {
  Printer,
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ReceiptDetailProps {
  payment: Payment;
  allocations: PaymentAllocation[];
  invoices: Invoice[];
  company: Company;
  organisations: Organisation[];
  contacts: Contact[];
  currentUser: User;
  onBack: () => void;
  onPaymentUpdated: () => void;
}

export const ReceiptDetail: React.FC<ReceiptDetailProps> = ({
  payment,
  allocations,
  invoices,
  company,
  organisations,
  contacts,
  currentUser,
  onBack,
  onPaymentUpdated,
}) => {
  const organisation = organisations.find((o) => o.id === payment.organisation_id);
  const contact = contacts.find((c) => c.id === payment.contact_id);

  // Active (non-reversed) allocations for this payment
  const activeAllocations = allocations.filter((a) => a.payment_id === payment.id && !a.is_reversed);
  const reversedAllocations = allocations.filter((a) => a.payment_id === payment.id && a.is_reversed);

  // Client total outstanding balance across all client open invoices
  const clientInvoices = invoices.filter((i) => i.organisation_id === payment.organisation_id);
  const totalClientOutstandingMinor = clientInvoices.reduce((sum, i) => sum + i.balance_due_minor, 0);

  // Reversal state
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [reversalReason, setReversalReason] = useState<string>('');

  const canUnallocate = currentUser.role === 'owner' || currentUser.role === 'admin';

  const handlePrint = () => {
    window.print();
  };

  const handleOpenReversal = (allocId: string) => {
    setSelectedAllocationId(allocId);
    setReversalReason('');
    setReversalModalOpen(true);
  };

  const handleConfirmReversal = () => {
    if (!selectedAllocationId) return;
    try {
      PaymentService.unallocate(selectedAllocationId, currentUser, reversalReason.trim() || undefined);
      setReversalModalOpen(false);
      onPaymentUpdated();
    } catch (err: any) {
      alert(`Unallocation failed: ${err.message}`);
    }
  };

  const receiptHtml = DocumentPdfService.renderReceiptHtml(
    payment,
    allocations,
    invoices,
    company,
    organisation,
    contact,
    totalClientOutstandingMinor
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-stone-900">{payment.receipt_number}</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800">
                Official Receipt
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Payment received from <span className="font-semibold text-stone-800">{organisation?.name}</span> on{' '}
              {payment.payment_date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-print-receipt"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Rendered Official Receipt Document */}
      <div
        className="receipt-print-area shadow-lg rounded-xl overflow-hidden border border-stone-200 bg-white"
        dangerouslySetInnerHTML={{ __html: receiptHtml }}
      />

      {/* Allocations Management & Audit Controls (No-Print Area) */}
      <div className="no-print mt-8 p-6 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Allocation Ledger &amp; Reversal Management
            </h3>
            <p className="text-xs text-stone-500">
              Append-oriented audit trail. Unallocating restores invoice balance and returns funds to unallocated credit.
            </p>
          </div>
          {!canUnallocate && (
            <span className="text-xs text-stone-400 italic">
              (Unallocation requires Owner or Administrator role)
            </span>
          )}
        </div>

        {/* Active Allocations List */}
        <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                <th className="py-2.5 px-3">Allocation ID</th>
                <th className="py-2.5 px-3">Invoice Applied To</th>
                <th className="py-2.5 px-3 text-right">Amount Allocated</th>
                <th className="py-2.5 px-3">Allocated Date</th>
                <th className="py-2.5 px-3">Status</th>
                {canUnallocate && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 font-mono">
              {activeAllocations.map((alloc) => {
                const inv = invoices.find((i) => i.id === alloc.invoice_id);
                return (
                  <tr key={alloc.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 text-stone-500">{alloc.id.slice(0, 12)}...</td>
                    <td className="py-2.5 px-3 font-bold text-stone-900">
                      {inv?.number || `Invoice #${alloc.invoice_id}`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                      {new Money(alloc.amount_minor, payment.currency_code).format()}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 font-sans">
                      {alloc.allocated_at ? alloc.allocated_at.slice(0, 10) : (alloc.created_at || '').slice(0, 10)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    </td>
                    {canUnallocate && (
                      <td className="py-2.5 px-3 text-right font-sans">
                        <button
                          onClick={() => handleOpenReversal(alloc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 rounded text-[11px] font-semibold transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Unallocate</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {reversedAllocations.map((alloc) => {
                const inv = invoices.find((i) => i.id === alloc.invoice_id);
                return (
                  <tr key={alloc.id} className="bg-red-50/40 text-stone-400">
                    <td className="py-2.5 px-3 line-through">{alloc.id.slice(0, 12)}...</td>
                    <td className="py-2.5 px-3 line-through">
                      {inv?.number || `Invoice #${alloc.invoice_id}`}
                    </td>
                    <td className="py-2.5 px-3 text-right line-through">
                      {new Money(alloc.amount_minor, payment.currency_code).format()}
                    </td>
                    <td className="py-2.5 px-3 font-sans line-through">
                      {(alloc.created_at || alloc.allocated_at || '').slice(0, 10)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>Reversed: {alloc.reversal_reason || 'N/A'}</span>
                      </span>
                    </td>
                    {canUnallocate && <td className="py-2.5 px-3 text-right text-[11px] text-stone-400">Reversed</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unallocation / Reversal Confirmation Modal */}
      {reversalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-800">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-stone-900">Confirm Payment Unallocation</h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Unallocating will reverse this allocation record in the ledger, recalculate the invoice balance due, and
              restore its previous status. The allocated amount will be returned to this payment's unallocated credit pool.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Reason for Reversal / Correction *
              </label>
              <textarea
                rows={2}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Allocation error, cheque bounced, or client requested reallocation"
                className="w-full text-xs rounded-lg border-stone-300 focus:ring-stone-800 focus:border-stone-800"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReversalModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-unallocate"
                onClick={handleConfirmReversal}
                className="px-4 py-2 bg-amber-800 text-white rounded-lg text-xs font-bold hover:bg-amber-900 transition-colors shadow-sm"
              >
                Confirm Unallocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
