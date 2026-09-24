import React, { useState } from 'react';
import { Company } from '../../types';
import { ALL_REPORTS, getReportById } from '../../services/reports';
import { ReportShell } from './ReportShell';
import { Money } from '../../support/money';
import {
  FileSpreadsheet,
  Users,
  PhoneCall,
  TrendingUp,
  Award,
  Receipt,
  Scale,
  FileText,
  Target,
} from 'lucide-react';

interface ReportsDashboardProps {
  company: Company;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ company }) => {
  const [activeReportId, setActiveReportId] = useState<string>('client-payments-balances');
  const [refreshKey, setRefreshKey] = useState(0);

  const activeReport = getReportById(activeReportId) || ALL_REPORTS[0];

  const reportIcons: Record<string, React.ReactNode> = {
    'leads-captured': <Users className="w-4 h-4 text-blue-600" />,
    'leads-contacted': <PhoneCall className="w-4 h-4 text-indigo-600" />,
    'lead-progression': <TrendingUp className="w-4 h-4 text-emerald-600" />,
    'lead-conversion': <Award className="w-4 h-4 text-amber-600" />,
    'client-invoices': <Receipt className="w-4 h-4 text-stone-700" />,
    'client-payments-balances': <Scale className="w-4 h-4 text-emerald-700" />,
    'client-statement': <FileText className="w-4 h-4 text-purple-700" />,
    'marketing-tracker': <Target className="w-4 h-4 text-rose-600" />,
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Custom KPI Renderers per report
  const renderCustomMetrics = (totals: any, _rows: any[]) => {
    if (!totals) return null;

    if (activeReportId === 'leads-captured') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Leads Captured</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{totals.totalLeads}</div>
            <span className="text-xs text-stone-400 mt-0.5">Across all marketing sources</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Top Performing Channel</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">{totals.topSource}</div>
            <span className="text-xs text-blue-600 mt-0.5">Highest lead count</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Estimated Pipeline Value</span>
            <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
              {new Money(totals.totalEstimatedValueMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5">Commercial potential</span>
          </div>
        </div>
      );
    }

    if (activeReportId === 'leads-contacted') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Contacted Leads</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{totals.totalContacted}</div>
            <span className="text-xs text-stone-400 mt-0.5">Reached out to prospects</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Total Touchpoints</span>
            <div className="text-2xl font-bold font-mono text-indigo-900 mt-1">{totals.totalActivities}</div>
            <span className="text-xs text-indigo-600 mt-0.5">Calls, emails & meetings</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Average Touchpoints / Lead</span>
            <div className="text-2xl font-bold font-mono text-amber-900 mt-1">{totals.avgTouchpointsPerLead}</div>
            <span className="text-xs text-amber-600 mt-0.5">Outreach cadence</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Avg First Response Time</span>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">{totals.avgHoursToFirstContact} hrs</div>
            <span className="text-xs text-emerald-600 mt-0.5">Initial touchpoint latency</span>
          </div>
        </div>
      );
    }

    if (activeReportId === 'lead-progression') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Active Pipeline Leads</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{totals.totalLeads}</div>
            <span className="text-xs text-stone-400 mt-0.5">In qualification funnel</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Unweighted Pipeline</span>
            <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
              {new Money(totals.totalUnweightedValueMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-blue-600 mt-0.5">100% nominal value</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Weighted Pipeline</span>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
              {new Money(totals.totalWeightedValueMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5">Probability adjusted</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Avg Velocity in Funnel</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{totals.avgDaysInPipeline} days</div>
            <span className="text-xs text-stone-400 mt-0.5">Time to deal closure</span>
          </div>
        </div>
      );
    }

    if (activeReportId === 'lead-conversion') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Deals Closed Won</span>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{totals.totalWon}</div>
            <span className="text-xs text-emerald-600 mt-0.5">Successful sales</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Realized Revenue Won</span>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
              {new Money(totals.totalWonValueMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5">Closed transaction value</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Win Conversion Rate</span>
            <div className="text-2xl font-bold font-mono text-indigo-900 mt-1">{totals.overallWinRatePercent}%</div>
            <span className="text-xs text-indigo-600 mt-0.5">{totals.totalLost} deals marked lost</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Avg Sales Cycle</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{totals.avgDaysToClose} days</div>
            <span className="text-xs text-stone-400 mt-0.5">Lead capture to won</span>
          </div>
        </div>
      );
    }

    if (activeReportId === 'client-invoices') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Invoiced</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
              {new Money(totals.totalAmountMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-stone-400 mt-0.5">{totals.count} Invoices Issued</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Settled &amp; Paid</span>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
              {new Money(totals.totalPaidMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5">Total collected</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Balance Due / Receivables</span>
            <div className="text-2xl font-bold font-mono text-rose-900 mt-1">
              {new Money(totals.totalOutstandingMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-rose-600 mt-0.5">Uncollected client debt</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">VAT Levied (16%)</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
              {new Money(totals.totalVatMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-stone-400 mt-0.5">ZRA Tax Obligation</span>
          </div>
        </div>
      );
    }

    if (activeReportId === 'client-payments-balances') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Opening Balances</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
              {new Money(totals.totalOpeningMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-stone-400 mt-0.5">Brought forward balance</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Invoiced in Period</span>
            <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
              {new Money(totals.totalInvoicedMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-blue-600 mt-0.5">New billings</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cash Collected</span>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
              {new Money(totals.totalReceivedMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5">Receipts processed</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Closing Total Receivables</span>
            <div className="text-2xl font-bold font-mono text-rose-900 mt-1">
              {new Money(totals.totalClosingMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-rose-600 mt-0.5">90+ days: {new Money(totals.totalDays90PlusMinor, company.currency_code).format()}</span>
          </div>
        </div>
      );
    }

    if (activeReportId === 'marketing-tracker') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Marketing Spend</span>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
              {new Money(totals.totalActualCostMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-stone-400 mt-0.5">Budget: {new Money(totals.totalBudgetMinor, company.currency_code).format()}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Attributed Revenue</span>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
              {new Money(totals.totalRevenueAttributedMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5">Won deal value</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Leads &amp; Cost Per Lead</span>
            <div className="text-2xl font-bold font-mono text-indigo-900 mt-1">
              {new Money(totals.overallCostPerLeadMinor, company.currency_code).format()}
            </div>
            <span className="text-xs text-indigo-600 mt-0.5">{totals.totalLeadsGenerated} leads captured</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Return on Investment</span>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">{totals.overallRoiPercent}%</div>
            <span className="text-xs text-emerald-600 mt-0.5">Campaign net ROI</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Reports Navigation Grid */}
      <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              <h1 className="text-2xl font-bold tracking-tight">Executive Reporting Engine</h1>
            </div>
            <p className="text-stone-300 text-xs mt-1">
              Standardized, multi-tenant financial, CRM &amp; marketing intelligence engine. All reports parameterized by date range with full PDF/CSV exports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-stone-800 border border-stone-700 rounded-xl text-xs font-mono text-emerald-400 font-medium">
              Timezone: {company.city || 'Lusaka'} (CAT)
            </span>
          </div>
        </div>

        {/* 8 Report Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-stone-800">
          {ALL_REPORTS.map((rep) => {
            const isSelected = activeReportId === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setActiveReportId(rep.id)}
                className={`p-2.5 rounded-xl text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-semibold shadow-md ring-2 ring-emerald-400'
                    : 'bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-700' : 'bg-stone-700/60'}`}>
                    {reportIcons[rep.id] || <FileSpreadsheet className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[9px] font-mono opacity-60">v8.1</span>
                </div>
                <div className="text-[11px] leading-tight line-clamp-2">{rep.name.replace(' Report', '')}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Execution Shell */}
      <ReportShell
        key={`${activeReportId}_${refreshKey}`}
        report={activeReport}
        company={company}
        onRefresh={handleRefresh}
        renderCustomTotals={renderCustomMetrics}
      />
    </div>
  );
};
