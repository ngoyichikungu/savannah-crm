import React, { useState, useMemo } from 'react';
import { Company, Invoice, Organisation } from '../../types';
import { Money } from '../../support/money';
import { StatusBadge } from '../common/StatusBadge';
import {
  Plus,
  Search,
  FileText,
  Clock,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  company: Company;
  organisations: Organisation[];
  onSelectInvoice: (invoiceId: string) => void;
  onCreateInvoice: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  company,
  organisations,
  onSelectInvoice,
  onCreateInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'issue_date' | 'total_minor' | 'number'>('issue_date');
  const [sortAsc, setSortAsc] = useState(false);

  // Metrics overview
  const totalBilledMinor = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.total_minor, 0);

  const totalPaidMinor = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.amount_paid_minor, 0);

  const totalOutstandingMinor = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.balance_due_minor, 0);

  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (statusFilter !== 'all' && inv.status !== statusFilter) {
          return false;
        }
        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase();
        const org = organisations.find((o) => o.id === inv.organisation_id);
        const orgName = org ? org.name.toLowerCase() : '';
        const number = inv.number.toLowerCase();
        const ref = (inv.reference || '').toLowerCase();
        const po = (inv.po_number || '').toLowerCase();

        return (
          number.includes(term) ||
          orgName.includes(term) ||
          ref.includes(term) ||
          po.includes(term)
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'issue_date') {
          cmp = new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime();
        } else if (sortField === 'total_minor') {
          cmp = a.total_minor - b.total_minor;
        } else if (sortField === 'number') {
          cmp = a.number.localeCompare(b.number);
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [invoices, statusFilter, searchTerm, organisations, sortField, sortAsc]);

  return (
    <div className="space-y-6">
      {/* Top Banner / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Billed</div>
          <div className="text-xl font-bold font-mono text-stone-900 mt-1">
            {new Money(totalBilledMinor, company.currency_code).format()}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Active issued invoices</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Settled (Paid)</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {new Money(totalPaidMinor, company.currency_code).format()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Collected receipts</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Outstanding Balance</div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">
            {new Money(totalOutstandingMinor, company.currency_code).format()}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Accounts receivable</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Overdue Invoices</div>
          <div className="text-xl font-bold font-mono text-red-700 mt-1">
            {overdueInvoices.length} <span className="text-xs text-stone-500 font-sans font-normal">invoices</span>
          </div>
          <div className="text-[11px] text-red-600 mt-1">Requiring immediate follow-up</div>
        </div>
      </div>

      {/* Main List Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              id="invoice-search-input"
              type="text"
              placeholder="Search by invoice #, client, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>

          <select
            id="invoice-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border-stone-300 py-2 px-3 focus:border-stone-800 focus:ring-stone-800 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="sent">Sent / Awaiting Payment</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid (Settled)</option>
            <option value="overdue">Overdue</option>
            <option value="credited">Credited</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          id="btn-create-invoice"
          onClick={onCreateInvoice}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm hover:shadow-md hover:scale-[1.02] border border-emerald-600/50 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-sm font-bold text-stone-700">No Invoices Found</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              No invoice records matching the selected status and search terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-stone-900"
                    onClick={() => {
                      if (sortField === 'number') setSortAsc(!sortAsc);
                      else {
                        setSortField('number');
                        setSortAsc(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Invoice #</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Client</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-stone-900"
                    onClick={() => {
                      if (sortField === 'issue_date') setSortAsc(!sortAsc);
                      else {
                        setSortField('issue_date');
                        setSortAsc(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Dates</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-stone-900"
                    onClick={() => {
                      if (sortField === 'total_minor') setSortAsc(!sortAsc);
                      else {
                        setSortField('total_minor');
                        setSortAsc(false);
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredInvoices.map((inv) => {
                  const org = organisations.find((o) => o.id === inv.organisation_id);
                  const total = new Money(inv.total_minor, inv.currency_code);
                  const balance = new Money(inv.balance_due_minor, inv.currency_code);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv.id)}
                      className="hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {inv.number}
                        {inv.po_number && (
                          <div className="text-[10px] text-stone-500 font-sans font-normal">PO: {inv.po_number}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800">{org?.name || 'Unknown Client'}</div>
                        {inv.reference && <div className="text-[11px] text-stone-500 truncate max-w-xs">{inv.reference}</div>}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1 text-stone-700">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{inv.issue_date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-stone-500">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>Due: {inv.due_date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        {total.format()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {inv.balance_due_minor > 0 ? (
                          <span className="font-bold text-red-700">{balance.format()}</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Settled</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvoice(inv.id);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
                        >
                          View
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
