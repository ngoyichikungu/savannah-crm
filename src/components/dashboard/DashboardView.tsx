import React, { useState, useMemo } from 'react';
import { Company, User } from '../../types';
import { DashboardService, DashboardData } from '../../services/dashboardService';
import { ChartWrapper } from '../common/ChartWrapper';
import { Money } from '../../support/money';
import { CalendarReminderService } from '../../services/calendarReminderService';
import { StorageService } from '../../services/storageService';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  CreditCard,
  Target,
  Users,
  Calendar,
  ChevronRight,
  DollarSign,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { ChartData, ChartOptions } from 'chart.js';

export type UserRoleType = 'owner' | 'sales' | 'finance' | 'marketing';

interface DashboardViewProps {
  currentCompany: Company;
  currentUser?: User;
  onNavigateTab: (tab: any, subPayload?: any) => void;
  onSelectInvoice?: (invoiceId: string) => void;
  onSelectQuotation?: (quotationId: string) => void;
  onSelectPlan?: (planId: string) => void;
  onOpenRecordPayment?: (invoiceId?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentCompany,
  currentUser,
  onNavigateTab,
  onSelectInvoice,
  onSelectQuotation,
  onSelectPlan: _onSelectPlan,
  onOpenRecordPayment,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRoleType>(
    (currentUser?.role as UserRoleType) || 'owner'
  );
  const [referenceDate, setReferenceDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  const data: DashboardData = useMemo(() => {
    return DashboardService.getDashboardData(currentCompany.id, referenceDate);
  }, [currentCompany.id, referenceDate]);

  const currency = currentCompany.currency_code;

  const upcomingClientEvents = useMemo(() => {
    return CalendarReminderService.getEvents({
      companyId: currentCompany.id,
      status: 'scheduled',
    }).slice(0, 5);
  }, [currentCompany.id, referenceDate]);

  const organisations = useMemo(() => StorageService.getOrganisations(), [currentCompany.id]);
  const orgMap = useMemo(() => new Map(organisations.map((o) => [o.id, o.name])), [organisations]);

  // Chart 1: Invoiced vs Received 12 Months (Line Chart)
  const lineChartData: ChartData = useMemo(() => {
    return {
      labels: data.invoicedVsReceived12Months.map((m) => m.label),
      datasets: [
        {
          type: 'line',
          label: `Invoiced (${currency})`,
          data: data.invoicedVsReceived12Months.map((m) => m.invoicedMinor / 100),
          borderColor: '#047857', // emerald-700
          backgroundColor: 'rgba(4, 120, 87, 0.1)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#047857',
          pointRadius: 3,
        },
        {
          type: 'line',
          label: `Received (${currency})`,
          data: data.invoicedVsReceived12Months.map((m) => m.receivedMinor / 100),
          borderColor: '#b45309', // amber-700
          backgroundColor: 'rgba(180, 83, 9, 0.05)',
          borderWidth: 2.5,
          borderDash: [4, 4],
          tension: 0.3,
          fill: false,
          pointBackgroundColor: '#b45309',
          pointRadius: 3,
        },
      ],
    };
  }, [data.invoicedVsReceived12Months, currency]);

  const lineChartOptions: ChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f5f5f4' },
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 10 },
          callback: (val) => `${currency} ${Number(val).toLocaleString()}`,
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
      },
    },
  };

  // Chart 2: Pipeline by Stage (Bar Chart)
  const pipelineChartData: ChartData = useMemo(() => {
    return {
      labels: data.pipelineByStage.map((s) => s.stageName),
      datasets: [
        {
          type: 'bar',
          label: `Unweighted Value (${currency})`,
          data: data.pipelineByStage.map((s) => s.unweightedValueMinor / 100),
          backgroundColor: '#3b82f6', // blue-500
          borderRadius: 4,
        },
        {
          type: 'bar',
          label: `Weighted Value (${currency})`,
          data: data.pipelineByStage.map((s) => s.weightedValueMinor / 100),
          backgroundColor: '#10b981', // emerald-500
          borderRadius: 4,
        },
      ],
    };
  }, [data.pipelineByStage, currency]);

  const pipelineChartOptions: ChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f5f5f4' },
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 10 },
          callback: (val) => `${Number(val).toLocaleString()}`,
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
      },
    },
  };

  // Chart 3: Lead Sources This Quarter (Doughnut Chart)
  const doughnutChartData: ChartData = useMemo(() => {
    const colors = [
      '#059669', // emerald-600
      '#d97706', // amber-600
      '#0284c7', // sky-600
      '#6366f1', // indigo-500
      '#dc2626', // rose-600
      '#8b5cf6', // violet-500
      '#0d9488', // teal-600
      '#78716c', // stone-500
      '#ea580c', // orange-600
    ];

    return {
      labels: data.leadSourcesQuarter.map((s) => `${s.label} (${s.count})`),
      datasets: [
        {
          type: 'doughnut',
          data: data.leadSourcesQuarter.map((s) => s.count),
          backgroundColor: colors.slice(0, data.leadSourcesQuarter.length),
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [data.leadSourcesQuarter]);

  // Chart 4: Top 10 Clients by Revenue (Bar Chart)
  const topClientsChartData: ChartData = useMemo(() => {
    return {
      labels: data.top10ClientsRevenue.map((c) =>
        c.organisationName.length > 15 ? c.organisationName.substring(0, 15) + '…' : c.organisationName
      ),
      datasets: [
        {
          type: 'bar',
          label: `Invoiced (${currency})`,
          data: data.top10ClientsRevenue.map((c) => c.totalInvoicedMinor / 100),
          backgroundColor: '#0f766e', // teal-700
          borderRadius: 4,
        },
        {
          type: 'bar',
          label: `Paid (${currency})`,
          data: data.top10ClientsRevenue.map((c) => c.totalPaidMinor / 100),
          backgroundColor: '#047857', // emerald-700
          borderRadius: 4,
        },
      ],
    };
  }, [data.top10ClientsRevenue, currency]);

  // Chart 5: Invoice Ageing Buckets (Bar Chart)
  const agingChartData: ChartData = useMemo(() => {
    const colors = [
      '#059669', // emerald (current)
      '#d97706', // amber (1-30)
      '#ea580c', // orange (31-60)
      '#dc2626', // rose (61-90)
      '#991b1b', // dark red (90+)
    ];

    return {
      labels: data.agingBuckets.map((b) => b.label),
      datasets: [
        {
          type: 'bar',
          label: `Outstanding (${currency})`,
          data: data.agingBuckets.map((b) => b.amountMinor / 100),
          backgroundColor: colors,
          borderRadius: 4,
        },
      ],
    };
  }, [data.agingBuckets, currency]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="dashboard-hub">
      {/* Top Banner & Role Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white text-stone-900 p-5 rounded-2xl shadow-xs border border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-mono">
              Live Aggregate Operations
            </span>
            <span className="text-xs text-stone-500 font-mono">As of {data.asOfDate}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 mt-1">
            Executive Command Dashboard
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Real-time multi-dimensional financial, pipeline, and marketing operational analytics for{' '}
            <strong className="text-emerald-800">{currentCompany.legal_name || currentCompany.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {/* Role Filter Selector */}
          <div className="flex items-center bg-stone-100 rounded-lg p-1 border border-stone-200 text-xs">
            <button
              onClick={() => setSelectedRole('owner')}
              className={`px-2.5 py-1 rounded font-bold transition-all ${
                selectedRole === 'owner' ? 'bg-white text-emerald-900 shadow-xs border border-stone-200/80' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Executive
            </button>
            <button
              onClick={() => setSelectedRole('sales')}
              className={`px-2.5 py-1 rounded font-bold transition-all ${
                selectedRole === 'sales' ? 'bg-white text-emerald-900 shadow-xs border border-stone-200/80' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => setSelectedRole('finance')}
              className={`px-2.5 py-1 rounded font-bold transition-all ${
                selectedRole === 'finance' ? 'bg-white text-emerald-900 shadow-xs border border-stone-200/80' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Finance
            </button>
            <button
              onClick={() => setSelectedRole('marketing')}
              className={`px-2.5 py-1 rounded font-bold transition-all ${
                selectedRole === 'marketing' ? 'bg-white text-emerald-900 shadow-xs border border-stone-200/80' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Marketing
            </button>
          </div>

          <button
            onClick={() => setReferenceDate(new Date().toISOString().substring(0, 10))}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold transition-colors"
            title="Refresh dashboard aggregation"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="dashboard-stat-cards">
        {/* Card 1: Leads Captured This Month */}
        <div
          onClick={() => onNavigateTab('reports', { reportId: 'leads-captured' })}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group"
          id="stat-leads-captured"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Leads This Month</span>
            <Users className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black font-mono text-stone-900 mt-1">
            {data.stats.leadsCapturedThisMonth}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
            <span>Active acquisitions</span>
            <span className="text-emerald-700 font-semibold group-hover:underline flex items-center">
              Leads Report <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Open Pipeline Value */}
        <div
          onClick={() => onNavigateTab('reports', { reportId: 'lead-progression' })}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
          id="stat-pipeline-value"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Open Pipeline</span>
            <Activity className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-900 mt-1">
            {new Money(data.stats.openPipelineValueMinor, currency).format()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
            <span>Active deal prospects</span>
            <span className="text-blue-700 font-semibold group-hover:underline flex items-center">
              Pipeline Flow <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Quotations Awaiting Decision */}
        <div
          onClick={() => onNavigateTab('quotations')}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs hover:border-amber-600 hover:shadow-md transition-all cursor-pointer group"
          id="stat-quotations-awaiting"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Awaiting Decision</span>
            <FileText className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-900 mt-1">
            {data.stats.quotationsAwaitingDecisionCount}{' '}
            <span className="text-xs font-normal text-stone-500">
              ({new Money(data.stats.quotationsAwaitingDecisionValueMinor, currency).format()})
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
            <span>Pending quote proposals</span>
            <span className="text-amber-700 font-semibold group-hover:underline flex items-center">
              Quotations <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Invoiced This Month */}
        <div
          onClick={() => onNavigateTab('reports', { reportId: 'client-invoices' })}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer group"
          id="stat-invoiced-month"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Invoiced This Month</span>
            <TrendingUp className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-900 mt-1">
            {new Money(data.stats.invoicedThisMonthMinor, currency).format()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
            <span>Billing volume</span>
            <span className="text-indigo-700 font-semibold group-hover:underline flex items-center">
              Invoices Report <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 5: Received This Month */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group"
          id="stat-received-month"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Cash Received (Month)</span>
            <CreditCard className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1">
            {new Money(data.stats.receivedThisMonthMinor, currency).format()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
            <span>Settled cash receipts</span>
            <span className="text-emerald-700 font-semibold group-hover:underline flex items-center">
              Payments <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 6: Total Outstanding Balance */}
        <div
          onClick={() => onNavigateTab('reports', { reportId: 'client-payments-balances' })}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs hover:border-stone-800 hover:shadow-md transition-all cursor-pointer group"
          id="stat-total-outstanding"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Total Outstanding</span>
            <DollarSign className="w-4 h-4 text-stone-700 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-900 mt-1">
            {new Money(data.stats.totalOutstandingMinor, currency).format()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
            <span>Accounts receivable ledger</span>
            <span className="text-stone-800 font-semibold group-hover:underline flex items-center">
              Balances Report <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 7: Overdue Amount */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="col-span-2 sm:col-span-2 bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
          id="stat-overdue-amount"
        >
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Total Overdue Receivables
            </span>
            <span className="text-[10px] bg-rose-200 text-rose-800 font-mono px-2 py-0.5 rounded-full">
              {data.overdueInvoices.length} invoices
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-700 mt-1">
            {new Money(data.stats.overdueAmountMinor, currency).format()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-700 mt-2 pt-2 border-t border-rose-200">
            <span>Past due settlement window</span>
            <span className="font-semibold group-hover:underline flex items-center">
              Review Overdue Invoices <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* CHARTS GRID (Row 1: Line Invoiced vs Received + Funnel/Bar Pipeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-charts-row-1">
        <div className="lg:col-span-7">
          <ChartWrapper
            id="chart-invoiced-received"
            type="line"
            data={lineChartData}
            options={lineChartOptions}
            title="Invoiced vs Received (Last 12 Months)"
            subtitle="Trailing 12-month billing trajectory compared against verified cash settlements."
            height={260}
            onDrillDown={() => onNavigateTab('reports', { reportId: 'client-payments-balances' })}
            drillDownLabel="View Balances Report →"
            fallbackTable={{
              caption: '12-Month Invoiced vs Received Trajectory',
              headers: ['Period Month', `Invoiced (${currency})`, `Received (${currency})`],
              rows: data.invoicedVsReceived12Months.map((m) => [
                m.label,
                (m.invoicedMinor / 100).toFixed(2),
                (m.receivedMinor / 100).toFixed(2),
              ]),
            }}
          />
        </div>

        <div className="lg:col-span-5">
          <ChartWrapper
            id="chart-pipeline-stage"
            type="bar"
            data={pipelineChartData}
            options={pipelineChartOptions}
            title="Current Pipeline by Stage"
            subtitle="Stage deal valuations and probability-weighted progression."
            height={260}
            onDrillDown={() => onNavigateTab('reports', { reportId: 'lead-progression' })}
            drillDownLabel="View Flow Report →"
            fallbackTable={{
              caption: 'Active Pipeline Progression by Stage',
              headers: ['Stage', 'Leads', `Unweighted (${currency})`, `Weighted (${currency})`],
              rows: data.pipelineByStage.map((s) => [
                s.stageName,
                s.leadsCount,
                (s.unweightedValueMinor / 100).toFixed(2),
                (s.weightedValueMinor / 100).toFixed(2),
              ]),
            }}
          />
        </div>
      </div>

      {/* CHARTS GRID (Row 2: Lead Sources Doughnut + Top 10 Clients + Aging Buckets) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-charts-row-2">
        <div>
          <ChartWrapper
            id="chart-lead-sources"
            type="doughnut"
            data={doughnutChartData}
            title="Lead Sources This Quarter"
            subtitle="Acquisition channels for quarterly incoming leads."
            height={240}
            onDrillDown={() => onNavigateTab('reports', { reportId: 'leads-captured' })}
            drillDownLabel="Lead Sources →"
            fallbackTable={{
              caption: 'Quarterly Lead Source Channels',
              headers: ['Acquisition Channel', 'Leads Count', 'Percentage'],
              rows: data.leadSourcesQuarter.map((s) => [s.label, s.count, `${s.percentage}%`]),
            }}
          />
        </div>

        <div>
          <ChartWrapper
            id="chart-top-clients"
            type="bar"
            data={topClientsChartData}
            title="Top Clients by Revenue"
            subtitle="Highest billing accounts across company history."
            height={240}
            onDrillDown={() => onNavigateTab('reports', { reportId: 'client-invoices' })}
            drillDownLabel="Client Invoices →"
            fallbackTable={{
              caption: 'Top 10 Client Account Billings',
              headers: ['Client Name', `Invoiced (${currency})`, `Paid (${currency})`],
              rows: data.top10ClientsRevenue.map((c) => [
                c.organisationName,
                (c.totalInvoicedMinor / 100).toFixed(2),
                (c.totalPaidMinor / 100).toFixed(2),
              ]),
            }}
          />
        </div>

        <div>
          <ChartWrapper
            id="chart-aging-buckets"
            type="bar"
            data={agingChartData}
            title="Invoice Ageing Buckets"
            subtitle="Outstanding receivables distribution by days overdue."
            height={240}
            onDrillDown={() => onNavigateTab('reports', { reportId: 'client-payments-balances' })}
            drillDownLabel="View Aging Matrix →"
            fallbackTable={{
              caption: 'Invoice Aging Distribution Buckets',
              headers: ['Aging Bucket', 'Invoices', `Amount (${currency})`],
              rows: data.agingBuckets.map((b) => [b.label, b.count, (b.amountMinor / 100).toFixed(2)]),
            }}
          />
        </div>
      </div>

      {/* WATCH LISTS ROW (4 Actionable lists) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-watch-lists">
        {/* List 1: Overdue Invoices */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5" id="widget-overdue-invoices">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">Overdue Invoices</h3>
              <span className="text-xs bg-rose-100 text-rose-800 font-mono font-bold px-2 py-0.5 rounded-full">
                {data.overdueInvoices.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              All Invoices →
            </button>
          </div>

          <div className="overflow-x-auto">
            {data.overdueInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                No overdue invoices. All accounts are settled or within payment terms.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium">
                    <th className="py-2 px-1">Invoice</th>
                    <th className="py-2 px-2">Client</th>
                    <th className="py-2 px-2">Due Date</th>
                    <th className="py-2 px-2 text-right">Balance Due</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.overdueInvoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2.5 px-1 font-mono font-bold text-stone-900">
                        {inv.number}
                        <span className="block text-[10px] text-rose-600 font-sans font-semibold">
                          {inv.daysOverdue}d overdue
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-stone-700 font-medium truncate max-w-[130px]">
                        {inv.organisationName}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-stone-500">{inv.dueDate}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-700">
                        {new Money(inv.balanceDueMinor, inv.currencyCode as any).format()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onSelectInvoice && (
                            <button
                              onClick={() => {
                                onSelectInvoice(inv.id);
                                onNavigateTab('invoices');
                              }}
                              className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-semibold"
                            >
                              View
                            </button>
                          )}
                          {onOpenRecordPayment && (
                            <button
                              onClick={() => onOpenRecordPayment(inv.id)}
                              className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* List 2: Quotations Expiring in 7 Days */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5" id="widget-expiring-quotes">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">Quotations Expiring Soon</h3>
              <span className="text-xs bg-amber-100 text-amber-800 font-mono font-bold px-2 py-0.5 rounded-full">
                {data.expiringQuotations.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('quotations')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              All Quotes →
            </button>
          </div>

          <div className="overflow-x-auto">
            {data.expiringQuotations.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                No quotations expiring within the next 7 days.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium">
                    <th className="py-2 px-1">Quote #</th>
                    <th className="py-2 px-2">Client</th>
                    <th className="py-2 px-2">Valid Until</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.expiringQuotations.slice(0, 5).map((q) => (
                    <tr key={q.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-2.5 px-1 font-mono font-bold text-stone-900">
                        {q.number}
                        <span className="block text-[10px] text-amber-700 font-sans font-semibold">
                          {q.daysRemaining <= 0 ? 'Expired' : `${q.daysRemaining}d remaining`}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-stone-700 font-medium truncate max-w-[130px]">
                        {q.organisationName}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-stone-500">{q.validUntil}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-stone-900">
                        {new Money(q.totalMinor, q.currencyCode as any).format()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {onSelectQuotation && (
                          <button
                            onClick={() => {
                              onSelectQuotation(q.id);
                              onNavigateTab('quotations');
                            }}
                            className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-semibold"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* List 3: Tasks & Lead Activities Due Today / Overdue */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5" id="widget-due-tasks">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">Follow-up Tasks Due</h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded-full">
                {data.dueTasks.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('proposals')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              Task Hub →
            </button>
          </div>

          <div className="overflow-x-auto">
            {data.dueTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                All scheduled lead touchpoints and follow-up activities are up to date.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium">
                    <th className="py-2 px-1">Lead Prospect</th>
                    <th className="py-2 px-2">Activity</th>
                    <th className="py-2 px-2">Scheduled</th>
                    <th className="py-2 px-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.dueTasks.slice(0, 5).map((t) => (
                    <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-1 font-medium text-stone-900 truncate max-w-[140px]">
                        {t.leadTitle}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-[10px] uppercase font-bold bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded">
                          {t.activityType}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-mono">
                        <span className={t.isOverdue ? 'text-rose-600 font-bold' : 'text-stone-600'}>
                          {t.scheduledAt} {t.isOverdue && '(Overdue)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-stone-500 truncate max-w-[180px]">
                        {t.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* List 4: Marketing Activities Overdue */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5" id="widget-overdue-marketing">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">Marketing Activities Overdue</h3>
              <span className="text-xs bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded-full">
                {data.overdueMarketingActivities.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('marketing')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              All Plans →
            </button>
          </div>

          <div className="overflow-x-auto">
            {data.overdueMarketingActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                No overdue marketing activities across active campaign plans.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium">
                    <th className="py-2 px-1">Activity</th>
                    <th className="py-2 px-2">Campaign Plan</th>
                    <th className="py-2 px-2">Planned End</th>
                    <th className="py-2 px-2 text-right">Spend / Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.overdueMarketingActivities.slice(0, 5).map((act) => (
                    <tr key={act.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-2.5 px-1 font-medium text-stone-900">
                        {act.name}
                        <span className="block text-[10px] text-purple-700 font-semibold uppercase">
                          {act.channel} • {act.daysOverdue}d overdue
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-stone-700 truncate max-w-[130px] font-medium">
                        {act.planName}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-rose-600 font-semibold">{act.plannedEnd}</td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        <span className="font-bold text-stone-900">
                          {new Money(act.actualCostMinor, currency).format()}
                        </span>
                        <span className="text-[10px] text-stone-400 block">
                          of {new Money(act.budgetMinor, currency).format()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* List 5: Upcoming Client Meetings & Activity Reminders */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 lg:col-span-2" id="widget-calendar-meetings">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                Upcoming Client Meetings &amp; Scheduled Activities
              </h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full">
                {upcomingClientEvents.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
            >
              Full Calendar &amp; Reminders →
            </button>
          </div>

          <div className="overflow-x-auto">
            {upcomingClientEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                No client meetings or scheduled activities in the pipeline.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium">
                    <th className="py-2 px-1">Meeting / Activity</th>
                    <th className="py-2 px-2">Client Organisation</th>
                    <th className="py-2 px-2">Date &amp; Time</th>
                    <th className="py-2 px-2">Location / Link</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {upcomingClientEvents.map((evt) => {
                    const client = evt.organisation_id ? orgMap.get(evt.organisation_id) : 'Internal / General';
                    return (
                      <tr key={evt.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="py-2.5 px-1 font-medium text-stone-900">
                          {evt.title}
                          <span className="block text-[10px] text-emerald-700 font-semibold uppercase">
                            {evt.event_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-stone-700 font-medium truncate max-w-[140px]">
                          {client}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-stone-600">
                          {evt.start_time.substring(0, 10)}{' '}
                          <span className="font-semibold text-stone-900">
                            {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-stone-500 truncate max-w-[150px]">
                          {evt.meeting_url ? (
                            <span className="text-emerald-700 font-semibold underline">Virtual Meeting</span>
                          ) : (
                            evt.location || '—'
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => onNavigateTab('calendar')}
                            className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
