import {
  Company,
  MarketingTrackerRow,
  MarketingTrackerTotals,
  ReportColumn,
  ReportContract,
  ReportParameter,
  ReportRequest,
} from '../../types';
import { StorageService } from '../storageService';
import { ReportingDateUtils } from '../reportingDateUtils';
import { Money } from '../../support/money';

export const marketingTrackerReport: ReportContract<
  { plan?: string; channel?: string },
  MarketingTrackerRow,
  MarketingTrackerTotals
> = {
  id: 'marketing-tracker',
  name: 'Sales & Marketing Plan Campaign Tracker',
  description: 'Marketing plan execution vs actuals, campaign ROI metrics, cost per lead generated, and closed revenue attribution.',

  parameters: (company: Company): ReportParameter[] => {
    const db = StorageService.getDb();
    const plans = (db.marketingPlans || []).filter((p) => p.company_id === company.id && !p.deleted_at);

    return [
      {
        id: 'plan',
        label: 'Marketing Plan',
        type: 'select',
        options: [
          { label: 'All Marketing Plans', value: 'all' },
          ...plans.map((p) => ({ label: p.name, value: p.id })),
        ],
        defaultValue: 'all',
      },
      {
        id: 'channel',
        label: 'Channel',
        type: 'select',
        options: [
          { label: 'All Channels', value: 'all' },
          { label: 'Field Visit', value: 'field_visit' },
          { label: 'Cold Call', value: 'cold_call' },
          { label: 'Email Campaign', value: 'email_campaign' },
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Social Media', value: 'social' },
          { label: 'Exhibition / Trade Fair', value: 'exhibition' },
          { label: 'Referral Drive', value: 'referral_drive' },
          { label: 'Radio / Broadcast', value: 'radio' },
          { label: 'Print / Outdoor', value: 'print' },
          { label: 'Other', value: 'other' },
        ],
        defaultValue: 'all',
      },
    ];
  },

  columns: (_filters, company: Company): ReportColumn<MarketingTrackerRow>[] => [
    { key: 'planName', label: 'Marketing Plan', sortable: true },
    { key: 'activityName', label: 'Activity / Campaign', sortable: true },
    { key: 'channel', label: 'Channel', sortable: true, width: '130px' },
    { key: 'dates', label: 'Period / Dates', sortable: true, width: '150px' },
    {
      key: 'budgetMinor',
      label: `Budget (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'actualCostMinor',
      label: `Actual Cost (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'varianceMinor',
      label: `Variance (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => {
        const val = v || 0;
        if (val >= 0) {
          return `+${new Money(val, company.currency_code).format()}`;
        }
        return `-${new Money(Math.abs(val), company.currency_code).format()}`;
      },
      csvFormat: (v) => ((v || 0) / 100).toFixed(2),
    },
    { key: 'leadsGenerated', label: 'Leads', align: 'center', sortable: true, width: '80px' },
    { key: 'quotationsIssued', label: 'Quotes', align: 'center', sortable: true, width: '80px' },
    {
      key: 'revenueAttributedMinor',
      label: `Revenue (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '130px',
      format: (v) => new Money(v, company.currency_code).format(),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'costPerLeadMinor',
      label: `Cost/Lead (${company.currency_code})`,
      align: 'right',
      sortable: true,
      width: '120px',
      format: (v) => (v > 0 ? new Money(v, company.currency_code).format() : '—'),
      csvFormat: (v) => (v / 100).toFixed(2),
    },
    {
      key: 'roiPercent',
      label: 'ROI %',
      align: 'right',
      sortable: true,
      width: '90px',
      format: (v) => `${v > 0 ? '+' : ''}${v}%`,
      csvFormat: (v) => `${v}%`,
    },
  ],

  rows: (companyId: string, request: ReportRequest<{ plan?: string; channel?: string }>): MarketingTrackerRow[] => {
    const db = StorageService.getDb();
    const plans = (db.marketingPlans || []).filter((p) => p.company_id === companyId && !p.deleted_at);
    const activities = (db.marketingActivities || []).filter((a) => a.company_id === companyId);
    const results = (db.activityResults || []).filter((r) => r.company_id === companyId);

    const { startDate, endDate } = request.dateRange;
    const { plan, channel } = request.filters;

    const filtered = activities.filter((act) => {
      const actStart = act.planned_start || act.actual_start || act.created_at.substring(0, 10);
      const actEnd = act.planned_end || act.actual_end || actStart;

      // Check date range overlap
      const inRange =
        ReportingDateUtils.isInRangeInclusive(actStart, startDate, endDate) ||
        ReportingDateUtils.isInRangeInclusive(actEnd, startDate, endDate);

      if (!inRange) return false;
      if (plan && plan !== 'all' && act.plan_id !== plan) return false;
      if (channel && channel !== 'all' && act.channel !== channel) return false;
      return true;
    });

    return filtered.map((act) => {
      const parentPlan = plans.find((p) => p.id === act.plan_id);
      const actResults = results.filter((r) => r.marketing_activity_id === act.id);

      const leadsGen = actResults.reduce((acc, r) => acc + (r.leads_generated || 0), 0);
      const quotesIssued = actResults.reduce((acc, r) => acc + (r.quotations_issued || 0), 0);
      const revAttributed = actResults.reduce((acc, r) => acc + (r.revenue_attributed_minor || 0), 0);

      const budget = act.budget_minor || 0;
      const actualCost = act.actual_cost_minor || 0;
      const variance = budget - actualCost; // Positive = Under budget (favorable)

      const costPerLead = leadsGen > 0 ? Math.round(actualCost / leadsGen) : 0;
      const roi = actualCost > 0 ? Math.round(((revAttributed - actualCost) / actualCost) * 100) : revAttributed > 0 ? 100 : 0;

      const dateStr = act.planned_start ? `${act.planned_start} → ${act.planned_end || act.planned_start}` : 'Ongoing';

      return {
        id: act.id,
        planId: act.plan_id,
        planName: parentPlan?.name || 'Unassigned Plan',
        activityId: act.id,
        activityName: act.name,
        channel: act.channel.replace(/_/g, ' '),
        dates: dateStr,
        plannedDates: dateStr,
        budgetMinor: budget,
        actualCostMinor: actualCost,
        varianceMinor: variance,
        costVarianceMinor: variance,
        leadsGenerated: leadsGen,
        quotationsIssued: quotesIssued,
        revenueAttributedMinor: revAttributed,
        costPerLeadMinor: costPerLead,
        roiPercent: roi,
        status: act.status,
      };
    });
  },

  totals: (rows: MarketingTrackerRow[]): MarketingTrackerTotals => {
    let totalBudget = 0;
    let totalActualCost = 0;
    let totalLeads = 0;
    let totalQuotes = 0;
    let totalRevenue = 0;

    for (const r of rows) {
      totalBudget += r.budgetMinor;
      totalActualCost += r.actualCostMinor;
      totalLeads += r.leadsGenerated;
      totalQuotes += r.quotationsIssued;
      totalRevenue += r.revenueAttributedMinor;
    }

    const variance = totalBudget - totalActualCost;
    const overallCostPerLead = totalLeads > 0 ? Math.round(totalActualCost / totalLeads) : 0;
    const overallRoi =
      totalActualCost > 0 ? Math.round(((totalRevenue - totalActualCost) / totalActualCost) * 100) : totalRevenue > 0 ? 100 : 0;

    return {
      activityCount: rows.length,
      totalBudgetMinor: totalBudget,
      totalActualCostMinor: totalActualCost,
      totalVarianceMinor: variance,
      totalLeadsGenerated: totalLeads,
      totalQuotationsIssued: totalQuotes,
      totalRevenueAttributedMinor: totalRevenue,
      overallCostPerLeadMinor: overallCostPerLead,
      overallRoiPercent: overallRoi,
    };
  },

  exportCsv: (company: Company, rows: MarketingTrackerRow[], totals: MarketingTrackerTotals): string => {
    const headers = [
      'Marketing Plan',
      'Activity / Campaign',
      'Channel',
      'Dates',
      `Budget (${company.currency_code})`,
      `Actual Cost (${company.currency_code})`,
      `Variance (${company.currency_code})`,
      'Leads Generated',
      'Quotes Issued',
      `Attributed Revenue (${company.currency_code})`,
      `Cost/Lead (${company.currency_code})`,
      'ROI %',
    ];

    const csvRows = rows.map((r) => [
      `"${r.planName.replace(/"/g, '""')}"`,
      `"${r.activityName.replace(/"/g, '""')}"`,
      `"${r.channel}"`,
      `"${r.dates}"`,
      (r.budgetMinor / 100).toFixed(2),
      (r.actualCostMinor / 100).toFixed(2),
      ((r.varianceMinor || 0) / 100).toFixed(2),
      r.leadsGenerated,
      r.quotationsIssued,
      (r.revenueAttributedMinor / 100).toFixed(2),
      (r.costPerLeadMinor / 100).toFixed(2),
      `${r.roiPercent}%`,
    ]);

    csvRows.push([
      `"TOTALS (${totals.activityCount} Activities)"`,
      '""',
      '""',
      '""',
      (totals.totalBudgetMinor / 100).toFixed(2),
      (totals.totalActualCostMinor / 100).toFixed(2),
      (totals.totalVarianceMinor / 100).toFixed(2),
      totals.totalLeadsGenerated,
      totals.totalQuotationsIssued,
      (totals.totalRevenueAttributedMinor / 100).toFixed(2),
      (totals.overallCostPerLeadMinor / 100).toFixed(2),
      `${totals.overallRoiPercent}%`,
    ]);

    return [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  },

  exportPdfHtml: (company: Company, rows: MarketingTrackerRow[], totals: MarketingTrackerTotals, _filters, request): string => {
    const formattedBudget = new Money(totals.totalBudgetMinor, company.currency_code).format();
    const formattedActual = new Money(totals.totalActualCostMinor, company.currency_code).format();
    const formattedRev = new Money(totals.totalRevenueAttributedMinor, company.currency_code).format();

    const tableRows = rows
      .map(
        (r, idx) => `
      <tr class="border-b border-stone-200 text-xs">
        <td class="py-2 px-2 text-stone-500 text-center">${idx + 1}</td>
        <td class="py-2 px-2 font-medium text-stone-900">${escapeHtml(r.planName)}</td>
        <td class="py-2 px-2">${escapeHtml(r.activityName)}</td>
        <td class="py-2 px-2 capitalize text-stone-600">${escapeHtml(r.channel)}</td>
        <td class="py-2 px-2 text-right font-mono">${new Money(r.budgetMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono">${new Money(r.actualCostMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-center font-mono font-bold">${r.leadsGenerated}</td>
        <td class="py-2 px-2 text-right font-mono font-bold text-emerald-800">${new Money(r.revenueAttributedMinor, company.currency_code).format()}</td>
        <td class="py-2 px-2 text-right font-mono">${r.costPerLeadMinor > 0 ? new Money(r.costPerLeadMinor, company.currency_code).format() : '—'}</td>
        <td class="py-2 px-2 text-right font-mono font-bold ${r.roiPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${r.roiPercent}%</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="p-8 font-sans bg-white text-stone-900 max-w-6xl mx-auto">
        <div class="flex justify-between items-start border-b-2 border-stone-800 pb-4 mb-6">
          <div>
            <h1 class="text-xl font-black tracking-tight">${escapeHtml(company.legal_name || company.name)}</h1>
            <h2 class="text-sm font-bold text-stone-600 uppercase tracking-wider mt-1">Marketing Plan & Campaign ROI Tracker</h2>
            <p class="text-xs text-stone-500 mt-0.5">Period: ${request.dateRange.startDate} to ${request.dateRange.endDate} (Inclusive)</p>
          </div>
          <div class="text-right text-xs text-stone-500">
            <div>TPIN: ${company.tpin || '—'}</div>
            <div>Generated: ${new Date().toISOString().substring(0, 10)}</div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Actual Spend</div>
            <div class="text-xl font-bold font-mono text-stone-900 mt-1">${formattedActual} <span class="text-xs font-normal text-stone-500">(Budget: ${formattedBudget})</span></div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Total Attributed Revenue</div>
            <div class="text-xl font-bold font-mono text-emerald-800 mt-1">${formattedRev}</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Campaign ROI</div>
            <div class="text-2xl font-bold font-mono text-emerald-700 mt-1">+${totals.overallRoiPercent}%</div>
          </div>
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div class="text-xs text-stone-500 uppercase font-bold">Avg Cost Per Lead</div>
            <div class="text-xl font-bold font-mono text-stone-900 mt-1">${new Money(totals.overallCostPerLeadMinor, company.currency_code).format()}</div>
          </div>
        </div>

        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b-2 border-stone-800 text-[11px] uppercase tracking-wider text-stone-700 bg-stone-100">
              <th class="py-2 px-2 text-center w-8">#</th>
              <th class="py-2 px-2">Plan</th>
              <th class="py-2 px-2">Campaign Activity</th>
              <th class="py-2 px-2">Channel</th>
              <th class="py-2 px-2 text-right">Budget</th>
              <th class="py-2 px-2 text-right">Actual Cost</th>
              <th class="py-2 px-2 text-center">Leads</th>
              <th class="py-2 px-2 text-right">Attributed Rev</th>
              <th class="py-2 px-2 text-right">Cost/Lead</th>
              <th class="py-2 px-2 text-right">ROI %</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="10" class="text-center py-6 text-xs text-stone-400">No marketing activity recorded in period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-stone-800 font-bold bg-stone-100 text-xs">
              <td colspan="4" class="py-2 px-2 text-stone-800 uppercase">Grand Totals (${totals.activityCount} Activities)</td>
              <td class="py-2 px-2 text-right font-mono">${formattedBudget}</td>
              <td class="py-2 px-2 text-right font-mono">${formattedActual}</td>
              <td class="py-2 px-2 text-center font-mono">${totals.totalLeadsGenerated}</td>
              <td class="py-2 px-2 text-right font-mono text-emerald-800">${formattedRev}</td>
              <td class="py-2 px-2 text-right font-mono">${new Money(totals.overallCostPerLeadMinor, company.currency_code).format()}</td>
              <td class="py-2 px-2 text-right font-mono font-black text-emerald-800">+${totals.overallRoiPercent}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },
};

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
