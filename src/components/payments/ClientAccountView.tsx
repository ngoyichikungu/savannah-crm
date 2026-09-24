import React, { useState, useMemo } from 'react';
import { Company, Invoice, Organisation, Payment, PaymentAllocation, User } from '../../types';
import { Money } from '../../support/money';
import { PaymentService } from '../../services/paymentService';
import {
  Building2,
  Receipt,
  FileText,
  CreditCard,
  History,
} from 'lucide-react';

interface ClientAccountViewProps {
  company: Company;
  organisations: Organisation[];
  invoices: Invoice[];
  payments: Payment[];
  allocations: PaymentAllocation[];
  currentUser?: User;
  onRecordPaymentForClient: (orgId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onViewReceipt: (paymentId: string) => void;
}

export const ClientAccountView: React.FC<ClientAccountViewProps> = ({
  company,
  organisations,
  invoices,
  payments,
  allocations,
  onRecordPaymentForClient,
  onViewInvoice,
  onViewReceipt,
}) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organisations[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payments' | 'ledger'>('invoices');

  const selectedOrg = organisations.find((o) => o.id === selectedOrgId);
  const clientInvoices = invoices.filter((i) => i.organisation_id === selectedOrgId);

  // Client summary calculation
  const summary = useMemo(() => {
    if (!selectedOrgId) return null;
    return PaymentService.getClientAccountSummary(company.id, selectedOrgId);
  }, [company.id, selectedOrgId, invoices, payments, allocations]);

  if (!selectedOrg || !summary) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-stone-200">
        <Building2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
        <p className="text-stone-500 text-xs">No client organisations registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-stone-900 text-stone-100 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center font-bold font-mono text-lg">
              {selectedOrg.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{selectedOrg.name}</h1>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                {selectedOrg.tpin && <span>TPIN: {selectedOrg.tpin}</span>}
                {selectedOrg.email && <span>{selectedOrg.email}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Select Client</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {organisations.map((org) => (
                <option key={org.id} value={org.id} className="bg-stone-800 text-white">
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onRecordPaymentForClient(selectedOrgId)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Total Invoiced</span>
          <div className="text-xl font-bold font-mono text-stone-900">
            {new Money(summary.total_invoiced_minor, company.currency_code).format()}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">{clientInvoices.length} invoices issued</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Paid &amp; Settled</span>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {new Money(summary.total_paid_minor, company.currency_code).format()}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">{summary.payments.length} payments recorded</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">Outstanding Balance</span>
          <div
            className={`text-xl font-bold font-mono ${
              summary.total_outstanding_minor > 0 ? 'text-amber-800 font-black' : 'text-stone-900'
            }`}
          >
            {new Money(summary.total_outstanding_minor, company.currency_code).format()}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {clientInvoices.filter((i) => i.balance_due_minor > 0).length} invoices open
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Available Client Credit</span>
          <div className="text-xl font-bold font-mono text-blue-700">
            {new Money(summary.unallocated_credit_minor, company.currency_code).format()}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Unallocated remainder balance</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-stone-200 flex items-center space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`py-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'invoices'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices ({clientInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payments')}
          className={`py-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'payments'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment Receipts ({summary.payments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`py-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'ledger'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Allocation Ledger ({summary.allocations.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {clientInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-stone-900">{inv.number}</td>
                  <td className="py-3 px-4 text-stone-600">{inv.issue_date}</td>
                  <td className="py-3 px-4 text-stone-600">{inv.due_date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'partially_paid'
                          ? 'bg-blue-100 text-blue-800'
                          : inv.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-stone-800">
                    {new Money(inv.total_minor, inv.currency_code).format()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800">
                    {new Money(inv.amount_paid_minor, inv.currency_code).format()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                    {new Money(inv.balance_due_minor, inv.currency_code).format()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onViewInvoice(inv.id)}
                      className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'payments' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Method &amp; Ref</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-right">Allocated</th>
                <th className="py-3 px-4 text-right">Unallocated Credit</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {summary.payments.map((pmt) => (
                <tr key={pmt.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-stone-900">{pmt.receipt_number}</td>
                  <td className="py-3 px-4 text-stone-600">{pmt.payment_date}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-stone-800 uppercase text-[10px]">{pmt.method}</span>
                    {pmt.reference && <span className="block text-[10px] text-stone-400 font-mono">{pmt.reference}</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                    {new Money(pmt.amount_minor, pmt.currency_code).format()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-800">
                    {new Money(pmt.allocated_minor, pmt.currency_code).format()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {pmt.unallocated_minor > 0 ? (
                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                        {new Money(pmt.unallocated_minor, pmt.currency_code).format()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onViewReceipt(pmt.id)}
                      className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs"
                    >
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                <th className="py-3 px-4">Allocation ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Receipt #</th>
                <th className="py-3 px-4">Applied Invoice #</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Ledger Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 font-mono">
              {summary.allocations.map((alloc) => {
                const pmt = summary.payments.find((p) => p.id === alloc.payment_id);
                const inv = invoices.find((i) => i.id === alloc.invoice_id);

                return (
                  <tr key={alloc.id} className={alloc.is_reversed ? 'bg-red-50/50 text-stone-400' : 'hover:bg-stone-50/80'}>
                    <td className="py-3 px-4 text-stone-500">{alloc.id.slice(0, 10)}...</td>
                    <td className="py-3 px-4 font-sans text-stone-600">
                      {alloc.allocated_at ? alloc.allocated_at.slice(0, 10) : (alloc.created_at || '').slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">{pmt?.receipt_number || alloc.payment_id}</td>
                    <td className="py-3 px-4 font-bold text-stone-900">{inv?.number || alloc.invoice_id}</td>
                    <td className={`py-3 px-4 text-right font-bold ${alloc.is_reversed ? 'line-through text-stone-400' : 'text-emerald-800'}`}>
                      {new Money(alloc.amount_minor, company.currency_code).format()}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {alloc.is_reversed ? (
                        <span className="text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded font-bold">
                          REVERSED ({alloc.reversal_reason || 'Manual unallocation'})
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                          ACTIVE LEDGER ENTRY
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
