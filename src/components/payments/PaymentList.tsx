import React, { useState, useMemo } from 'react';
import { Company, Organisation, Payment, PaymentAllocation, User } from '../../types';
import { Money } from '../../support/money';
import {
  CreditCard,
  Plus,
  Search,
  Eye,
} from 'lucide-react';

interface PaymentListProps {
  company: Company;
  payments: Payment[];
  allocations: PaymentAllocation[];
  organisations: Organisation[];
  currentUser?: User;
  onRecordPayment: (preselectedOrgId?: string) => void;
  onViewReceipt: (paymentId: string) => void;
}

export const PaymentList: React.FC<PaymentListProps> = ({
  company,
  payments,
  allocations,
  organisations,
  onRecordPayment,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Filter payments for current company
  const companyPayments = useMemo(() => {
    return payments
      .filter((p) => p.company_id === company.id && !p.deleted_at)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [payments, company.id]);

  // Total metrics
  const metrics = useMemo(() => {
    const totalCollectedMinor = companyPayments.reduce((sum, p) => sum + p.amount_minor, 0);
    const totalAllocatedMinor = companyPayments.reduce((sum, p) => sum + p.allocated_minor, 0);
    const totalUnallocatedCreditMinor = companyPayments.reduce((sum, p) => sum + p.unallocated_minor, 0);
    return {
      totalCollectedMinor,
      totalAllocatedMinor,
      totalUnallocatedCreditMinor,
      count: companyPayments.length,
    };
  }, [companyPayments]);

  // Filtered list
  const filteredPayments = useMemo(() => {
    return companyPayments.filter((p) => {
      if (selectedOrgFilter && p.organisation_id !== selectedOrgFilter) return false;
      if (methodFilter && p.method !== methodFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const org = organisations.find((o) => o.id === p.organisation_id);
        const matchReceipt = p.receipt_number.toLowerCase().includes(term);
        const matchRef = p.reference?.toLowerCase().includes(term);
        const matchOrg = org?.name.toLowerCase().includes(term);
        if (!matchReceipt && !matchRef && !matchOrg) return false;
      }
      return true;
    });
  }, [companyPayments, selectedOrgFilter, methodFilter, searchTerm, organisations]);

  const methodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    mobile_money: 'Mobile Money',
    card: 'Card',
    other: 'Other',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Payments &amp; Receipts</h1>
          <p className="text-xs text-stone-500">
            Lump sum collections, multi-invoice allocations, and official electronic receipts.
          </p>
        </div>

        <button
          id="btn-new-payment"
          onClick={() => onRecordPayment()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Client Payment</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Collections</span>
          <div className="text-xl font-bold font-mono text-stone-900">
            {new Money(metrics.totalCollectedMinor, company.currency_code).format()}
          </div>
          <span className="text-[11px] text-stone-400 font-medium">{metrics.count} receipts issued</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Applied to Invoices</span>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {new Money(metrics.totalAllocatedMinor, company.currency_code).format()}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Cleared against accounts</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Client Unallocated Credit</span>
          <div className="text-xl font-bold font-mono text-amber-700">
            {new Money(metrics.totalUnallocatedCreditMinor, company.currency_code).format()}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Available for future invoices</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            id="search-payments-input"
            type="text"
            placeholder="Search by receipt number, reference, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border-stone-300 focus:ring-stone-800 focus:border-stone-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            id="filter-payment-client"
            value={selectedOrgFilter}
            onChange={(e) => setSelectedOrgFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border-stone-300 focus:ring-stone-800 focus:border-stone-800 bg-white"
          >
            <option value="">All Clients</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <select
            id="filter-payment-method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border-stone-300 focus:ring-stone-800 focus:border-stone-800 bg-white"
          >
            <option value="">All Methods</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-bold text-stone-700 text-sm">No Payments Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No payments match the current filters. Click "Record Client Payment" to register a new receipt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 uppercase tracking-wider font-bold text-stone-700 border-b border-stone-200 text-[11px]">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Method &amp; Ref</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Allocated</th>
                  <th className="py-3 px-4 text-right">Unallocated Credit</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-sans">
                {filteredPayments.map((payment) => {
                  const org = organisations.find((o) => o.id === payment.organisation_id);
                  const activeAllocCount = allocations.filter(
                    (a) => a.payment_id === payment.id && !a.is_reversed
                  ).length;

                  return (
                    <tr key={payment.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">{payment.receipt_number}</td>
                      <td className="py-3 px-4 font-medium text-stone-800">{org?.name || 'Unknown Client'}</td>
                      <td className="py-3 px-4 text-stone-600">{payment.payment_date}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-stone-800">{methodLabels[payment.method] || payment.method}</span>
                        {payment.reference && (
                          <span className="block text-[10px] text-stone-400 font-mono">{payment.reference}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {new Money(payment.amount_minor, payment.currency_code).format()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-800">
                        {new Money(payment.allocated_minor, payment.currency_code).format()}
                        <span className="block text-[10px] font-sans text-stone-400">
                          {activeAllocCount} invoice{activeAllocCount === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {payment.unallocated_minor > 0 ? (
                          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            {new Money(payment.unallocated_minor, payment.currency_code).format()}
                          </span>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          id={`btn-view-receipt-${payment.id}`}
                          onClick={() => onViewReceipt(payment.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-semibold text-[11px] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
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
