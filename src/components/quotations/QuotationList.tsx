import React, { useState, useMemo } from 'react';
import { Company, Organisation, Quotation } from '../../types';
import { Money } from '../../support/money';
import { StatusBadge } from '../common/StatusBadge';
import {
  Plus,
  Search,
  CheckSquare,
  ArrowUpDown,
  Calendar,
  ArrowRight,
} from 'lucide-react';

interface QuotationListProps {
  quotations: Quotation[];
  company?: Company;
  organisations: Organisation[];
  onSelectQuotation: (id: string) => void;
  onCreateQuotation: () => void;
  onConvertToInvoice: (quote: Quotation) => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({
  quotations,
  organisations,
  onSelectQuotation,
  onCreateQuotation,
  onConvertToInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'issue_date' | 'total_minor' | 'number'>('issue_date');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredQuotes = useMemo(() => {
    return quotations
      .filter((q) => {
        if (statusFilter !== 'all' && q.status !== statusFilter) return false;
        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase();
        const org = organisations.find((o) => o.id === q.organisation_id);
        const orgName = org ? org.name.toLowerCase() : '';
        const num = q.number.toLowerCase();
        const title = q.title.toLowerCase();

        return num.includes(term) || orgName.includes(term) || title.includes(term);
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
  }, [quotations, statusFilter, searchTerm, organisations, sortField, sortAsc]);

  return (
    <div className="space-y-6">
      {/* List Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              id="quote-search-input"
              type="text"
              placeholder="Search quotations by #, title, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border-stone-300 focus:border-stone-800 focus:ring-stone-800"
            />
          </div>

          <select
            id="quote-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border-stone-300 py-2 px-3 focus:border-stone-800 focus:ring-stone-800 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <button
          id="btn-create-quote"
          onClick={onCreateQuotation}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm hover:shadow-md hover:scale-[1.02] border border-emerald-600/50 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Quotation</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckSquare className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-sm font-bold text-stone-700">No Quotations Found</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Create commercial proposals and estimates for clients.
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
                      <span>Quotation #</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Title &amp; Client</th>
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
                      <span>Valid Until</span>
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
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredQuotes.map((q) => {
                  const org = organisations.find((o) => o.id === q.organisation_id);
                  const total = new Money(q.total_minor, q.currency_code);

                  return (
                    <tr
                      key={q.id}
                      onClick={() => onSelectQuotation(q.id)}
                      className="hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{q.number}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800">{q.title}</div>
                        <div className="text-[11px] text-stone-500">{org?.name || 'Unknown Client'}</div>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1 text-stone-700">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>Expires: {q.valid_until}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        {total.format()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {q.status === 'accepted' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onConvertToInvoice(q);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded transition-colors shadow-sm"
                          >
                            <span>Convert</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectQuotation(q.id);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
                          >
                            View
                          </button>
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
    </div>
  );
};
