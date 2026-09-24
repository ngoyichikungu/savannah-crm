import React, { useMemo } from 'react';
import { Company, Organisation, Quotation } from '../../types';
import { Money } from '../../support/money';
import { StatusBadge } from '../common/StatusBadge';
import {
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';

interface ProposalTrackerProps {
  quotations: Quotation[];
  company: Company;
  organisations: Organisation[];
  onSelectQuotation: (id: string) => void;
  onConvertToInvoice: (quote: Quotation) => void;
}

export const ProposalTracker: React.FC<ProposalTrackerProps> = ({
  quotations,
  company,
  organisations,
  onSelectQuotation,
  onConvertToInvoice,
}) => {
  // Follow-up status groupings
  const pipeline = useMemo(() => {
    const active = quotations.filter((q) => q.status === 'sent' || q.status === 'under_review' || q.status === 'viewed');
    const accepted = quotations.filter((q) => q.status === 'accepted');
    const drafts = quotations.filter((q) => q.status === 'draft');
    const closed = quotations.filter((q) => q.status === 'rejected' || q.status === 'expired' || q.status === 'superseded');

    const totalActiveValueMinor = active.reduce((sum, q) => sum + q.total_minor, 0);
    const totalAcceptedValueMinor = accepted.reduce((sum, q) => sum + q.total_minor, 0);

    return {
      active,
      accepted,
      drafts,
      closed,
      totalActiveValueMinor,
      totalAcceptedValueMinor,
    };
  }, [quotations]);

  return (
    <div className="space-y-6">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Live Proposals In Pipeline</div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
            {pipeline.active.length} <span className="text-xs font-normal text-stone-500 font-sans">proposals</span>
          </div>
          <div className="text-xs font-mono font-medium text-stone-600 mt-1">
            Value: {new Money(pipeline.totalActiveValueMinor, company.currency_code).format()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Accepted Proposals</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {pipeline.accepted.length} <span className="text-xs font-normal text-stone-500 font-sans">won</span>
          </div>
          <div className="text-xs font-mono font-medium text-emerald-700 mt-1">
            Value: {new Money(pipeline.totalAcceptedValueMinor, company.currency_code).format()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Draft Proposals</div>
          <div className="text-2xl font-bold font-mono text-stone-700 mt-1">
            {pipeline.drafts.length} <span className="text-xs font-normal text-stone-500 font-sans">in drafting</span>
          </div>
          <div className="text-xs text-stone-400 mt-1">Pending review &amp; dispatch</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Proposal Win Rate</div>
          <div className="text-2xl font-bold font-mono text-purple-700 mt-1">
            {quotations.length > 0
              ? `${Math.round((pipeline.accepted.length / (pipeline.active.length + pipeline.accepted.length + pipeline.closed.length || 1)) * 100)}%`
              : '0%'}
          </div>
          <div className="text-xs text-stone-400 mt-1">Conversion metric</div>
        </div>
      </div>

      {/* Main Kanban / Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Awaiting Decision Column */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Follow-up &amp; In-Flight ({pipeline.active.length})
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-blue-800">
              {new Money(pipeline.totalActiveValueMinor, company.currency_code).format()}
            </span>
          </div>

          {pipeline.active.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">No proposals currently out for client decision.</div>
          ) : (
            <div className="space-y-3">
              {pipeline.active.map((q) => {
                const org = organisations.find((o) => o.id === q.organisation_id);
                return (
                  <div
                    key={q.id}
                    onClick={() => onSelectQuotation(q.id)}
                    className="p-4 rounded-lg border border-stone-200 hover:border-stone-400 bg-stone-50/50 hover:bg-stone-50 cursor-pointer transition-all space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-xs text-stone-900">{q.number}</span>
                        <div className="font-bold text-xs text-stone-800">{org?.name || 'Valued Client'}</div>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-1">{q.title}</p>

                    <div className="pt-2 border-t border-stone-200/80 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-stone-500">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>Valid until: {q.valid_until}</span>
                      </div>
                      <span className="font-mono font-bold text-stone-900">
                        {new Money(q.total_minor, q.currency_code).format()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Won / Accepted (Ready for Invoice conversion) */}
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
                Accepted (Convert to Invoice) ({pipeline.accepted.length})
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-800">
              {new Money(pipeline.totalAcceptedValueMinor, company.currency_code).format()}
            </span>
          </div>

          {pipeline.accepted.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">No accepted proposals waiting for invoice conversion.</div>
          ) : (
            <div className="space-y-3">
              {pipeline.accepted.map((q) => {
                const org = organisations.find((o) => o.id === q.organisation_id);
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-xs text-stone-900">{q.number}</span>
                        <div className="font-bold text-xs text-stone-800">{org?.name || 'Valued Client'}</div>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-1">{q.title}</p>

                    <div className="pt-2 border-t border-emerald-200/80 flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-emerald-900">
                        {new Money(q.total_minor, q.currency_code).format()}
                      </span>

                      <button
                        onClick={() => onConvertToInvoice(q)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-800 text-white rounded text-xs font-bold hover:bg-emerald-900 transition-colors shadow-sm"
                      >
                        <span>Convert to Invoice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
