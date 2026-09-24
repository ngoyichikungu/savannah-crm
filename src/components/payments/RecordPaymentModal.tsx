import React, { useState, useEffect, useMemo } from 'react';
import { Company, Contact, Invoice, Organisation, PaymentMethod, User } from '../../types';
import { Money } from '../../support/money';
import { PaymentService, AllocationInput } from '../../services/paymentService';
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Coins,
  AlertTriangle,
} from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  organisations: Organisation[];
  contacts: Contact[];
  invoices: Invoice[];
  currentUser: User;
  preselectedOrganisationId?: string;
  preselectedInvoiceId?: string;
  onPaymentRecorded: (paymentId: string) => void;
}

type AllocationMode = 'auto-oldest-first' | 'auto-proportional' | 'manual';

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  company,
  organisations,
  contacts,
  invoices,
  currentUser,
  preselectedOrganisationId,
  preselectedInvoiceId,
  onPaymentRecorded,
}) => {
  if (!isOpen) return null;

  // Selected client
  const [organisationId, setOrganisationId] = useState<string>(() => {
    if (preselectedOrganisationId) return preselectedOrganisationId;
    if (preselectedInvoiceId) {
      const inv = invoices.find((i) => i.id === preselectedInvoiceId);
      if (inv) return inv.organisation_id;
    }
    return organisations[0]?.id || '';
  });

  const [contactId, setContactId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Payment amount entered in decimal string
  const [amountInput, setAmountInput] = useState<string>(() => {
    if (preselectedInvoiceId) {
      const inv = invoices.find((i) => i.id === preselectedInvoiceId);
      if (inv && inv.balance_due_minor > 0) {
        return (inv.balance_due_minor / 100).toFixed(2);
      }
    }
    return '0.00';
  });

  // Client unallocated credit application
  const [applyCredit, setApplyCredit] = useState<boolean>(false);
  const [creditToApplyInput, setCreditToApplyInput] = useState<string>('0.00');

  // Allocation mode
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('auto-oldest-first');

  // Manual allocations map: invoiceId -> string input
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});

  // Client available credit from prior payments
  const clientAvailableCreditMinor = useMemo(() => {
    if (!organisationId) return 0;
    return PaymentService.getClientUnallocatedCredit(company.id, organisationId);
  }, [company.id, organisationId]);

  // Open invoices for selected client
  const clientOpenInvoices = useMemo(() => {
    return invoices
      .filter(
        (inv) =>
          inv.company_id === company.id &&
          inv.organisation_id === organisationId &&
          inv.balance_due_minor > 0 &&
          inv.status !== 'draft' &&
          inv.status !== 'cancelled' &&
          inv.status !== 'credited'
      )
      .sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());
  }, [invoices, company.id, organisationId]);

  // Client contacts
  const clientContacts = useMemo(() => {
    return contacts.filter((c) => c.organisation_id === organisationId && c.is_active);
  }, [contacts, organisationId]);

  // Parse entered amount
  const enteredAmountMinor = useMemo(() => {
    const parsed = parseFloat(amountInput) || 0;
    return Math.max(0, Math.round(parsed * 100));
  }, [amountInput]);

  // Parse credit to apply
  const creditAppliedMinor = useMemo(() => {
    if (!applyCredit || clientAvailableCreditMinor <= 0) return 0;
    const parsed = parseFloat(creditToApplyInput) || 0;
    const minor = Math.max(0, Math.round(parsed * 100));
    return Math.min(minor, clientAvailableCreditMinor);
  }, [applyCredit, creditToApplyInput, clientAvailableCreditMinor]);

  const totalFundsAvailableMinor = enteredAmountMinor + creditAppliedMinor;

  // Auto-run allocation calculations when inputs change
  useEffect(() => {
    if (clientAvailableCreditMinor > 0 && !applyCredit) {
      // Prompt user or default credit input
      setCreditToApplyInput((clientAvailableCreditMinor / 100).toFixed(2));
    }
  }, [clientAvailableCreditMinor]);

  // Calculate current allocations based on mode
  const calculatedAllocations = useMemo((): AllocationInput[] => {
    if (allocationMode === 'auto-oldest-first') {
      return PaymentService.calculateOldestFirst(clientOpenInvoices, totalFundsAvailableMinor);
    } else if (allocationMode === 'auto-proportional') {
      return PaymentService.calculateProportional(clientOpenInvoices, totalFundsAvailableMinor, company.currency_code);
    } else {
      // Manual mode
      return clientOpenInvoices
        .map((inv) => {
          const val = parseFloat(manualAllocations[inv.id] || '0') || 0;
          return {
            invoice_id: inv.id,
            amount_minor: Math.round(val * 100),
          };
        })
        .filter((a) => a.amount_minor > 0);
    }
  }, [allocationMode, clientOpenInvoices, totalFundsAvailableMinor, company.currency_code, manualAllocations]);

  // Synchronize manual inputs when switching modes
  const handleModeSwitch = (newMode: AllocationMode) => {
    setAllocationMode(newMode);
    if (newMode === 'manual') {
      // Seed manual allocations from current auto calculation
      const autoAlloc =
        allocationMode === 'auto-proportional'
          ? PaymentService.calculateProportional(clientOpenInvoices, totalFundsAvailableMinor, company.currency_code)
          : PaymentService.calculateOldestFirst(clientOpenInvoices, totalFundsAvailableMinor);

      const map: Record<string, string> = {};
      autoAlloc.forEach((a) => {
        map[a.invoice_id] = (a.amount_minor / 100).toFixed(2);
      });
      setManualAllocations(map);
    }
  };

  // Total allocated sum
  const totalAllocatedMinor = useMemo(() => {
    return calculatedAllocations.reduce((sum, a) => sum + a.amount_minor, 0);
  }, [calculatedAllocations]);

  // Unallocated remainder (retained as client credit)
  const unallocatedRemainderMinor = Math.max(0, totalFundsAvailableMinor - totalAllocatedMinor);

  // Validation
  const validationError = useMemo(() => {
    if (enteredAmountMinor === 0 && creditAppliedMinor === 0) {
      return 'Please enter a payment amount received or apply available client credit.';
    }
    if (totalAllocatedMinor > totalFundsAvailableMinor) {
      return `Total allocated (${new Money(totalAllocatedMinor, company.currency_code).format()}) exceeds total funds available (${new Money(totalFundsAvailableMinor, company.currency_code).format()}).`;
    }
    // Check invoice limit violations in manual mode
    for (const alloc of calculatedAllocations) {
      const inv = clientOpenInvoices.find((i) => i.id === alloc.invoice_id);
      if (inv && alloc.amount_minor > inv.balance_due_minor) {
        return `Allocation of ${new Money(alloc.amount_minor, company.currency_code).format()} exceeds balance due of ${inv.number} (${new Money(inv.balance_due_minor, company.currency_code).format()}).`;
      }
    }
    return null;
  }, [enteredAmountMinor, creditAppliedMinor, totalAllocatedMinor, totalFundsAvailableMinor, calculatedAllocations, clientOpenInvoices, company.currency_code]);

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const res = PaymentService.recordPayment({
        company,
        organisation_id: organisationId,
        contact_id: contactId || undefined,
        payment_date: paymentDate,
        method,
        reference: reference.trim() || undefined,
        currency_code: company.currency_code,
        amount_minor: enteredAmountMinor,
        use_unallocated_credit_minor: creditAppliedMinor,
        allocations: calculatedAllocations,
        notes: notes.trim() || undefined,
        received_by_user_id: currentUser.id,
      });

      onPaymentRecorded(res.payment.id);
      onClose();
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    }
  };

  const selectedOrg = organisations.find((o) => o.id === organisationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-amber-300 font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Client Payment &amp; Issue Receipt</h2>
              <p className="text-xs text-stone-400">
                Lump sum recording, proportional distribution, and append-only ledger allocation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Client & Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <label className="block font-bold uppercase text-stone-700 mb-1">Client / Organisation *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
                <select
                  id="payment-client-select"
                  value={organisationId}
                  onChange={(e) => {
                    setOrganisationId(e.target.value);
                    setContactId('');
                    setManualAllocations({});
                  }}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800 bg-white"
                  required
                >
                  {organisations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase text-stone-700 mb-1">Attention Contact</label>
              <select
                id="payment-contact-select"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800 bg-white"
              >
                <option value="">-- Client Accounts Desk --</option>
                {clientContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.job_title ? `(${c.job_title})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-stone-700 mb-1">Payment Date *</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  id="payment-date-input"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase text-stone-700 mb-1">Payment Method *</label>
              <select
                id="payment-method-select"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800 bg-white font-medium"
              >
                <option value="bank_transfer">Bank Transfer (EFT / Wire)</option>
                <option value="mobile_money">Mobile Money (Airtel / MTN / Zamtel)</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="card">Card (POS / Debit)</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-stone-700 mb-1">Reference / Tx ID / Cheque #</label>
              <input
                id="payment-ref-input"
                type="text"
                placeholder="e.g. STANBIC-EFT-99182"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-stone-700 mb-1">Amount Received ({company.currency_code}) *</label>
              <input
                id="payment-amount-input"
                type="number"
                step="0.01"
                min="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold text-emerald-800 rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800"
                required
              />
            </div>
          </div>

          {/* Unallocated Credit Callout (Retention & Surfacing) */}
          {clientAvailableCreditMinor > 0 && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Coins className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-amber-950 text-xs">
                    Client Account Credit Available:{' '}
                    <span className="font-mono text-emerald-800">
                      {new Money(clientAvailableCreditMinor, company.currency_code).format()}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    This client has unallocated remainder from previous payments that can be applied to open invoices.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-950">
                  <input
                    id="apply-client-credit-check"
                    type="checkbox"
                    checked={applyCredit}
                    onChange={(e) => setApplyCredit(e.target.checked)}
                    className="rounded text-amber-800 focus:ring-amber-800"
                  />
                  <span>Apply Credit ({company.currency_code})</span>
                </label>

                {applyCredit && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={clientAvailableCreditMinor / 100}
                    value={creditToApplyInput}
                    onChange={(e) => setCreditToApplyInput(e.target.value)}
                    className="w-24 px-2 py-1 text-xs font-mono font-bold rounded border-amber-300 bg-white"
                  />
                )}
              </div>
            </div>
          )}

          {/* Allocation Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200">
              <div>
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                  Allocate to Client Invoices
                </h3>
                <p className="text-[11px] text-stone-500">
                  {clientOpenInvoices.length} open invoice{clientOpenInvoices.length === 1 ? '' : 's'} with outstanding balances for{' '}
                  <span className="font-semibold text-stone-800">{selectedOrg?.name}</span>
                </p>
              </div>

              {/* Allocation Mode Toggles */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 self-start">
                <button
                  type="button"
                  id="btn-mode-oldest"
                  onClick={() => handleModeSwitch('auto-oldest-first')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    allocationMode === 'auto-oldest-first'
                      ? 'bg-stone-900 text-amber-300 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Auto (Oldest First)
                </button>
                <button
                  type="button"
                  id="btn-mode-proportional"
                  onClick={() => handleModeSwitch('auto-proportional')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    allocationMode === 'auto-proportional'
                      ? 'bg-stone-900 text-amber-300 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Auto (Proportional)
                </button>
                <button
                  type="button"
                  id="btn-mode-manual"
                  onClick={() => handleModeSwitch('manual')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    allocationMode === 'manual'
                      ? 'bg-stone-900 text-amber-300 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Manual Entry
                </button>
              </div>
            </div>

            {/* Invoices List Table */}
            {clientOpenInvoices.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-stone-800">No Open Invoices Outstanding</div>
                <p className="text-stone-500 max-w-sm mx-auto text-[11px]">
                  All invoices for this client are settled in full. The recorded payment will be held entirely as unallocated client credit on account.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 text-[11px] uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200">
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Issue Date</th>
                      <th className="py-2 px-3 text-right">Invoice Total</th>
                      <th className="py-2 px-3 text-right">Already Paid</th>
                      <th className="py-2 px-3 text-right">Balance Due</th>
                      <th className="py-2 px-3 text-right w-36">Allocating Now</th>
                      <th className="py-2 px-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {clientOpenInvoices.map((inv) => {
                      const allocItem = calculatedAllocations.find((a) => a.invoice_id === inv.id);
                      const allocMinor = allocItem?.amount_minor || 0;
                      const newRemainingMinor = Math.max(0, inv.balance_due_minor - allocMinor);

                      return (
                        <tr key={inv.id} className="hover:bg-stone-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-stone-900">{inv.number}</td>
                          <td className="py-2.5 px-3 text-stone-600">{inv.issue_date}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-700">
                            {new Money(inv.total_minor, inv.currency_code).format()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                            {new Money(inv.amount_paid_minor, inv.currency_code).format()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                            {new Money(inv.balance_due_minor, inv.currency_code).format()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {allocationMode === 'manual' ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={inv.balance_due_minor / 100}
                                value={manualAllocations[inv.id] || ''}
                                onChange={(e) =>
                                  setManualAllocations({
                                    ...manualAllocations,
                                    [inv.id]: e.target.value,
                                  })
                                }
                                placeholder="0.00"
                                className="w-28 px-2 py-1 text-right text-xs font-mono font-bold rounded border-stone-300 focus:ring-stone-800"
                              />
                            ) : (
                              <span
                                className={`font-bold ${
                                  allocMinor > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded' : 'text-stone-400'
                                }`}
                              >
                                {new Money(allocMinor, inv.currency_code).format()}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-800">
                            {new Money(newRemainingMinor, inv.currency_code).format()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Running Totals & Summary Card */}
          <div className="p-4 bg-stone-900 text-stone-100 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block">Total Funds Available:</span>
                <span className="font-mono font-bold text-sm text-white">
                  {new Money(totalFundsAvailableMinor, company.currency_code).format()}
                </span>
                {creditAppliedMinor > 0 && (
                  <span className="text-[10px] text-amber-400 block font-sans">
                    Includes {new Money(creditAppliedMinor, company.currency_code).format()} credit
                  </span>
                )}
              </div>

              <div>
                <span className="text-stone-400 block">Allocated to Invoices:</span>
                <span className="font-mono font-bold text-sm text-emerald-400">
                  {new Money(totalAllocatedMinor, company.currency_code).format()}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block">Unallocated Remainder:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    unallocatedRemainderMinor > 0 ? 'text-amber-400' : 'text-stone-400'
                  }`}
                >
                  {new Money(unallocatedRemainderMinor, company.currency_code).format()}
                </span>
                {unallocatedRemainderMinor > 0 && (
                  <span className="text-[10px] text-amber-300/80 block font-sans">
                    Retained as credit on client account
                  </span>
                )}
              </div>

              <div>
                <span className="text-stone-400 block">Open Invoices Affected:</span>
                <span className="font-mono font-bold text-sm text-white">
                  {calculatedAllocations.length} of {clientOpenInvoices.length}
                </span>
              </div>
            </div>

            {validationError && (
              <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-200 rounded-lg flex items-center gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold uppercase text-stone-700 mb-1">Receipt Notes / Remittance Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Settled via Stanbic RTGS, ref remittance advice #55491"
              className="w-full px-3 py-2 text-xs rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            id="btn-confirm-record-payment"
            onClick={handleSubmit}
            disabled={!!validationError}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <span>Record Payment &amp; Generate Receipt</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
