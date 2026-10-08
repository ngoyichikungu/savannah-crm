import React, { useState } from 'react';
import { PurchaseInvoice } from '../../types/accounting';
import { Company, User } from '../../types';
import { AccountingService } from '../../services/accountingService';
import { Money } from '../../support/money';
import {
  Plus,
  Search,
  Download,
  FileText,
  CreditCard,
  Trash2,
  CheckCircle2,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface PurchaseInvoiceListProps {
  company: Company;
  currentUser?: User;
  invoices: PurchaseInvoice[];
  onOpenCreate: () => void;
  onRecordPayment: (invoice: PurchaseInvoice) => void;
  onDelete: (invoice: PurchaseInvoice) => void;
}

export const PurchaseInvoiceList: React.FC<PurchaseInvoiceListProps> = ({
  company,
  invoices,
  onOpenCreate,
  onRecordPayment,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const suppliers = AccountingService.getSuppliers(company.id);

  const filtered = invoices.filter((inv) => {
    if (selectedStatus === 'unpaid') {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false;
    } else if (selectedStatus !== 'all' && inv.status !== selectedStatus) {
      return false;
    }

    if (selectedSupplierId !== 'all' && inv.supplier_id !== selectedSupplierId) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.supplier_name.toLowerCase().includes(q) ||
        (inv.internal_reference && inv.internal_reference.toLowerCase().includes(q)) ||
        (inv.notes && inv.notes.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const totalPayableOutstanding = filtered.reduce((acc, inv) => acc + inv.balance_due_minor, 0);
  const totalBilledMinor = filtered.reduce((acc, inv) => acc + inv.total_minor, 0);
  const totalPaidMinor = filtered.reduce((acc, inv) => acc + inv.amount_paid_minor, 0);
  const totalInputVat = filtered.reduce((acc, inv) => acc + inv.vat_minor, 0);

  const handleExportCsv = () => {
    const headers = [
      'Bill #',
      'Supplier',
      'Supplier TPIN',
      'PO Ref',
      'Issue Date',
      'Due Date',
      'Net Subtotal',
      'VAT Amount',
      'Total Bill',
      'Amount Paid',
      'Balance Due',
      'Status',
    ];
    const rows = filtered.map((inv) => [
      `"${inv.invoice_number}"`,
      `"${inv.supplier_name}"`,
      `"${inv.supplier_tpin || ''}"`,
      `"${inv.internal_reference || ''}"`,
      `"${inv.issue_date}"`,
      `"${inv.due_date}"`,
      (inv.subtotal_minor / 100).toFixed(2),
      (inv.vat_minor / 100).toFixed(2),
      (inv.total_minor / 100).toFixed(2),
      (inv.amount_paid_minor / 100).toFixed(2),
      (inv.balance_due_minor / 100).toFixed(2),
      `"${inv.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Purchase_Invoices_${company.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
            Accounts Payable Balance
          </span>
          <div className="text-2xl font-black font-mono text-rose-900 mt-1">
            {new Money(totalPayableOutstanding, company.currency_code).format()}
          </div>
          <span className="text-xs text-rose-600 mt-0.5">Pending settlement to vendors</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
            Total Billed by Vendors
          </span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
            {new Money(totalBilledMinor, company.currency_code).format()}
          </div>
          <span className="text-xs text-stone-400 mt-0.5">
            Settled: {new Money(totalPaidMinor, company.currency_code).format()} ({filtered.length} bills)
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Input VAT on Purchases
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
            {new Money(totalInputVat, company.currency_code).format()}
          </div>
          <span className="text-xs text-emerald-600 mt-0.5">Allowable input tax credits</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              AP Management
            </span>
            <div className="text-xs text-stone-500 mt-0.5">Capture incoming supplier bills</div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              id="btn-capture-purchase-invoice"
              onClick={onOpenCreate}
              className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Capture Bill</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              title="Export bills to CSV"
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
            placeholder="Search by vendor, bill #, PO #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="unpaid">Outstanding / Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Fully Settled</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-stone-800 font-bold text-sm">No purchase invoices found</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Capture invoices received from hardware distributors, landlords, internet providers, and material vendors.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Capture First Purchase Bill</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Vendor &amp; Bill #</th>
                  <th className="py-3 px-4">Internal PO</th>
                  <th className="py-3 px-4">Issue &amp; Due Date</th>
                  <th className="py-3 px-4 text-right">Net Subtotal</th>
                  <th className="py-3 px-4 text-right">Input VAT</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filtered.map((inv) => {
                  const isExpanded = expandedId === inv.id;
                  const isOverdue =
                    inv.balance_due_minor > 0 &&
                    new Date(inv.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-blue-50/30 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span>{inv.supplier_name}</span>
                          </div>
                          <div className="font-mono text-[11px] text-blue-700 font-bold">
                            {inv.invoice_number}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                          {inv.internal_reference || '—'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-[11px] font-mono text-stone-800">{inv.issue_date}</div>
                          <div
                            className={`text-[10px] font-mono ${
                              isOverdue ? 'text-rose-600 font-bold' : 'text-stone-400'
                            }`}
                          >
                            Due: {inv.due_date} {isOverdue && '(OVERDUE)'}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-stone-700">
                          {new Money(inv.subtotal_minor, company.currency_code).format()}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                          {inv.vat_minor > 0
                            ? new Money(inv.vat_minor, company.currency_code).format()
                            : '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                          {new Money(inv.total_minor, company.currency_code).format()}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                          {inv.balance_due_minor > 0
                            ? new Money(inv.balance_due_minor, company.currency_code).format()
                            : <span className="text-emerald-700 font-bold">SETTLED</span>}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : inv.status === 'partially_paid'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : isOverdue
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {inv.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.balance_due_minor > 0 && (
                              <button
                                type="button"
                                onClick={() => onRecordPayment(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                                title="Record payment disbursal"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay Bill</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                              className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              title="Toggle line items & payments"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDelete(inv)}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete purchase bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Line Items & Payment History Drawer */}
                      {isExpanded && (
                        <tr className="bg-stone-50/80">
                          <td colSpan={9} className="p-4 border-t border-b border-stone-200">
                            <div className="space-y-3 max-w-4xl">
                              <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-blue-700" />
                                  Bill Line Items ({inv.lines.length})
                                </h4>
                                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-stone-100/60 text-[10px] font-bold text-stone-500 uppercase">
                                      <tr>
                                        <th className="py-2 px-3">Item Description</th>
                                        <th className="py-2 px-3 text-right">Quantity</th>
                                        <th className="py-2 px-3 text-right">Unit Price</th>
                                        <th className="py-2 px-3 text-right">VAT Rate</th>
                                        <th className="py-2 px-3 text-right">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                      {inv.lines.map((l) => (
                                        <tr key={l.id}>
                                          <td className="py-2 px-3 font-medium text-stone-800">{l.description}</td>
                                          <td className="py-2 px-3 text-right font-mono text-stone-600">
                                            {(l.quantity_thousandths / 1000).toFixed(2)} {l.unit}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-stone-600">
                                            {new Money(l.unit_price_minor, company.currency_code).format()}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-stone-600">
                                            {l.is_vatable ? `${(l.vat_rate_bp / 100).toFixed(0)}%` : '0%'}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                                            {new Money(l.line_total_minor, company.currency_code).format()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Payments History */}
                              {inv.payments && inv.payments.length > 0 && (
                                <div>
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                                    Disbursed Payments History ({inv.payments.length})
                                  </h4>
                                  <div className="bg-white border border-emerald-200/80 rounded-xl overflow-hidden shadow-2xs divide-y divide-stone-100">
                                    {inv.payments.map((p) => (
                                      <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                          <div>
                                            <span className="font-bold text-stone-800">
                                              {p.payment_method.replace('_', ' ').toUpperCase()}
                                            </span>
                                            {p.reference && (
                                              <span className="text-stone-500 font-mono text-[11px] ml-2">
                                                Ref: {p.reference}
                                              </span>
                                            )}
                                            <span className="text-stone-400 font-mono text-[10px] ml-2">
                                              on {p.payment_date}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="font-mono font-bold text-emerald-800">
                                          {new Money(p.amount_minor, company.currency_code).format()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
